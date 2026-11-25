import { useState } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Check,
  Settings,
  Zap,
  PlugZap,
  Clock,
  RefreshCw,
  BookOpen,
  LogOut,
  AudioLines,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { AuroraLogo } from './AuroraLogo';
import {
  APPS_CATALOG,
  AppId,
  ClockPrefs,
  PlayerProfile,
  SoundCloudItem,
  WallpaperId,
} from '../../types/os';
import {
  OS_VERSIONS,
  WALLPAPER_OPTIONS,
  formatDurationSeconds,
  useBatteryStatus,
  useSystemClock,
} from '../../utils/systemInfo';

interface MenuBarProps {
  activeAppTitle: string;
  onOpenSpotlight: () => void;
  onLaunchApp: (id: AppId) => void;
  wallpaper: WallpaperId;
  onChangeWallpaper: (id: WallpaperId) => void;
  muted: boolean;
  onToggleMute: () => void;
  isMobile: boolean;
  osVersion: string;
  clockPrefs: ClockPrefs;
  onToggleClassroom: () => void;
  player: PlayerProfile | null;
  onSwitchPlayer: () => void;
  scTrack: SoundCloudItem | null;
  scIsPlaying: boolean;
  onToggleScPlayPause: () => void;
  onStopScTrack: () => void;
}

type PopoverKind = 'control' | 'battery' | 'clock' | 'player' | null;

export function MenuBar({
  activeAppTitle,
  onOpenSpotlight,
  onLaunchApp,
  wallpaper,
  onChangeWallpaper,
  muted,
  onToggleMute,
  isMobile,
  osVersion,
  clockPrefs,
  onToggleClassroom,
  player,
  onSwitchPlayer,
  scTrack,
  scIsPlaying,
  onToggleScPlayPause,
  onStopScTrack,
}: MenuBarProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const battery = useBatteryStatus();
  const clock = useSystemClock(clockPrefs);

  const togglePopover = (kind: Exclude<PopoverKind, null>) => {
    setOpenPopover((prev) => (prev === kind ? null : kind));
  };

  const batteryPct = battery.level;
  const batteryColorClass =
    battery.charging
      ? 'bg-emerald-400'
      : batteryPct !== null && batteryPct <= 20
        ? 'bg-amber-400'
        : 'bg-white';

  const batteryEstimate = battery.charging
    ? formatDurationSeconds(battery.chargingTime)
    : formatDurationSeconds(battery.dischargingTime);

  const hasStableUpdate =
    osVersion === '2.4.0' || osVersion === '2.3.1';

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-8 md:h-7 px-3 md:px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur-2xl border-b border-white/12 text-xs text-white/90 select-none">
      {/* Left: Brand & Active App */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={() => onLaunchApp('settings')}
          className="flex items-center hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
          title={`AltitudeMAX OS ${osVersion} · Open Settings`}
        >
          <AuroraLogo size="sm" showVersion={osVersion} />
        </button>

        <span className="font-semibold text-white/95 truncate max-w-[100px] sm:max-w-xs">
          {activeAppTitle}
        </span>

        {!isMobile && (
          <nav className="hidden lg:flex items-center gap-4 text-white/70">
            {(['games', 'comm', 'soundcloud', 'youtube', 'browser', 'settings'] as AppId[]).map((id) => (
              <button
                key={id}
                onClick={() => onLaunchApp(id)}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {APPS_CATALOG[id].shortTitle}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Right: Now Playing SoundCloud Mini-Controls, Classroom Hide, Spotlight, Audio, Control Center, Battery, Clock */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
        {scTrack && (
          <div className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#ff5500]/20 border border-[#ff5500]/45 text-white shrink-0">
            <button
              onClick={() => onLaunchApp('soundcloud')}
              className="flex items-center gap-1.5 text-[11px] font-medium hover:text-orange-200 transition-colors min-w-0"
              title={`Now Playing: ${scTrack.title} · Open SoundCloud`}
            >
              <AudioLines className="w-3 h-3 text-[#ff6a1f] shrink-0" />
              <span className="truncate max-w-[78px] sm:max-w-[140px]">{scTrack.title}</span>
            </button>
            <button
              onClick={onToggleScPlayPause}
              className="p-0.5 rounded-full hover:bg-white/15 text-white/90 transition-colors shrink-0"
              title={scIsPlaying ? 'Pause music' : 'Resume music'}
              aria-label={scIsPlaying ? 'Pause SoundCloud music' : 'Resume SoundCloud music'}
            >
              {scIsPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
            </button>
            <button
              onClick={onStopScTrack}
              className="p-0.5 rounded-full bg-rose-500/25 hover:bg-rose-500 text-rose-200 hover:text-white transition-colors shrink-0"
              title="Stop SoundCloud music"
              aria-label="Stop SoundCloud music"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
          </div>
        )}
        <button
          onClick={onToggleClassroom}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-white/12 transition-colors text-white/80 whitespace-nowrap shrink-0"
          aria-label="Hide Mode: Open Google Classroom (Ctrl)"
          title="Classroom Hide Mode (Press Ctrl)"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline text-[10px] text-white/55">Ctrl</span>
        </button>

        <button
          onClick={onOpenSpotlight}
          className="flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-white/12 transition-colors text-white/85 whitespace-nowrap shrink-0"
          aria-label="Open Spotlight Search"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px] text-white/60">⌘K</span>
        </button>

        <button
          onClick={onToggleMute}
          className="p-1 rounded-md hover:bg-white/12 transition-colors text-white/85 hidden sm:inline-flex"
          aria-label={muted ? 'Unmute OS Sound Effects' : 'Mute OS Sound Effects'}
          title={muted ? 'Sound FX Muted' : 'Sound FX On'}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-white/50" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => togglePopover('control')}
          className={`p-1 rounded-md transition-colors relative ${
            openPopover === 'control' ? 'bg-white/20 text-white' : 'hover:bg-white/12 text-white/85'
          }`}
          aria-label="Control Center"
          title="Control Center & Wallpapers"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {hasStableUpdate && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-sky-400" />
          )}
        </button>

        {/* Live Battery Readout */}
        <button
          onClick={() => togglePopover('battery')}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            openPopover === 'battery' ? 'bg-white/20 text-white' : 'hover:bg-white/12 text-white/90'
          }`}
          aria-label="Battery Status"
          title={
            battery.supported && batteryPct !== null
              ? `Battery: ${batteryPct}%${battery.charging ? ' (Charging)' : ''}`
              : 'Power: AC / Browser Mode'
          }
        >
          {battery.supported && batteryPct !== null ? (
            <>
              <span className="text-[11px] font-medium tabular-nums">{batteryPct}%</span>
              <span className="relative inline-flex items-center">
                <span className="w-[21px] h-[11px] rounded-[3px] border border-white/65 p-[1.5px] flex items-center relative">
                  <span
                    className={`h-full rounded-[1.5px] transition-all duration-300 ${batteryColorClass}`}
                    style={{ width: `${Math.max(8, batteryPct)}%` }}
                  />
                  {battery.charging && (
                    <Zap className="w-2.5 h-2.5 text-slate-950 fill-slate-950 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </span>
                <span className="w-[1.5px] h-[5px] bg-white/60 rounded-r-sm ml-[1px]" />
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
              <PlugZap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">AC</span>
            </span>
          )}
        </button>

        {/* Live Date & Time */}
        <button
          onClick={() => togglePopover('clock')}
          className={`px-1.5 py-0.5 rounded-md font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
            openPopover === 'clock' ? 'bg-white/20 text-white' : 'hover:bg-white/12 text-white/90'
          }`}
          aria-label="Date and Time"
          title={clock.fullDateFormatted}
        >
          {clock.menuBarText}
        </button>

        {/* Signed-In Player Account */}
        {player && (
          <button
            onClick={() => togglePopover('player')}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              openPopover === 'player' ? 'bg-white/20 text-white' : 'hover:bg-white/12 text-white/90'
            }`}
            aria-label="Player Account"
            title={`${player.displayName} (@${player.username})`}
          >
            <span
              className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white/25 shrink-0"
              style={{ backgroundColor: player.avatarColor }}
            >
              {player.displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden md:inline text-[11px] font-medium max-w-[90px] truncate">
              {player.displayName}
            </span>
          </button>
        )}

        {/* Popover Backdrop */}
        {openPopover && (
          <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(null)} />
        )}

        {/* Control Center Popover */}
        {openPopover === 'control' && (
          <div className="absolute right-0 top-8 z-50 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/18 shadow-2xl p-3.5 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/90">Desktop Background</div>
              <button
                onClick={() => {
                  setOpenPopover(null);
                  onLaunchApp('settings');
                }}
                className="text-[11px] font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>All Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {WALLPAPER_OPTIONS.map((wp) => {
                const active = wp.id === wallpaper;
                return (
                  <button
                    key={wp.id}
                    onClick={() => onChangeWallpaper(wp.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-sky-400/70 bg-white/15'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md bg-gradient-to-br ${wp.swatch} shrink-0 flex items-center justify-center relative overflow-hidden`}
                    >
                      {wp.previewImage && (
                        <img
                          src={wp.previewImage}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {active && <Check className="relative z-10 w-3 h-3 text-white drop-shadow" />}
                    </span>
                    <span className="text-[11px] font-medium truncate">{wp.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/75">
              <span>Arcade Sound FX</span>
              <button
                onClick={onToggleMute}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  muted ? 'bg-white/10 text-white/60' : 'bg-sky-500 text-white'
                }`}
              >
                {muted ? 'Muted' : 'Active'}
              </button>
            </div>

            <button
              onClick={() => {
                setOpenPopover(null);
                onLaunchApp('settings');
              }}
              className="w-full pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-left hover:text-white transition-colors"
            >
              <span className="inline-flex items-center gap-1.5 text-white/80">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>AltitudeMAX OS {osVersion}</span>
              </span>
              <span className="text-sky-400 font-semibold">
                {hasStableUpdate ? 'Update Available' : `${OS_VERSIONS.find((v) => v.version === osVersion)?.channel ?? 'Active'}`}
              </span>
            </button>
          </div>
        )}

        {/* Battery Popover */}
        {openPopover === 'battery' && (
          <div className="absolute right-0 top-8 z-50 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/18 shadow-2xl p-3.5 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Battery</span>
              <span className="text-sm font-bold tabular-nums text-white">
                {battery.supported && batteryPct !== null ? `${batteryPct}%` : 'AC Power'}
              </span>
            </div>
            <div className="text-[11px] text-white/65 leading-relaxed">
              {battery.supported && batteryPct !== null ? (
                <>
                  <div>
                    Source: {battery.charging ? 'Power Adapter (Charging)' : 'Internal Battery'}
                  </div>
                  {batteryEstimate && (
                    <div className="text-sky-300 mt-0.5">
                      {battery.charging
                        ? `${batteryEstimate} until full`
                        : `${batteryEstimate} remaining`}
                    </div>
                  )}
                </>
              ) : (
                <div>
                  Running on external power or a browser that hides hardware battery telemetry.
                </div>
              )}
            </div>
            {battery.supported && batteryPct !== null && (
              <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                <div
                  className={`h-full ${batteryColorClass}`}
                  style={{ width: `${batteryPct}%` }}
                />
              </div>
            )}
            <button
              onClick={() => {
                setOpenPopover(null);
                onLaunchApp('settings');
              }}
              className="w-full pt-2 border-t border-white/10 text-left text-[11px] font-medium text-sky-400 hover:text-sky-300"
            >
              Battery & Power Settings...
            </button>
          </div>
        )}

        {/* Clock Popover */}
        {openPopover === 'clock' && (
          <div className="absolute right-0 top-8 z-50 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/18 shadow-2xl p-3.5 text-white space-y-2.5">
            <div className="flex items-center gap-2 text-sky-400 text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Local System Time</span>
            </div>
            <div className="text-xl font-bold font-[family-name:var(--font-display)] tabular-nums text-white">
              {clock.timeWithSeconds}
            </div>
            <div className="text-xs text-white/75">{clock.fullDateFormatted}</div>
            <div className="text-[11px] text-white/45">{clock.timeZone}</div>
            <button
              onClick={() => {
                setOpenPopover(null);
                onLaunchApp('settings');
              }}
              className="w-full pt-2 border-t border-white/10 text-left text-[11px] font-medium text-sky-400 hover:text-sky-300"
            >
              Date & Time Preferences...
            </button>
          </div>
        )}

        {/* Player Account Popover */}
        {openPopover === 'player' && player && (
          <div className="absolute right-0 top-8 z-50 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/18 shadow-2xl p-3.5 text-white space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white border border-white/25 shrink-0"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{player.displayName}</div>
                <div className="text-[11px] text-white/55 truncate">
                  @{player.username} · {player.role === 'owner' ? 'Site Owner' : 'Player'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setOpenPopover(null);
                  onSwitchPlayer();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch Player / Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
