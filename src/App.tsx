import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { APPS_CATALOG, AppId, AuthStatus, ClockPrefs, PlayerProfile, SoundCloudItem, WallpaperId, WindowState } from './types/os';
import { WallpaperLayer } from './components/os/WallpaperLayer';
import { MenuBar } from './components/os/MenuBar';
import { Dock } from './components/os/Dock';
import { WindowFrame } from './components/os/WindowFrame';
import { SpotlightModal } from './components/os/SpotlightModal';
import { AppIcon } from './components/os/AppIcon';
import { AuroraLogo } from './components/os/AuroraLogo';
import { ClassroomCover } from './components/os/ClassroomCover';
import { LoginScreen } from './components/os/LoginScreen';
import { GamesApp } from './components/apps/GamesApp';
import { MessagesApp } from './components/apps/MessagesApp';
import { SoundCloudApp } from './components/apps/SoundCloudApp';
import { YouTubeApp } from './components/apps/YouTubeApp';
import { BrowserApp } from './components/apps/BrowserApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { useCommClient } from './hooks/useCommClient';
import { soundFx } from './utils/sound';

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function createInitialWindows(): Record<AppId, WindowState> {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const fitW = (ideal: number) => Math.min(ideal, Math.max(380, vw - 140));
  const fitH = (ideal: number) => Math.min(ideal, Math.max(360, vh - 120));

  const gamesW = fitW(960);
  const gamesH = fitH(610);

  return {
    games: {
      id: 'games',
      title: APPS_CATALOG.games.title,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 12,
      x: Math.max(24, Math.round((vw - gamesW) / 2)),
      y: Math.max(40, Math.round((vh - gamesH - 60) / 2)),
      width: gamesW,
      height: gamesH,
    },
    comm: {
      id: 'comm',
      title: APPS_CATALOG.comm.title,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 11,
      x: Math.max(28, Math.round((vw - fitW(880)) / 2) + 12),
      y: 48,
      width: fitW(880),
      height: fitH(580),
    },
    soundcloud: {
      id: 'soundcloud',
      title: APPS_CATALOG.soundcloud.title,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: Math.max(28, Math.round((vw - fitW(920)) / 2) - 24),
      y: 52,
      width: fitW(920),
      height: fitH(590),
    },
    youtube: {
      id: 'youtube',
      title: APPS_CATALOG.youtube.title,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: Math.max(28, Math.round((vw - fitW(940)) / 2)),
      y: 44,
      width: fitW(940),
      height: fitH(590),
    },
    browser: {
      id: 'browser',
      title: APPS_CATALOG.browser.title,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: Math.max(28, Math.round((vw - fitW(940)) / 2) + 18),
      y: 50,
      width: fitW(940),
      height: fitH(590),
    },
    settings: {
      id: 'settings',
      title: APPS_CATALOG.settings.title,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
      x: Math.max(28, Math.round((vw - fitW(820)) / 2)),
      y: 54,
      width: fitW(820),
      height: fitH(560),
    },
  };
}

const DESKTOP_SHORTCUTS: AppId[] = [
  'games',
  'comm',
  'soundcloud',
  'youtube',
  'browser',
  'settings',
];

export default function App() {
  const [windows, setWindows] = useState<Record<AppId, WindowState>>(createInitialWindows);
  const [activeAppId, setActiveAppId] = useState<AppId | null>('games');
  const [topZ, setTopZ] = useState(20);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [wallpaper, setWallpaperState] = useState<WallpaperId>(() =>
    readStored<WallpaperId>('aurora_wallpaper', 'aurora')
  );
  const [customBgUrl, setCustomBgUrlState] = useState<string>(() =>
    readStored<string>('aurora_custom_bg', '')
  );
  const [bgDim, setBgDimState] = useState<number>(() =>
    readStored<number>('aurora_bg_dim', 25)
  );
  const [bgBlur, setBgBlurState] = useState<boolean>(() =>
    readStored<boolean>('aurora_bg_blur', false)
  );
  const [osVersion, setOsVersionState] = useState<string>(() =>
    readStored<string>('aurora_os_version', '2.4.0')
  );
  const [clockPrefs, setClockPrefsState] = useState<ClockPrefs>(() =>
    readStored<ClockPrefs>('aurora_clock_prefs', {
      use24Hour: false,
      showSeconds: false,
      showDate: true,
    })
  );
  const [classroomMode, setClassroomMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loadingAuthStatus, setLoadingAuthStatus] = useState(true);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);

  const ctrlAloneRef = useRef(false);
  const classroomModeRef = useRef(classroomMode);
  classroomModeRef.current = classroomMode;

  const [scTrack, setScTrack] = useState<SoundCloudItem | null>(null);
  const [scVisual, setScVisual] = useState(false);
  const [scIsPlaying, setScIsPlaying] = useState(false);
  const [scSlotRect, setScSlotRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement>(null);

  const isCommOpen = Boolean(windows.comm?.isOpen && !windows.comm?.isMinimized);
  const comm = useCommClient({
    token: playerToken,
    player,
    isCommOpen,
    pausedByHide: classroomMode,
  });

  const refreshAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = (await res.json()) as AuthStatus;
        setAuthStatus(data);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoadingAuthStatus(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  const handlePlayerAuthenticated = useCallback(
    (token: string, profile: PlayerProfile) => {
      setPlayerToken(token);
      setPlayer(profile);
      void refreshAuthStatus();
    },
    [refreshAuthStatus]
  );

  const handleSwitchPlayer = useCallback(() => {
    setScTrack(null);
    setScIsPlaying(false);
    setPlayerToken(null);
    setPlayer(null);
    setSpotlightOpen(false);
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  const handleSelectScTrack = useCallback((item: SoundCloudItem | null) => {
    setScTrack(item);
    setScIsPlaying(Boolean(item));
  }, []);

  const handleToggleScPlayPause = useCallback(() => {
    soundFx.click();
    const win = scIframeRef.current?.contentWindow;
    const nextPlaying = !scIsPlaying;
    setScIsPlaying(nextPlaying);
    if (win) {
      win.postMessage(
        JSON.stringify({ method: nextPlaying ? 'play' : 'pause' }),
        'https://w.soundcloud.com'
      );
    }
  }, [scIsPlaying]);

  const handleStopScTrack = useCallback(() => {
    soundFx.click();
    setScTrack(null);
    setScIsPlaying(false);
    setScSlotRect(null);
  }, []);

  const scWidgetSrc = useMemo(() => {
    if (!scTrack) return '';
    const params = new URLSearchParams({
      url: scTrack.permalinkUrl,
      color: '#ff5500',
      auto_play: 'true',
      hide_related: 'true',
      show_comments: 'true',
      show_user: 'true',
      show_reposts: 'false',
      show_teaser: 'false',
      visual: scVisual ? 'true' : 'false',
    });
    return `https://w.soundcloud.com/player/?${params.toString()}`;
  }, [scTrack, scVisual]);

  // Listen to SoundCloud Widget postMessage events to keep Play/Pause state synced
  useEffect(() => {
    const onScMessage = (event: MessageEvent) => {
      if (!event.origin.includes('soundcloud.com')) return;
      let data: { event?: string } | null = null;
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data) as { event?: string };
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === 'object') {
        data = event.data as { event?: string };
      }
      if (!data?.event) return;
      if (data.event === 'ready') {
        const win = scIframeRef.current?.contentWindow;
        if (win) {
          win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'play' }), 'https://w.soundcloud.com');
          win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'pause' }), 'https://w.soundcloud.com');
          win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), 'https://w.soundcloud.com');
        }
      } else if (data.event === 'play') {
        setScIsPlaying(true);
      } else if (data.event === 'pause' || data.event === 'finish') {
        setScIsPlaying(false);
      }
    };
    window.addEventListener('message', onScMessage);
    return () => window.removeEventListener('message', onScMessage);
  }, []);

  const setWallpaper = useCallback((id: WallpaperId) => {
    setWallpaperState(id);
    writeStored('aurora_wallpaper', id);
  }, []);

  const setCustomBgUrl = useCallback((url: string) => {
    setCustomBgUrlState(url);
    writeStored('aurora_custom_bg', url);
  }, []);

  const setBgDim = useCallback((dim: number) => {
    setBgDimState(dim);
    writeStored('aurora_bg_dim', dim);
  }, []);

  const setBgBlur = useCallback((blur: boolean) => {
    setBgBlurState(blur);
    writeStored('aurora_bg_blur', blur);
  }, []);

  const setOsVersion = useCallback((ver: string) => {
    setOsVersionState(ver);
    writeStored('aurora_os_version', ver);
  }, []);

  const setClockPrefs = useCallback((prefs: ClockPrefs) => {
    setClockPrefsState(prefs);
    writeStored('aurora_clock_prefs', prefs);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    soundFx.muted = classroomMode || muted;
    if (typeof document !== 'undefined') {
      document.title = classroomMode ? 'Home - Classroom' : 'AltitudeMAX OS';
    }
  }, [classroomMode, muted]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (!e.repeat) {
          ctrlAloneRef.current = true;
        }
        return;
      }
      ctrlAloneRef.current = false;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (!classroomModeRef.current) {
          e.preventDefault();
          setSpotlightOpen((v) => !v);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && ctrlAloneRef.current) {
        ctrlAloneRef.current = false;
        e.preventDefault();
        setClassroomMode((prev) => !prev);
      }
    };

    const onBlur = () => {
      ctrlAloneRef.current = false;
    };

    const onMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: unknown } | null;
      if (payload && payload.type === 'brave-panic-ctrl') {
        setClassroomMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const focusApp = useCallback(
    (id: AppId) => {
      const nextZ = topZ + 1;
      setTopZ(nextZ);
      setActiveAppId(id);
      setWindows((prev) => ({
        ...prev,
        [id]: { ...prev[id], zIndex: nextZ, isMinimized: false },
      }));
    },
    [topZ]
  );

  const launchApp = useCallback(
    (id: AppId) => {
      soundFx.click();
      const nextZ = topZ + 1;
      setTopZ(nextZ);
      setActiveAppId(id);
      setWindows((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isOpen: true,
          isMinimized: false,
          zIndex: nextZ,
        },
      }));
    },
    [topZ]
  );

  const handleDockClick = useCallback(
    (id: AppId) => {
      const win = windows[id];
      if (!win.isOpen) {
        launchApp(id);
        return;
      }
      if (win.isMinimized || activeAppId !== id) {
        focusApp(id);
        return;
      }
      if (!isMobile) {
        setWindows((prev) => ({
          ...prev,
          [id]: { ...prev[id], isMinimized: true },
        }));
      }
    },
    [windows, activeAppId, isMobile, launchApp, focusApp]
  );

  const closeApp = useCallback((id: AppId) => {
    soundFx.click();
    setWindows((prev) => {
      const updated = {
        ...prev,
        [id]: { ...prev[id], isOpen: false, isMinimized: false, isMaximized: false },
      };
      const openOthers = (Object.values(updated) as WindowState[])
        .filter((w) => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);
      setActiveAppId(openOthers[0]?.id ?? null);
      return updated;
    });
  }, []);

  const minimizeApp = useCallback((id: AppId) => {
    soundFx.click();
    setWindows((prev) => {
      const updated = {
        ...prev,
        [id]: { ...prev[id], isMinimized: true },
      };
      const openOthers = (Object.values(updated) as WindowState[])
        .filter((w) => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);
      setActiveAppId(openOthers[0]?.id ?? null);
      return updated;
    });
  }, []);

  const toggleMaximizeApp = useCallback((id: AppId) => {
    soundFx.click();
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMaximized: !prev[id].isMaximized },
    }));
  }, []);

  const moveWindow = useCallback((id: AppId, x: number, y: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], x, y },
    }));
  }, []);

  const resizeWindow = useCallback((id: AppId, width: number, height: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], width, height },
    }));
  }, []);

  const toggleMute = () => {
    const next = !muted;
    soundFx.muted = next;
    setMuted(next);
  };

  const resetWindows = useCallback(() => {
    const fresh = createInitialWindows();
    fresh.settings.isOpen = true;
    fresh.settings.zIndex = 25;
    setTopZ(26);
    setWindows(fresh);
    setActiveAppId('settings');
  }, []);

  const activeTitle = useMemo(() => {
    if (activeAppId && windows[activeAppId]?.isOpen && !windows[activeAppId]?.isMinimized) {
      return APPS_CATALOG[activeAppId].shortTitle;
    }
    return 'Desktop';
  }, [activeAppId, windows]);

  const renderAppBody = (id: AppId) => {
    switch (id) {
      case 'games':
        return <GamesApp pausedByHide={classroomMode} />;
      case 'comm':
        return player ? (
          <MessagesApp
            currentPlayer={player}
            wsConnected={comm.wsConnected}
            contacts={comm.contacts}
            activeChannelId={comm.activeChannelId}
            messagesByChannel={comm.messagesByChannel}
            unreadByChannel={comm.unreadByChannel}
            typingByChannel={comm.typingByChannel}
            activeCall={comm.activeCall}
            callFeedback={comm.callFeedback}
            onDismissCallFeedback={comm.dismissCallFeedback}
            localStream={comm.localStream}
            remoteStream={comm.remoteStream}
            onSelectChannel={comm.selectChannel}
            onRefreshDirectory={comm.refreshDirectory}
            onSendMessage={comm.sendMessage}
            onSendTyping={comm.sendTyping}
            onStartCall={comm.startCall}
            onEndCall={comm.endCall}
            onToggleMic={comm.toggleMic}
            onToggleCamera={comm.toggleCamera}
          />
        ) : null;
      case 'soundcloud':
        return (
          <SoundCloudApp
            pausedByHide={classroomMode}
            currentItem={scTrack}
            onSelectTrack={handleSelectScTrack}
            visualPlayer={scVisual}
            onToggleVisualPlayer={() => setScVisual((v) => !v)}
            onPlayerSlotRectChange={setScSlotRect}
          />
        );
      case 'youtube':
        return <YouTubeApp pausedByHide={classroomMode} />;
      case 'browser':
        return <BrowserApp />;
      case 'settings':
        return (
          <SettingsApp
            wallpaper={wallpaper}
            onChangeWallpaper={setWallpaper}
            customBgUrl={customBgUrl}
            onChangeCustomBgUrl={setCustomBgUrl}
            bgDim={bgDim}
            onChangeBgDim={setBgDim}
            bgBlur={bgBlur}
            onChangeBgBlur={setBgBlur}
            osVersion={osVersion}
            onChangeOsVersion={setOsVersion}
            clockPrefs={clockPrefs}
            onChangeClockPrefs={setClockPrefs}
            muted={muted}
            onToggleMute={toggleMute}
            onResetWindows={resetWindows}
            player={player}
            onSwitchPlayer={handleSwitchPlayer}
          />
        );
    }
  };

  const anyActiveMobileApp =
    isMobile &&
    activeAppId &&
    windows[activeAppId]?.isOpen &&
    !windows[activeAppId]?.isMinimized;

  const isAuthenticated = Boolean(playerToken && player);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className={classroomMode ? 'invisible pointer-events-none select-none' : 'contents'}>
        <WallpaperLayer
          wallpaper={wallpaper}
          customBgUrl={customBgUrl}
          bgDim={bgDim}
          bgBlur={bgBlur}
        />

        {!isAuthenticated ? (
          <LoginScreen
            osVersion={osVersion}
            clockPrefs={clockPrefs}
            authStatus={authStatus}
            loadingStatus={loadingAuthStatus}
            onPlayerAuthenticated={handlePlayerAuthenticated}
            onToggleClassroom={() => setClassroomMode(true)}
          />
        ) : (
          <>
            <MenuBar
              activeAppTitle={activeTitle}
              onOpenSpotlight={() => setSpotlightOpen(true)}
              onLaunchApp={launchApp}
              wallpaper={wallpaper}
              onChangeWallpaper={setWallpaper}
              muted={muted}
              onToggleMute={toggleMute}
              isMobile={isMobile}
              osVersion={osVersion}
              clockPrefs={clockPrefs}
              onToggleClassroom={() => setClassroomMode(true)}
              player={player}
              onSwitchPlayer={handleSwitchPlayer}
              scTrack={scTrack}
              scIsPlaying={scIsPlaying}
              onToggleScPlayPause={handleToggleScPlayPause}
              onStopScTrack={handleStopScTrack}
            />

      {/* Desktop Shortcut Grid */}
      {!isMobile ? (
        <main className="fixed top-12 left-4 bottom-24 z-10 flex flex-col flex-wrap gap-3 content-start pointer-events-none">
          {DESKTOP_SHORTCUTS.map((id) => {
            const meta = APPS_CATALOG[id];
            return (
              <button
                key={id}
                onClick={() => launchApp(id)}
                className="pointer-events-auto w-20 p-2 rounded-2xl hover:bg-white/12 active:scale-95 transition-all flex flex-col items-center gap-1.5 text-center group"
              >
                <AppIcon id={id} size="md" />
                <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-tight line-clamp-2">
                  {meta.shortTitle}
                </span>
              </button>
            );
          })}
        </main>
      ) : (
        !anyActiveMobileApp && (
          <main className="fixed top-9 bottom-14 inset-x-0 z-10 p-5 overflow-y-auto os-scroll">
            <div className="max-w-md mx-auto space-y-6 pt-2">
              <div>
                <h1 className="flex items-center">
                  <AuroraLogo size="lg" />
                </h1>
                <p className="text-xs text-white/65 mt-0.5">Tap an app or game to launch</p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {(Object.keys(APPS_CATALOG) as AppId[]).map((id) => {
                  const meta = APPS_CATALOG[id];
                  return (
                    <button
                      key={id}
                      onClick={() => launchApp(id)}
                      className="flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform"
                    >
                      <AppIcon id={id} size="md" />
                      <span className="text-[11px] font-medium text-white/95 drop-shadow leading-tight line-clamp-1">
                        {meta.shortTitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </main>
        )
      )}

      {/* Open Windows */}
      <AnimatePresence>
        {(Object.values(windows) as WindowState[]).map((win) => (
          <WindowFrame
            key={win.id}
            win={win}
            isActive={activeAppId === win.id}
            isMobile={isMobile}
            onFocus={focusApp}
            onClose={closeApp}
            onMinimize={minimizeApp}
            onToggleMaximize={toggleMaximizeApp}
            onMove={moveWindow}
            onResize={resizeWindow}
          >
            {renderAppBody(win.id)}
          </WindowFrame>
        ))}
      </AnimatePresence>

      {/* Persistent SoundCloud Player Host (stays mounted across window close/minimize so music keeps playing) */}
      {scTrack && scWidgetSrc && !classroomMode && (
        <div
          className={
            windows.soundcloud.isOpen && !windows.soundcloud.isMinimized && scSlotRect
              ? 'fixed rounded-xl overflow-hidden bg-black'
              : 'fixed -left-[9999px] top-0 w-[320px] h-[180px] opacity-0 pointer-events-none'
          }
          style={
            windows.soundcloud.isOpen && !windows.soundcloud.isMinimized && scSlotRect
              ? {
                  top: scSlotRect.top,
                  left: scSlotRect.left,
                  width: scSlotRect.width,
                  height: scSlotRect.height,
                  zIndex: windows.soundcloud.zIndex,
                }
              : undefined
          }
        >
          <iframe
            ref={scIframeRef}
            key={scWidgetSrc}
            title={`SoundCloud Player - ${scTrack.title}`}
            src={scWidgetSrc}
            width="100%"
            height="100%"
            allow="autoplay; encrypted-media"
            className="w-full h-full border-0"
          />
        </div>
      )}

      <Dock
        windows={windows}
        activeAppId={activeAppId}
        onDockClick={handleDockClick}
        isMobile={isMobile}
        unreadCommCount={comm.totalUnread}
      />

            {comm.incomingCall && (
              <div className="fixed top-11 right-4 z-[95] w-80 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-emerald-400/35 p-4 shadow-2xl space-y-3 text-white">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white border border-white/25 shrink-0"
                    style={{ backgroundColor: comm.incomingCall.fromUser.avatarColor }}
                  >
                    {comm.incomingCall.fromUser.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-emerald-400">
                      Incoming {comm.incomingCall.mode === 'video' ? 'Video' : 'Voice'} Call
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {comm.incomingCall.fromUser.displayName}
                    </div>
                    <div className="text-[11px] text-white/55 truncate">
                      @{comm.incomingCall.fromUser.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      launchApp('comm');
                      void comm.acceptIncomingCall('audio');
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-slate-950 inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Audio</span>
                  </button>
                  {comm.incomingCall.mode === 'video' && (
                    <button
                      onClick={() => {
                        launchApp('comm');
                        void comm.acceptIncomingCall('video');
                      }}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </button>
                  )}
                  <button
                    onClick={comm.declineIncomingCall}
                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white inline-flex items-center justify-center gap-1 transition-colors"
                    aria-label="Decline call"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <SpotlightModal
              open={spotlightOpen}
              onClose={() => setSpotlightOpen(false)}
              onLaunchApp={launchApp}
            />
          </>
        )}
      </div>

      {classroomMode && <ClassroomCover onExit={() => setClassroomMode(false)} />}
    </div>
  );
}
