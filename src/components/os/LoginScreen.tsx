import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  UserPlus,
  Users,
} from 'lucide-react';
import { AuroraLogo } from './AuroraLogo';
import { AuthStatus, ClockPrefs, PlayerProfile } from '../../types/os';
import { useBatteryStatus, useSystemClock } from '../../utils/systemInfo';
import { soundFx } from '../../utils/sound';

interface LoginScreenProps {
  osVersion: string;
  clockPrefs: ClockPrefs;
  authStatus: AuthStatus | null;
  loadingStatus: boolean;
  onPlayerAuthenticated: (token: string, player: PlayerProfile) => void;
  onToggleClassroom: () => void;
}

const AVATAR_COLORS = [
  { hex: '#ef4444', label: 'Crimson' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Rose' },
];

export function LoginScreen({
  osVersion,
  clockPrefs,
  authStatus,
  loadingStatus,
  onPlayerAuthenticated,
  onToggleClassroom,
}: LoginScreenProps) {
  const clock = useSystemClock(clockPrefs);
  const battery = useBatteryStatus();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#ef4444');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPlayerPass, setShowPlayerPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authStatus && authStatus.playerCount === 0) {
      setMode('register');
    }
  }, [authStatus]);

  const handlePlayerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Enter your player username.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? {
              username: trimmedUser,
              displayName: displayName.trim() || trimmedUser,
              avatarColor,
              password,
            }
          : {
              username: trimmedUser,
              password,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        token?: string;
        player?: PlayerProfile;
        error?: string;
      };
      if (!res.ok || !data.token || !data.player) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      soundFx.win();
      setPassword('');
      setConfirmPassword('');
      onPlayerAuthenticated(data.token, data.player);
    } catch {
      setError('Network error during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 bg-slate-950/45 backdrop-blur-xl select-none overflow-y-auto os-scroll">
      {/* Lock Screen Top Status */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-white/85 shrink-0">
        <div className="flex items-center gap-2.5">
          <AuroraLogo size="sm" showVersion={osVersion} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleClassroom}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/12 text-white/85 transition-colors"
            title="Classroom Hide Mode (Press Ctrl)"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-[11px]">Ctrl</span>
          </button>

          {battery.supported && battery.level !== null && (
            <span className="text-[11px] font-medium tabular-nums text-white/80">
              {battery.level}%{battery.charging ? ' ⚡' : ''}
            </span>
          )}
          <span className="text-[11px] font-medium tabular-nums text-white/90">
            {clock.menuBarText}
          </span>
        </div>
      </div>

      {/* Center Player Login Card */}
      <div className="my-auto py-6 flex flex-col items-center justify-center">
        <div className="text-center mb-5 space-y-1">
          <div className="text-4xl sm:text-5xl font-bold font-[family-name:var(--font-display)] tracking-tight text-white tabular-nums drop-shadow-lg">
            {clock.timeFormatted}
          </div>
          <div className="text-xs sm:text-sm text-white/75 drop-shadow">
            {clock.fullDateFormatted}
          </div>
        </div>

        <div className="w-full max-w-md rounded-3xl bg-slate-950/80 backdrop-blur-2xl border border-white/16 shadow-[0_24px_80px_rgba(0,0,0,0.65)] p-6 sm:p-7 text-white space-y-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <AuroraLogo size="md" showVersion={`v${osVersion}`} />
            <span className="text-[11px] font-medium text-white/60">Player Sign In</span>
          </div>

          {loadingStatus ? (
            <div className="py-8 text-center text-xs text-white/65">
              Loading AltitudeMAX OS...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sign In / Create Account Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setError('');
                    setMode('login');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'login'
                      ? 'bg-white/15 text-white shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Player Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setError('');
                    setMode('register');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mode === 'register'
                      ? 'bg-white/15 text-white shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              <form onSubmit={handlePlayerAuth} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-white/65 mb-1">
                    Player Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. amine_b"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-sky-400 text-xs text-white placeholder-white/35 outline-none transition-colors"
                  />
                </div>

                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/65 mb-1">
                        Display Name (optional)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Shown in AltitudeMAX OS menu bar"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-sky-400 text-xs text-white placeholder-white/35 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-white/65 mb-1.5">
                        Avatar Badge Color
                      </div>
                      <div className="flex items-center gap-2">
                        {AVATAR_COLORS.map((c) => {
                          const selected = avatarColor === c.hex;
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setAvatarColor(c.hex)}
                              title={c.label}
                              aria-label={c.label}
                              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-transform ${
                                selected
                                  ? 'border-white scale-110 shadow-md'
                                  : 'border-white/25 opacity-75 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            >
                              {selected && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-white/65 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPlayerPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === 'register' ? 'Create password (min 4 chars)' : 'Your password'
                      }
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-black/45 border border-white/15 focus:border-sky-400 text-xs text-white placeholder-white/35 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPlayerPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/85"
                      aria-label={showPlayerPass ? 'Hide password' : 'Show password'}
                    >
                      {showPlayerPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-medium text-white/65 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPlayerPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-sky-400 text-xs text-white placeholder-white/35 outline-none transition-colors"
                    />
                  </div>
                )}

                {error && (
                  <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <span>
                    {submitting
                      ? 'Signing In...'
                      : mode === 'register'
                        ? 'Create Account & Enter OS'
                        : 'Sign In to AltitudeMAX OS'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-2 border-t border-white/10 text-[11px] text-white/50 text-center">
                {authStatus?.playerCount
                  ? `${authStatus.playerCount} registered player${
                      authStatus.playerCount === 1 ? '' : 's'
                    }`
                  : 'Create your player profile to enter AltitudeMAX OS'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-[11px] text-white/45 shrink-0">
        AltitudeMAX OS · Player Desktop
      </div>
    </div>
  );
}
