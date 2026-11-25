import {
  Gamepad2,
  MessageSquare,
  AudioLines,
  Youtube,
  Shield,
  Settings,
} from 'lucide-react';
import { AppId } from '../../types/os';

interface AppIconProps {
  id: AppId;
  size?: 'sm' | 'md' | 'lg';
}

const ICON_THEMES: Record<AppId, { bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  games: {
    bg: 'from-amber-400 via-orange-500 to-rose-600',
    icon: Gamepad2,
  },
  comm: {
    bg: 'from-emerald-400 via-teal-500 to-cyan-700',
    icon: MessageSquare,
  },
  soundcloud: {
    bg: 'from-orange-400 via-[#ff5500] to-red-600',
    icon: AudioLines,
  },
  youtube: {
    bg: 'from-rose-500 via-red-600 to-red-700',
    icon: Youtube,
  },
  browser: {
    bg: 'from-orange-500 via-[#fb542b] to-rose-600',
    icon: Shield,
  },
  settings: {
    bg: 'from-slate-400 via-slate-600 to-zinc-800',
    icon: Settings,
  },
};

export function AppIcon({ id, size = 'md' }: AppIconProps) {
  const theme = ICON_THEMES[id];
  const Icon = theme.icon;

  const boxSize =
    size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-[14px]';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';

  return (
    <div
      className={`relative ${boxSize} bg-gradient-to-br ${theme.bg} flex items-center justify-center shadow-lg shadow-black/35 border border-white/25 overflow-hidden shrink-0`}
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      <Icon className={`${iconSize} text-white drop-shadow-sm relative z-10`} />
    </div>
  );
}
