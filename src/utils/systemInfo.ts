import { useEffect, useState } from 'react';
import { ClockPrefs, WallpaperId } from '../types/os';

export interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface BatteryState {
  supported: boolean;
  loading: boolean;
  level: number | null;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManagerLike>;
  }
}

export function useBatteryStatus(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    supported: typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function',
    loading: typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function',
    level: null,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: Infinity,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') {
      setState({
        supported: false,
        loading: false,
        level: null,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: Infinity,
      });
      return;
    }

    let active = true;
    let batteryRef: BatteryManagerLike | null = null;

    const sync = (bat: BatteryManagerLike) => {
      if (!active) return;
      setState({
        supported: true,
        loading: false,
        level: Math.min(100, Math.max(0, Math.round(bat.level * 100))),
        charging: bat.charging,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime,
      });
    };

    const handleEvent = () => {
      if (batteryRef) sync(batteryRef);
    };

    navigator
      .getBattery()
      .then((bat) => {
        if (!active) return;
        batteryRef = bat;
        sync(bat);
        bat.addEventListener('levelchange', handleEvent);
        bat.addEventListener('chargingchange', handleEvent);
        bat.addEventListener('chargingtimechange', handleEvent);
        bat.addEventListener('dischargingtimechange', handleEvent);
      })
      .catch(() => {
        if (!active) return;
        setState({
          supported: false,
          loading: false,
          level: null,
          charging: false,
          chargingTime: Infinity,
          dischargingTime: Infinity,
        });
      });

    return () => {
      active = false;
      if (batteryRef) {
        batteryRef.removeEventListener('levelchange', handleEvent);
        batteryRef.removeEventListener('chargingchange', handleEvent);
        batteryRef.removeEventListener('chargingtimechange', handleEvent);
        batteryRef.removeEventListener('dischargingtimechange', handleEvent);
      }
    };
  }, []);

  return state;
}

export function formatDurationSeconds(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const totalMins = Math.round(seconds / 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function useSystemClock(prefs: ClockPrefs) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeFormatted = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: prefs.showSeconds ? '2-digit' : undefined,
    hour12: !prefs.use24Hour,
  });

  const dateFormatted = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const fullDateFormatted = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timeWithSeconds = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: !prefs.use24Hour,
  });

  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Local Time';

  return {
    now,
    menuBarText: prefs.showDate ? `${dateFormatted}  ${timeFormatted}` : timeFormatted,
    timeFormatted,
    timeWithSeconds,
    dateFormatted,
    fullDateFormatted,
    timeZone,
  };
}

export interface OsVersionRelease {
  version: string;
  codename: string;
  build: string;
  channel: 'Stable' | 'Beta' | 'Legacy';
  releaseDate: string;
  sizeLabel: string;
  highlights: string[];
}

export const OS_VERSIONS: OsVersionRelease[] = [
  {
    version: '2.6.0-beta',
    codename: 'Aurora Prism Preview',
    build: '26C09b',
    channel: 'Beta',
    releaseDate: 'Nov 2026',
    sizeLabel: '148 MB',
    highlights: [
      'Experimental ultra-deep frosted window refraction',
      'Enhanced Brave Live Web Proxy form & SPA navigation',
      'Low-latency frame pacing for Space Nova & Highway Drift',
    ],
  },
  {
    version: '2.5.0',
    codename: 'Sequoia Liquid Glass',
    build: '25B118',
    channel: 'Stable',
    releaseDate: 'Nov 2026',
    sizeLabel: '112 MB',
    highlights: [
      'Live Battery Status percentage & charging telemetry in Menu Bar',
      'Second-accurate local clock with 24-hour & date customization',
      'Custom wallpaper uploader, dim/blur controls & 2 new dark themes',
    ],
  },
  {
    version: '2.4.0',
    codename: 'Brave & SoundCloud Edition',
    build: '24A335',
    channel: 'Legacy',
    releaseDate: 'Oct 2026',
    sizeLabel: '94 MB',
    highlights: [
      'Full SoundCloud streaming with genre charts, queue & track hiding',
      'Brave Browser with real web search & live visual proxy',
      '9 built-in arcade and puzzle games',
    ],
  },
  {
    version: '2.3.1',
    codename: 'Sonoma Glass Core',
    build: '23G92',
    channel: 'Legacy',
    releaseDate: 'Sep 2026',
    sizeLabel: '78 MB',
    highlights: [
      'Initial macOS-inspired window manager & magnifying Dock',
      'Spotlight search (⌘K) and responsive mobile home grid',
    ],
  },
];

export const WALLPAPER_OPTIONS: Array<{
  id: Exclude<WallpaperId, 'custom'>;
  label: string;
  subtitle: string;
  swatch: string;
  previewImage?: string;
}> = [
  {
    id: 'aurora',
    label: 'Aurora Silk',
    subtitle: 'Signature cosmic horizon',
    swatch: 'from-indigo-500 via-teal-400 to-amber-400',
    previewImage: '/src/assets/images/wallpaper_macos_aurora_1795490525340.jpg',
  },
  {
    id: 'midnight',
    label: 'Midnight Glass',
    subtitle: 'Deep cobalt & cyan aura',
    swatch: 'from-sky-500 to-indigo-700',
  },
  {
    id: 'emerald',
    label: 'Deep Emerald',
    subtitle: 'Northern forest prism',
    swatch: 'from-emerald-400 to-cyan-700',
  },
  {
    id: 'sunset',
    label: 'Twilight Coral',
    subtitle: 'Warm amber & rose dusk',
    swatch: 'from-orange-500 to-rose-700',
  },
  {
    id: 'obsidian',
    label: 'Obsidian Prism',
    subtitle: 'OLED graphite & violet glow',
    swatch: 'from-zinc-700 via-violet-700 to-fuchsia-600',
  },
  {
    id: 'nordic',
    label: 'Nordic Frost',
    subtitle: 'Cool glacial slate blue',
    swatch: 'from-slate-500 via-sky-600 to-blue-900',
  },
];
