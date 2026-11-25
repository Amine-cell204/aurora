import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Hash,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RefreshCw,
  Search,
  Send,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import {
  ActiveCallState,
  CallMode,
  ChatMessage,
  CommContact,
  PlayerProfile,
} from '../../types/os';
import { makeDmChannelId } from '../../hooks/useCommClient';
import { soundFx } from '../../utils/sound';

interface MessagesAppProps {
  currentPlayer: PlayerProfile;
  wsConnected: boolean;
  contacts: CommContact[];
  activeChannelId: string;
  messagesByChannel: Record<string, ChatMessage[]>;
  unreadByChannel: Record<string, number>;
  typingByChannel: Record<string, string[]>;
  activeCall: ActiveCallState | null;
  callFeedback: string | null;
  onDismissCallFeedback: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onSelectChannel: (channelId: string) => void;
  onRefreshDirectory: () => void;
  onSendMessage: (channelId: string, body: string) => boolean;
  onSendTyping: (channelId: string, isTyping: boolean) => void;
  onStartCall: (peer: PlayerProfile, mode: CallMode) => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

function formatMsgTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatCallDuration(startedAt: number | null, nowMs: number): string {
  if (!startedAt) return '00:00';
  const totalSec = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MessagesApp({
  currentPlayer,
  wsConnected,
  contacts,
  activeChannelId,
  messagesByChannel,
  unreadByChannel,
  typingByChannel,
  activeCall,
  callFeedback,
  onDismissCallFeedback,
  localStream,
  remoteStream,
  onSelectChannel,
  onRefreshDirectory,
  onSendMessage,
  onSendTyping,
  onStartCall,
  onEndCall,
  onToggleMic,
  onToggleCamera,
}: MessagesAppProps) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [callTickMs, setCallTickMs] = useState(() => Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const typingSentRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const otherContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => c.id !== currentPlayer.id)
      .filter((c) => {
        if (!q) return true;
        return (
          c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [contacts, currentPlayer.id, search]);

  const activePeer = useMemo(() => {
    if (activeChannelId === 'lounge') return null;
    return (
      contacts.find(
        (c) => c.id !== currentPlayer.id && makeDmChannelId(currentPlayer.id, c.id) === activeChannelId
      ) ?? null
    );
  }, [activeChannelId, contacts, currentPlayer.id]);

  const activeMessages = messagesByChannel[activeChannelId] ?? [];
  const activeTypers = typingByChannel[activeChannelId] ?? [];
  const onlineCount = contacts.filter((c) => c.online).length;

  // Scroll chat to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeChannelId]);

  // Live call duration counter
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    setCallTickMs(Date.now());
    const id = window.setInterval(() => setCallTickMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeCall]);

  // Bind WebRTC media streams
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!val.trim()) {
      if (typingSentRef.current) {
        typingSentRef.current = false;
        onSendTyping(activeChannelId, false);
      }
      return;
    }
    if (!typingSentRef.current) {
      typingSentRef.current = true;
      onSendTyping(activeChannelId, true);
    }
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      typingSentRef.current = false;
      onSendTyping(activeChannelId, false);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (onSendMessage(activeChannelId, draft)) {
      soundFx.click();
      setDraft('');
      if (typingSentRef.current) {
        typingSentRef.current = false;
        onSendTyping(activeChannelId, false);
      }
    }
  };

  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const hasLocalVideo = Boolean(
    localStream && localStream.getVideoTracks().length > 0 && activeCall && !activeCall.camOff
  );

  return (
    <div className="h-full flex bg-[#0d111a]/95 text-white overflow-hidden">
      {/* Hidden audio tag ensures WebRTC audio always plays even in audio-only mode */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Left Sidebar: Global Lounge + Players Directory */}
      <aside
        className={`${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-64 lg:w-72 border-r border-white/10 bg-black/25 flex-col shrink-0`}
      >
        <div className="p-3.5 border-b border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Messages & Calls</h2>
              <p className="text-[11px] text-white/50">
                {wsConnected ? `${onlineCount} online` : 'Reconnecting...'}
              </p>
            </div>
            <button
              onClick={() => {
                soundFx.click();
                onRefreshDirectory();
              }}
              className="p-1.5 rounded-lg bg-white/6 hover:bg-white/12 text-white/70 hover:text-white transition-colors"
              title="Refresh players"
              aria-label="Refresh players"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 focus-within:border-emerald-400">
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a player..."
              className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto os-scroll p-2 space-y-1">
          {/* Global Lounge Channel */}
          <button
            onClick={() => {
              soundFx.click();
              onSelectChannel('lounge');
              setMobileShowChat(true);
            }}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
              activeChannelId === 'lounge'
                ? 'bg-emerald-500/20 border border-emerald-400/40'
                : 'hover:bg-white/6 border border-transparent'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 border border-white/20">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-white truncate">Global Lounge</span>
                {(unreadByChannel.lounge ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                    {unreadByChannel.lounge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/50 truncate">All signed-in players</div>
            </div>
          </button>

          <div className="px-2 pt-3 pb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>Direct Messages</span>
            <span>{otherContacts.length}</span>
          </div>

          {otherContacts.length === 0 ? (
            <div className="px-3 py-5 text-center rounded-xl bg-white/[0.03] border border-white/8 text-[11px] text-white/50 space-y-1.5">
              <Users className="w-4 h-4 text-white/40 mx-auto" />
              <p>No other player accounts registered yet.</p>
              <p className="text-[10px] text-white/40">
                Open another browser tab or share the link so friends can create accounts and call or chat with you.
              </p>
            </div>
          ) : (
            otherContacts.map((contact) => {
              const dmId = makeDmChannelId(currentPlayer.id, contact.id);
              const isSelected = activeChannelId === dmId;
              const unread = unreadByChannel[dmId] ?? 0;

              return (
                <div
                  key={contact.id}
                  className={`group flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-sky-500/18 border-sky-400/40'
                      : 'hover:bg-white/6 border-transparent'
                  }`}
                >
                  <button
                    onClick={() => {
                      soundFx.click();
                      onSelectChannel(dmId);
                      setMobileShowChat(true);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <div className="relative shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/20"
                        style={{ backgroundColor: contact.avatarColor }}
                      >
                        {contact.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d111a] ${
                          contact.online ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {contact.displayName}
                        </span>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-[10px] font-bold text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 truncate">
                        {contact.lastMessage ? contact.lastMessage : `@${contact.username}`}
                      </div>
                    </div>
                  </button>

                  {contact.online && !activeCall && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={() => {
                          onSelectChannel(dmId);
                          onStartCall(contact, 'audio');
                          setMobileShowChat(true);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white transition-colors"
                        title={`Voice call ${contact.displayName}`}
                        aria-label={`Voice call ${contact.displayName}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          onSelectChannel(dmId);
                          onStartCall(contact, 'video');
                          setMobileShowChat(true);
                        }}
                        className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white transition-colors"
                        title={`Video call ${contact.displayName}`}
                        aria-label={`Video call ${contact.displayName}`}
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Main Pane: Call Stage + Conversation */}
      <section
        className={`${
          mobileShowChat ? 'flex' : 'hidden md:flex'
        } flex-1 min-w-0 flex-col bg-black/15`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-black/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileShowChat(false)}
              className="md:hidden p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white shrink-0"
              aria-label="Back to contacts"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {activePeer ? (
              <>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/20 shrink-0"
                  style={{ backgroundColor: activePeer.avatarColor }}
                >
                  {activePeer.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {activePeer.displayName}
                  </div>
                  <div className="text-[11px] text-white/55 truncate">
                    @{activePeer.username} · {activePeer.online ? 'Online now' : 'Offline'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 border border-white/20">
                  <Hash className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Global Lounge</div>
                  <div className="text-[11px] text-white/55 truncate">
                    Live chat room for all AltitudeMAX OS players
                  </div>
                </div>
              </>
            )}
          </div>

          {activePeer && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onStartCall(activePeer, 'audio')}
                disabled={Boolean(activeCall)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 disabled:opacity-40 border border-emerald-400/30 text-xs font-medium text-emerald-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voice Call</span>
              </button>
              <button
                onClick={() => onStartCall(activePeer, 'video')}
                disabled={Boolean(activeCall)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-40 border border-sky-400/30 text-xs font-medium text-sky-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Video Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Call Feedback Notice */}
        {callFeedback && !activeCall && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2 text-xs text-amber-200 shrink-0">
            <span>{callFeedback}</span>
            <button
              onClick={onDismissCallFeedback}
              className="p-0.5 rounded hover:bg-white/10 text-amber-200/80 hover:text-white"
              aria-label="Dismiss call notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Call Stage */}
        {activeCall && (
          <div className="mx-4 mt-3 rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 via-[#10192d] to-slate-950 overflow-hidden shadow-xl shrink-0">
            <div className="relative h-52 sm:h-60 flex flex-col items-center justify-center p-4">
              {hasRemoteVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2.5 text-center z-10">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-white/25 shadow-lg"
                    style={{ backgroundColor: activeCall.peer.avatarColor }}
                  >
                    {activeCall.peer.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {activeCall.peer.displayName}
                    </div>
                    <div className="text-xs text-sky-300 tabular-nums mt-0.5">
                      {activeCall.status === 'calling'
                        ? 'Ringing...'
                        : activeCall.status === 'connecting'
                        ? 'Connecting media...'
                        : formatCallDuration(activeCall.startedAt, callTickMs)}
                    </div>
                  </div>
                </div>
              )}

              {/* Local Video PiP */}
              {hasLocalVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-3 right-3 w-28 h-20 rounded-xl object-cover border border-white/25 shadow-lg bg-black z-20"
                />
              )}

              {/* Top Call Status Tag */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/55 border border-white/15 text-[11px] font-medium text-white tabular-nums z-20">
                {activeCall.mode === 'video' ? 'Video Call' : 'Voice Call'} ·{' '}
                {activeCall.status === 'connected'
                  ? formatCallDuration(activeCall.startedAt, callTickMs)
                  : activeCall.status === 'calling'
                  ? 'Ringing'
                  : 'Connecting'}
              </div>

              {activeCall.mediaNote && (
                <div className="absolute top-3 right-3 max-w-[230px] px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/35 text-[10px] text-amber-200 z-20">
                  {activeCall.mediaNote}
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="px-4 py-2.5 bg-black/45 border-t border-white/10 flex items-center justify-center gap-3">
              <button
                onClick={onToggleMic}
                className={`p-2.5 rounded-full border transition-colors ${
                  activeCall.micMuted
                    ? 'bg-amber-500/25 border-amber-400/40 text-amber-200'
                    : 'bg-white/10 hover:bg-white/18 border-white/15 text-white'
                }`}
                title={activeCall.micMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-label={activeCall.micMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {activeCall.micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {activeCall.mode === 'video' && (
                <button
                  onClick={onToggleCamera}
                  className={`p-2.5 rounded-full border transition-colors ${
                    activeCall.camOff
                      ? 'bg-amber-500/25 border-amber-400/40 text-amber-200'
                      : 'bg-white/10 hover:bg-white/18 border-white/15 text-white'
                  }`}
                  title={activeCall.camOff ? 'Turn camera on' : 'Turn camera off'}
                  aria-label={activeCall.camOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {activeCall.camOff ? (
                    <VideoOff className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={onEndCall}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages Thread */}
        <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-4 space-y-3">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="text-xs font-semibold text-white/75">
                {activePeer
                  ? `Start a conversation with ${activePeer.displayName}`
                  : 'Welcome to the Global Lounge'}
              </div>
              <p className="text-[11px] text-white/45 mt-1 max-w-xs">
                Messages sync in real time across signed-in players. You can also start a live
                voice or video call with any online player.
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const mine = msg.senderId === currentPlayer.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  {!mine && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border border-white/20 shrink-0"
                      style={{ backgroundColor: msg.senderAvatarColor }}
                    >
                      {msg.senderDisplayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className={`max-w-[78%] space-y-0.5 ${mine ? 'items-end text-right' : ''}`}>
                    {!mine && (
                      <div className="text-[10px] font-medium text-white/55 px-1">
                        {msg.senderDisplayName}
                      </div>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words text-left ${
                        mine
                          ? 'bg-sky-500 text-white rounded-br-sm'
                          : 'bg-white/10 text-white/95 border border-white/10 rounded-bl-sm'
                      }`}
                    >
                      {msg.body}
                    </div>
                    <div className="text-[10px] text-white/40 px-1">
                      {formatMsgTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {activeTypers.length > 0 && (
          <div className="px-4 pb-1 text-[11px] text-emerald-300/85 shrink-0">
            {activeTypers.join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-white/10 bg-black/25 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            maxLength={1000}
            placeholder={
              activePeer ? `Message ${activePeer.displayName}...` : 'Message Global Lounge...'
            }
            className="flex-1 px-3.5 py-2 rounded-xl bg-black/45 border border-white/12 text-xs text-white placeholder-white/40 outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-xs font-semibold text-slate-950 inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
