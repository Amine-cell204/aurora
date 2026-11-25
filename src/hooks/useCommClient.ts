import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveCallState,
  CallMode,
  ChatMessage,
  CommContact,
  IncomingCallInfo,
  PlayerProfile,
} from '../types/os';
import { soundFx } from '../utils/sound';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function makeDmChannelId(userA: string, userB: string): string {
  return userA < userB ? `dm:${userA}:${userB}` : `dm:${userB}:${userA}`;
}

interface UseCommClientOptions {
  token: string | null;
  player: PlayerProfile | null;
  isCommOpen: boolean;
  pausedByHide: boolean;
}

export function useCommClient({
  token,
  player,
  isCommOpen,
  pausedByHide,
}: UseCommClientOptions) {
  const [wsConnected, setWsConnected] = useState(false);
  const [contacts, setContacts] = useState<CommContact[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('lounge');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [typingByChannel, setTypingByChannel] = useState<Record<string, string[]>>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [callFeedback, setCallFeedback] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef(token);
  const playerRef = useRef(player);
  const activeChannelRef = useRef(activeChannelId);
  const isCommOpenRef = useRef(isCommOpen);
  const pausedByHideRef = useRef(pausedByHide);
  const activeCallRef = useRef<ActiveCallState | null>(activeCall);
  const incomingCallRef = useRef<IncomingCallInfo | null>(incomingCall);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const typingTimersRef = useRef<Record<string, number>>({});
  const ringIntervalRef = useRef<number | null>(null);

  tokenRef.current = token;
  playerRef.current = player;
  activeChannelRef.current = activeChannelId;
  isCommOpenRef.current = isCommOpen;
  pausedByHideRef.current = pausedByHide;
  activeCallRef.current = activeCall;
  incomingCallRef.current = incomingCall;

  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current !== null) {
      window.clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    const chime = () => {
      if (pausedByHideRef.current) return;
      soundFx.playTone(659.25, 0.14, 'sine', 0.06);
      window.setTimeout(() => {
        if (!pausedByHideRef.current) {
          soundFx.playTone(783.99, 0.18, 'sine', 0.06);
        }
      }, 150);
    };
    chime();
    ringIntervalRef.current = window.setInterval(chime, 2600);
  }, [stopRingtone]);

  const cleanupCallMedia = useCallback(() => {
    stopRingtone();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }
    pendingIceRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
  }, [stopRingtone]);

  const sendWs = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const fetchDirectory = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch('/api/comm/directory', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { contacts?: CommContact[] };
        if (Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        }
      }
    } catch {
      // ignore transient error
    }
  }, []);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch(
        `/api/comm/messages?channelId=${encodeURIComponent(channelId)}`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      if (res.ok) {
        const data = (await res.json()) as { channelId: string; messages: ChatMessage[] };
        setMessagesByChannel((prev) => ({
          ...prev,
          [data.channelId]: data.messages ?? [],
        }));
      }
    } catch {
      // ignore transient error
    }
  }, []);

  const selectChannel = useCallback(
    (channelId: string) => {
      setActiveChannelId(channelId);
      setUnreadByChannel((prev) => {
        if (!prev[channelId]) return prev;
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      void loadChannelMessages(channelId);
    },
    [loadChannelMessages]
  );

  // Clear unread count for current channel when window is opened
  useEffect(() => {
    if (isCommOpen && activeChannelId) {
      setUnreadByChannel((prev) => {
        if (!prev[activeChannelId]) return prev;
        const next = { ...prev };
        delete next[activeChannelId];
        return next;
      });
    }
  }, [isCommOpen, activeChannelId]);

  const acquireUserMedia = useCallback(async (mode: CallMode): Promise<{
    stream: MediaStream | null;
    note?: string;
  }> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        stream: null,
        note: 'Browser media devices unavailable; listening only.',
      };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      return { stream };
    } catch {
      if (mode === 'video') {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return {
            stream: audioOnly,
            note: 'Camera unavailable; joined with microphone only.',
          };
        } catch {
          return {
            stream: null,
            note: 'Microphone/camera access denied; connected in listen-only mode.',
          };
        }
      }
      return {
        stream: null,
        note: 'Microphone access denied; connected in listen-only mode.',
      };
    }
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, callId: string, stream: MediaStream | null) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const inboundStream = new MediaStream();
      setRemoteStream(inboundStream);

      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      } else {
        // Ensure SDP can still negotiate audio/video reception in listen-only mode
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      pc.ontrack = (event) => {
        for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
          if (!inboundStream.getTracks().some((t) => t.id === track.id)) {
            inboundStream.addTrack(track);
          }
        }
        setRemoteStream(new MediaStream(inboundStream.getTracks()));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWs({
            type: 'rtc:ice',
            toUserId: peerId,
            callId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          stopRingtone();
          setActiveCall((prev) =>
            prev && prev.callId === callId
              ? {
                  ...prev,
                  status: 'connected',
                  startedAt: prev.startedAt ?? Date.now(),
                }
              : prev
          );
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          // Leave explicit hangup to endCall/peer signal
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [sendWs, stopRingtone]
  );

  // WebSocket Lifecycle
  useEffect(() => {
    if (!token || !player) {
      cleanupCallMedia();
      setActiveCall(null);
      setIncomingCall(null);
      setContacts([]);
      setMessagesByChannel({});
      setUnreadByChannel({});
      setWsConnected(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/comm`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
      };

      ws.onmessage = async (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = typeof msg.type === 'string' ? msg.type : '';

        if (type === 'auth:ok') {
          setWsConnected(true);
          void fetchDirectory();
          void loadChannelMessages(activeChannelRef.current);
          return;
        }

        if (type === 'presence:update') {
          const userId = typeof msg.userId === 'string' ? msg.userId : '';
          const online = Boolean(msg.online);
          const joinedPlayer = msg.player as CommContact | undefined;
          setContacts((prev) => {
            const exists = prev.some((c) => c.id === userId);
            if (!exists && joinedPlayer) {
              return [...prev, { ...joinedPlayer, online }];
            }
            return prev.map((c) => (c.id === userId ? { ...c, online } : c));
          });
          return;
        }

        if (type === 'chat:message') {
          const chat = msg.message as ChatMessage | undefined;
          if (!chat?.id || !chat.channelId) return;

          setMessagesByChannel((prev) => {
            const existing = prev[chat.channelId] ?? [];
            if (
              existing.some(
                (m) => m.id === chat.id || (chat.clientMsgId && m.clientMsgId === chat.clientMsgId)
              )
            ) {
              return prev;
            }
            return {
              ...prev,
              [chat.channelId]: [...existing, chat].slice(-200),
            };
          });

          // Update sidebar last message preview for DM or Lounge
          setContacts((prev) =>
            prev.map((c) => {
              const me = playerRef.current;
              if (!me) return c;
              const contactChannel =
                c.id === me.id ? 'lounge' : makeDmChannelId(me.id, c.id);
              if (contactChannel === chat.channelId) {
                return {
                  ...c,
                  lastMessage: chat.body,
                  lastMessageAt: chat.createdAt,
                };
              }
              return c;
            })
          );

          const isFromMe = chat.senderId === playerRef.current?.id;
          const viewingChannel = isCommOpenRef.current && activeChannelRef.current === chat.channelId;
          if (!isFromMe && !viewingChannel) {
            setUnreadByChannel((prev) => ({
              ...prev,
              [chat.channelId]: (prev[chat.channelId] ?? 0) + 1,
            }));
            if (!pausedByHideRef.current) {
              soundFx.playTone(740, 0.08, 'sine', 0.045, 920);
            }
          }
          return;
        }

        if (type === 'chat:typing') {
          const channelId = typeof msg.channelId === 'string' ? msg.channelId : '';
          const name = typeof msg.fromDisplayName === 'string' ? msg.fromDisplayName : '';
          const isTyping = Boolean(msg.isTyping);
          if (!channelId || !name) return;

          const key = `${channelId}:${name}`;
          if (typingTimersRef.current[key]) {
            window.clearTimeout(typingTimersRef.current[key]);
          }

          setTypingByChannel((prev) => {
            const cur = prev[channelId] ?? [];
            if (!isTyping) {
              return { ...prev, [channelId]: cur.filter((n) => n !== name) };
            }
            if (cur.includes(name)) return prev;
            return { ...prev, [channelId]: [...cur, name] };
          });

          if (isTyping) {
            typingTimersRef.current[key] = window.setTimeout(() => {
              setTypingByChannel((prev) => ({
                ...prev,
                [channelId]: (prev[channelId] ?? []).filter((n) => n !== name),
              }));
            }, 3200);
          }
          return;
        }

        if (type === 'call:incoming') {
          const fromUser = msg.fromUser as PlayerProfile | undefined;
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const mode: CallMode = msg.mode === 'video' ? 'video' : 'audio';
          if (!fromUser || !callId) return;

          // Auto-decline if already in an active call
          if (activeCallRef.current) {
            sendWs({ type: 'call:decline', toUserId: fromUser.id, callId });
            return;
          }
          setCallFeedback(null);
          setIncomingCall({ callId, fromUser, mode });
          startRingtone();
          return;
        }

        if (type === 'call:unavailable' || type === 'call:declined') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const reason =
            typeof msg.reason === 'string'
              ? msg.reason
              : `${String(msg.fromDisplayName ?? 'Player')} declined the call.`;
          if (activeCallRef.current?.callId === callId) {
            cleanupCallMedia();
            setActiveCall(null);
            setCallFeedback(reason);
            soundFx.hit();
          }
          return;
        }

        if (type === 'call:accepted') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const active = activeCallRef.current;
          if (!active || active.callId !== callId) return;

          stopRingtone();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connecting' } : null));
          const pc = pcRef.current;
          if (pc) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendWs({
                type: 'rtc:offer',
                toUserId: active.peer.id,
                callId,
                sdp: offer,
              });
            } catch {
              setCallFeedback('Failed to establish WebRTC connection.');
            }
          }
          return;
        }

        if (type === 'call:ended') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          if (incomingCallRef.current?.callId === callId) {
            stopRingtone();
            setIncomingCall(null);
          }
          if (activeCallRef.current?.callId === callId) {
            cleanupCallMedia();
            setActiveCall(null);
            setCallFeedback('Call ended.');
          }
          return;
        }

        if (type === 'rtc:offer') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const fromUserId = typeof msg.fromUserId === 'string' ? msg.fromUserId : '';
          const sdp = msg.sdp as RTCSessionDescriptionInit | undefined;
          const pc = pcRef.current;
          if (!pc || !sdp || activeCallRef.current?.callId !== callId) return;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            for (const cand of pendingIceRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingIceRef.current = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWs({
              type: 'rtc:answer',
              toUserId: fromUserId,
              callId,
              sdp: answer,
            });
            setActiveCall((prev) =>
              prev && prev.callId === callId
                ? { ...prev, status: 'connected', startedAt: prev.startedAt ?? Date.now() }
                : prev
            );
          } catch {
            setCallFeedback('Unable to negotiate media offer.');
          }
          return;
        }

        if (type === 'rtc:answer') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const sdp = msg.sdp as RTCSessionDescriptionInit | undefined;
          const pc = pcRef.current;
          if (!pc || !sdp || activeCallRef.current?.callId !== callId) return;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            for (const cand of pendingIceRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingIceRef.current = [];
            setActiveCall((prev) =>
              prev && prev.callId === callId
                ? { ...prev, status: 'connected', startedAt: prev.startedAt ?? Date.now() }
                : prev
            );
          } catch {
            setCallFeedback('Unable to negotiate media answer.');
          }
          return;
        }

        if (type === 'rtc:ice') {
          const callId = typeof msg.callId === 'string' ? msg.callId : '';
          const candidate = msg.candidate as RTCIceCandidateInit | undefined;
          const pc = pcRef.current;
          if (!pc || !candidate || activeCallRef.current?.callId !== callId) return;
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          } else {
            pendingIceRef.current.push(candidate);
          }
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!cancelled && tokenRef.current) {
          const delay = Math.min(8000, 900 * Math.pow(1.6, attempt));
          attempt += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      for (const timerId of Object.values(typingTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      typingTimersRef.current = {};
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      cleanupCallMedia();
    };
  }, [
    token,
    player,
    fetchDirectory,
    loadChannelMessages,
    cleanupCallMedia,
    sendWs,
    startRingtone,
    stopRingtone,
  ]);

  const sendMessage = useCallback(
    (channelId: string, rawBody: string) => {
      const body = rawBody.trim();
      if (!body || !playerRef.current) return false;
      const clientMsgId = crypto.randomUUID();
      sendWs({
        type: 'chat:send',
        channelId,
        body,
        clientMsgId,
      });
      return true;
    },
    [sendWs]
  );

  const sendTyping = useCallback(
    (channelId: string, isTyping: boolean) => {
      sendWs({ type: 'chat:typing', channelId, isTyping });
    },
    [sendWs]
  );

  const startCall = useCallback(
    async (peer: PlayerProfile, mode: CallMode) => {
      if (!playerRef.current || peer.id === playerRef.current.id) return;
      if (activeCallRef.current) return;

      setCallFeedback(null);
      const callId = crypto.randomUUID();
      const { stream, note } = await acquireUserMedia(mode);
      localStreamRef.current = stream;
      setLocalStream(stream);

      createPeerConnection(peer.id, callId, stream);
      setActiveCall({
        callId,
        peer,
        mode,
        status: 'calling',
        startedAt: null,
        micMuted: false,
        camOff: mode === 'audio',
        mediaNote: note,
      });

      sendWs({
        type: 'call:invite',
        toUserId: peer.id,
        callId,
        mode,
      });
      soundFx.click();
    },
    [acquireUserMedia, createPeerConnection, sendWs]
  );

  const acceptIncomingCall = useCallback(
    async (overrideMode?: CallMode) => {
      const inc = incomingCallRef.current;
      if (!inc) return;

      stopRingtone();
      setIncomingCall(null);
      setCallFeedback(null);

      const mode = overrideMode ?? inc.mode;
      const { stream, note } = await acquireUserMedia(mode);
      localStreamRef.current = stream;
      setLocalStream(stream);

      createPeerConnection(inc.fromUser.id, inc.callId, stream);
      setActiveCall({
        callId: inc.callId,
        peer: inc.fromUser,
        mode,
        status: 'connecting',
        startedAt: null,
        micMuted: false,
        camOff: mode === 'audio',
        mediaNote: note,
      });

      if (playerRef.current) {
        selectChannel(makeDmChannelId(playerRef.current.id, inc.fromUser.id));
      }

      sendWs({
        type: 'call:accept',
        toUserId: inc.fromUser.id,
        callId: inc.callId,
        mode,
      });
      soundFx.click();
    },
    [acquireUserMedia, createPeerConnection, selectChannel, sendWs, stopRingtone]
  );

  const declineIncomingCall = useCallback(() => {
    const inc = incomingCallRef.current;
    if (!inc) return;
    stopRingtone();
    setIncomingCall(null);
    sendWs({
      type: 'call:decline',
      toUserId: inc.fromUser.id,
      callId: inc.callId,
    });
    soundFx.click();
  }, [sendWs, stopRingtone]);

  const endCall = useCallback(() => {
    const cur = activeCallRef.current;
    if (cur) {
      sendWs({
        type: 'call:end',
        toUserId: cur.peer.id,
        callId: cur.callId,
      });
    }
    cleanupCallMedia();
    setActiveCall(null);
    soundFx.click();
  }, [cleanupCallMedia, sendWs]);

  const toggleMic = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev) return null;
      const nextMuted = !prev.micMuted;
      for (const t of localStreamRef.current?.getAudioTracks() ?? []) {
        t.enabled = !nextMuted;
      }
      return { ...prev, micMuted: nextMuted };
    });
    soundFx.click();
  }, []);

  const toggleCamera = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev) return null;
      const nextCamOff = !prev.camOff;
      for (const t of localStreamRef.current?.getVideoTracks() ?? []) {
        t.enabled = !nextCamOff;
      }
      return { ...prev, camOff: nextCamOff };
    });
    soundFx.click();
  }, []);

  const totalUnread = useMemo(
    () => Object.values(unreadByChannel).reduce((sum, n) => sum + n, 0),
    [unreadByChannel]
  );

  return {
    wsConnected,
    contacts,
    activeChannelId,
    messagesByChannel,
    unreadByChannel,
    totalUnread,
    typingByChannel,
    incomingCall,
    activeCall,
    callFeedback,
    dismissCallFeedback: () => setCallFeedback(null),
    localStream,
    remoteStream,
    selectChannel,
    refreshDirectory: fetchDirectory,
    sendMessage,
    sendTyping,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMic,
    toggleCamera,
  };
}
