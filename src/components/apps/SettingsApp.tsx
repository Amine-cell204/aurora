import { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  RefreshCw,
  Clock,
  BatteryCharging,
  Battery,
  PlugZap,
  Check,
  Upload,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Code2,
  User,
  LogOut,
} from 'lucide-react';
import { AuroraLogo } from '../os/AuroraLogo';
import { ClockPrefs, PlayerProfile, WallpaperId } from '../../types/os';
import {
  OS_VERSIONS,
  OsVersionRelease,
  WALLPAPER_OPTIONS,
  formatDurationSeconds,
  useBatteryStatus,
  useSystemClock,
} from '../../utils/systemInfo';
import { soundFx } from '../../utils/sound';

type SettingsSection =
  | 'wallpaper'
  | 'updates'
  | 'clock-power'
  | 'account'
  | 'sound-windows'
  | 'developers';

interface SettingsAppProps {
  wallpaper: WallpaperId;
  onChangeWallpaper: (id: WallpaperId) => void;
  customBgUrl: string;
  onChangeCustomBgUrl: (url: string) => void;
  bgDim: number;
  onChangeBgDim: (dim: number) => void;
  bgBlur: boolean;
  onChangeBgBlur: (blur: boolean) => void;
  osVersion: string;
  onChangeOsVersion: (version: string) => void;
  clockPrefs: ClockPrefs;
  onChangeClockPrefs: (prefs: ClockPrefs) => void;
  muted: boolean;
  onToggleMute: () => void;
  onResetWindows: () => void;
  player: PlayerProfile | null;
  onSwitchPlayer: () => void;
  initialSection?: SettingsSection;
}

const SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'wallpaper', label: 'Background', icon: ImageIcon },
  { id: 'updates', label: 'Software Update', icon: RefreshCw },
  { id: 'clock-power', label: 'Time & Battery', icon: Clock },
  { id: 'account', label: 'Player Account', icon: User },
  { id: 'sound-windows', label: 'Sound & Glass', icon: Sliders },
  { id: 'developers', label: 'The Developers of the Site', icon: Code2 },
];

export function SettingsApp({
  wallpaper,
  onChangeWallpaper,
  customBgUrl,
  onChangeCustomBgUrl,
  bgDim,
  onChangeBgDim,
  bgBlur,
  onChangeBgBlur,
  osVersion,
  onChangeOsVersion,
  clockPrefs,
  onChangeClockPrefs,
  muted,
  onToggleMute,
  onResetWindows,
  player,
  onSwitchPlayer,
  initialSection = 'wallpaper',
}: SettingsAppProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [customUrlInput, setCustomUrlInput] = useState(
    customBgUrl && !customBgUrl.startsWith('data:') ? customBgUrl : ''
  );
  const [uploadError, setUploadError] = useState('');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('Just now');
  const [installingVersion, setInstallingVersion] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const battery = useBatteryStatus();
  const clock = useSystemClock(clockPrefs);

  const activeRelease =
    OS_VERSIONS.find((v) => v.version === osVersion) ?? OS_VERSIONS[1];
  const latestStable = OS_VERSIONS.find((v) => v.channel === 'Stable') ?? OS_VERSIONS[1];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setUploadError('Image exceeds 4.5 MB. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        soundFx.click();
        onChangeCustomBgUrl(reader.result);
        onChangeWallpaper('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setUploadError('Enter a valid image URL starting with https://');
      return;
    }
    soundFx.click();
    onChangeCustomBgUrl(trimmed);
    onChangeWallpaper('custom');
  };

  const handleCheckUpdates = () => {
    soundFx.click();
    setCheckingUpdates(true);
    setTimeout(() => {
      setCheckingUpdates(false);
      setLastChecked(
        new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      );
    }, 800);
  };

  const handleInstallVersion = (release: OsVersionRelease) => {
    if (installingVersion || release.version === osVersion) return;
    soundFx.click();
    setInstallingVersion(release.version);
    setInstallProgress(8);

    let progress = 8;
    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 22) + 14;
      if (progress >= 100) {
        clearInterval(timer);
        setInstallProgress(100);
        setTimeout(() => {
          onChangeOsVersion(release.version);
          setInstallingVersion(null);
          setInstallProgress(0);
          soundFx.win();
        }, 260);
      } else {
        setInstallProgress(progress);
      }
    }, 180);
  };

  const batteryTimeEstimate =
    battery.charging
      ? formatDurationSeconds(battery.chargingTime)
      : formatDurationSeconds(battery.dischargingTime);

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0f131d]/95 text-white overflow-hidden">
      {/* Sidebar / Mobile Tabs */}
      <aside className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-black/25 p-2.5 md:p-3 flex md:flex-col gap-1 overflow-x-auto os-scroll">
        <div className="hidden md:flex items-center px-2.5 py-2 mb-1">
          <AuroraLogo size="md" showVersion={`v${osVersion}`} />
        </div>

        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFx.click();
                setSection(item.id);
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-sky-500/25 text-white border border-sky-400/40'
                  : 'text-white/65 hover:text-white hover:bg-white/8 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-400' : 'text-white/55'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6">
        {section === 'wallpaper' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                Wallpaper & Background
              </h2>
              <p className="text-xs text-white/55 mt-0.5">
                Pick a theme, upload your own photo, or adjust backdrop contrast.
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {WALLPAPER_OPTIONS.map((wp) => {
                const active = wallpaper === wp.id;
                return (
                  <button
                    key={wp.id}
                    onClick={() => {
                      soundFx.click();
                      onChangeWallpaper(wp.id);
                    }}
                    className={`group text-left rounded-2xl p-2 border transition-all ${
                      active
                        ? 'border-sky-400 bg-sky-500/15 shadow-lg shadow-sky-950/40'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/8'
                    }`}
                  >
                    <div
                      className={`h-20 rounded-xl bg-gradient-to-br ${wp.swatch} relative overflow-hidden border border-white/15`}
                    >
                      {wp.previewImage && (
                        <img
                          src={wp.previewImage}
                          alt={wp.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {active && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="px-1 pt-2 pb-0.5">
                      <div className="text-xs font-semibold text-white truncate">{wp.label}</div>
                      <div className="text-[11px] text-white/50 truncate">{wp.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Background Upload & URL */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">Custom Desktop Background</div>
                  <div className="text-[11px] text-white/50">
                    Upload an image from your device or paste an image URL
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                  {customBgUrl && (
                    <button
                      onClick={() => {
                        soundFx.click();
                        onChangeCustomBgUrl('');
                        setCustomUrlInput('');
                        if (wallpaper === 'custom') onChangeWallpaper('aurora');
                      }}
                      className="p-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                      title="Remove custom wallpaper"
                      aria-label="Remove custom wallpaper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleApplyUrl} className="flex items-center gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/wallpaper.jpg"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/12 text-xs text-white placeholder-white/35 outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/12 text-xs font-medium text-white shrink-0 transition-colors"
                >
                  Apply URL
                </button>
              </form>

              {uploadError && <p className="text-[11px] text-rose-400">{uploadError}</p>}

              {customBgUrl && (
                <button
                  onClick={() => {
                    soundFx.click();
                    onChangeWallpaper('custom');
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-colors ${
                    wallpaper === 'custom'
                      ? 'border-sky-400 bg-sky-500/15'
                      : 'border-white/10 bg-black/25 hover:bg-white/8'
                  }`}
                >
                  <img
                    src={customBgUrl}
                    alt="Custom background preview"
                    className="w-16 h-10 rounded-lg object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white">Custom Image Active</div>
                    <div className="text-[11px] text-white/50 truncate">
                      {customBgUrl.startsWith('data:') ? 'Uploaded local image' : customBgUrl}
                    </div>
                  </div>
                  {wallpaper === 'custom' && <Check className="w-4 h-4 text-sky-400 shrink-0 mr-1" />}
                </button>
              )}
            </div>

            {/* Backdrop Dim & Blur Controls */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white">Background Dimming</span>
                  <span className="tabular-nums text-white/60">{bgDim}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={75}
                  step={5}
                  value={bgDim}
                  onChange={(e) => onChangeBgDim(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Soft Background Blur</div>
                  <div className="text-[11px] text-white/50">
                    Keeps desktop icons crisp over bright photos
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundFx.click();
                    onChangeBgBlur(!bgBlur);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    bgBlur ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/65'
                  }`}
                >
                  {bgBlur ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'updates' && (
          <div className="max-w-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                  Software Update
                </h2>
                <p className="text-xs text-white/55 mt-0.5">
                  Manage AltitudeMAX OS system builds, stability releases, and beta previews.
                </p>
              </div>
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates || Boolean(installingVersion)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                <span>{checkingUpdates ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            </div>

            {/* Active Version Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-white/[0.03] border border-sky-400/30 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-lg border border-white/25 shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    AltitudeMAX OS {activeRelease.version} · {activeRelease.codename}
                  </div>
                  <div className="text-xs text-white/65 mt-0.5 tabular-nums">
                    Build {activeRelease.build} · {activeRelease.channel} Channel · Checked {lastChecked}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-emerald-400">
                {osVersion === latestStable.version ? 'Latest Stable Installed' : 'Build Active'}
              </div>
            </div>

            {installingVersion && (
              <div className="rounded-2xl bg-white/[0.05] border border-sky-400/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">
                    Installing AltitudeMAX OS {installingVersion}...
                  </span>
                  <span className="tabular-nums text-sky-300">{installProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-150"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Available Releases */}
            <div className="space-y-3">
              {OS_VERSIONS.map((rel) => {
                const isCurrent = rel.version === osVersion;
                const isInstalling = installingVersion === rel.version;
                return (
                  <div
                    key={rel.version}
                    className={`rounded-2xl p-4 border transition-colors ${
                      isCurrent
                        ? 'bg-white/[0.07] border-sky-400/45'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          AltitudeMAX OS {rel.version} — {rel.codename}
                        </div>
                        <div className="text-[11px] text-white/55 mt-0.5 tabular-nums">
                          Build {rel.build} · {rel.channel} · {rel.releaseDate} · {rel.sizeLabel}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstallVersion(rel)}
                          disabled={Boolean(installingVersion)}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                        >
                          {isInstalling
                            ? 'Installing...'
                            : rel.version > osVersion
                              ? 'Update Now'
                              : 'Switch Version'}
                        </button>
                      )}
                    </div>

                    <ul className="mt-3 space-y-1.5 text-xs text-white/75 list-disc list-inside">
                      {rel.highlights.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === 'clock-power' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                Date, Time & Battery
              </h2>
              <p className="text-xs text-white/55 mt-0.5">
                Live system clock readout, menu bar format, and real-time hardware battery level.
              </p>
            </div>

            {/* Live Clock Card */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] tabular-nums text-white">
                    {clock.timeWithSeconds}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">
                    {clock.fullDateFormatted} · {clock.timeZone}
                  </div>
                </div>
                <Clock className="w-7 h-7 text-sky-400 shrink-0" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    soundFx.click();
                    onChangeClockPrefs({ ...clockPrefs, use24Hour: !clockPrefs.use24Hour });
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    clockPrefs.use24Hour
                      ? 'border-sky-400/60 bg-sky-500/15'
                      : 'border-white/10 bg-black/25 hover:bg-white/8'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">24-Hour Clock</div>
                  <div className="text-[11px] text-white/55 mt-0.5">
                    {clockPrefs.use24Hour ? 'Enabled (19:52)' : '12-Hour (7:52 PM)'}
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundFx.click();
                    onChangeClockPrefs({ ...clockPrefs, showSeconds: !clockPrefs.showSeconds });
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    clockPrefs.showSeconds
                      ? 'border-sky-400/60 bg-sky-500/15'
                      : 'border-white/10 bg-black/25 hover:bg-white/8'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">Show Seconds</div>
                  <div className="text-[11px] text-white/55 mt-0.5">
                    {clockPrefs.showSeconds ? 'Live seconds in Menu Bar' : 'Minutes only'}
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundFx.click();
                    onChangeClockPrefs({ ...clockPrefs, showDate: !clockPrefs.showDate });
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    clockPrefs.showDate
                      ? 'border-sky-400/60 bg-sky-500/15'
                      : 'border-white/10 bg-black/25 hover:bg-white/8'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">Show Date</div>
                  <div className="text-[11px] text-white/55 mt-0.5">
                    {clockPrefs.showDate ? 'Weekday & date visible' : 'Time only'}
                  </div>
                </button>
              </div>
            </div>

            {/* Live Hardware Battery Card */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      battery.supported && battery.charging
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-white/8 border-white/15 text-sky-300'
                    }`}
                  >
                    {!battery.supported ? (
                      <PlugZap className="w-5 h-5" />
                    ) : battery.charging ? (
                      <BatteryCharging className="w-5 h-5" />
                    ) : (
                      <Battery className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {battery.supported && battery.level !== null
                        ? `${battery.level}% · ${battery.charging ? 'Charging' : 'On Battery Power'}`
                        : 'AC / Desktop Browser Power'}
                    </div>
                    <div className="text-[11px] text-white/55">
                      {battery.supported
                        ? batteryTimeEstimate
                          ? battery.charging
                            ? `${batteryTimeEstimate} until full charge`
                            : `${batteryTimeEstimate} remaining`
                          : 'Synced directly with device Battery Status API'
                        : 'Your browser does not expose hardware battery telemetry (common on Safari/Desktop).'}
                    </div>
                  </div>
                </div>
                {battery.supported && battery.level !== null && (
                  <div className="text-xl font-bold tabular-nums text-white">{battery.level}%</div>
                )}
              </div>

              {battery.supported && battery.level !== null && (
                <div className="h-2.5 rounded-full bg-black/45 overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${
                      battery.charging
                        ? 'bg-emerald-400'
                        : battery.level <= 20
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                    }`}
                    style={{ width: `${battery.level}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {section === 'account' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                Player Account
              </h2>
              <p className="text-xs text-white/55 mt-0.5">
                Manage your signed-in AltitudeMAX OS player profile.
              </p>
            </div>

            {player && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white border border-white/25 shadow shrink-0"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{player.displayName}</div>
                    <div className="text-xs text-white/60">
                      @{player.username} · {player.role === 'owner' ? 'Site Owner' : 'Player'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundFx.click();
                    onSwitchPlayer();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-sky-400" />
                  <span>Switch Player / Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {section === 'sound-windows' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                Sound & Window Management
              </h2>
              <p className="text-xs text-white/55 mt-0.5">
                Configure AltitudeMAX OS sound effects and window layout defaults.
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center">
                  {muted ? (
                    <VolumeX className="w-5 h-5 text-white/55" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">AltitudeMAX OS Sound FX</div>
                  <div className="text-[11px] text-white/55">
                    UI click feedback and built-in game sound synthesizer
                  </div>
                </div>
              </div>
              <button
                onClick={onToggleMute}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  muted ? 'bg-white/10 text-white/65' : 'bg-sky-500 text-white'
                }`}
              >
                {muted ? 'Muted' : 'Active'}
              </button>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-white">Reset Desktop Window Positions</div>
                <div className="text-[11px] text-white/55">
                  Restore default centered window coordinates and dimensions
                </div>
              </div>
              <button
                onClick={() => {
                  soundFx.click();
                  onResetWindows();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Layout</span>
              </button>
            </div>
          </div>
        )}

        {section === 'developers' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white">
                The Developers of the Site
              </h2>
              <p className="text-xs text-white/55 mt-0.5">
                Credits and build information for AltitudeMAX OS.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-red-500/15 via-slate-900/80 to-white/[0.04] border border-red-400/30 p-5 flex items-center gap-4 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 border border-white/25 flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0">
                AB
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-bold font-[family-name:var(--font-display)] text-white tracking-wide">
                  AMINE .B
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  Creator & Lead Developer · AltitudeMAX OS
                </div>
                <div className="text-[11px] text-white/45 mt-1 tabular-nums">
                  Version {osVersion} · Build {activeRelease.build}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-white/70">Inspiration & Credits</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { initials: 'HF', name: 'hamza.f', role: 'Inspiration', gradient: 'from-sky-500 to-indigo-600' },
                  { initials: 'ES', name: 'Elijah.s', role: 'Inspiration', gradient: 'from-amber-500 to-orange-600' },
                  { initials: 'ML', name: 'Matthew.L', role: 'Inspiration', gradient: 'from-emerald-500 to-teal-600' },
                ].map((person) => (
                  <div
                    key={person.name}
                    className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center gap-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${person.gradient} border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    >
                      {person.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{person.name}</div>
                      <div className="text-[11px] text-white/60">{person.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
