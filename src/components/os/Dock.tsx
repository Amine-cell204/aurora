import { useState } from 'react';
import { APPS_CATALOG, AppId, WindowState } from '../../types/os';
import { AppIcon } from './AppIcon';

interface DockProps {
  windows: Record<AppId, WindowState>;
  activeAppId: AppId | null;
  onDockClick: (id: AppId) => void;
  isMobile: boolean;
  unreadCommCount?: number;
}

const DOCK_ORDER: AppId[] = ['games', 'comm', 'soundcloud', 'youtube', 'browser', 'settings'];
const MOBILE_DOCK_ORDER: AppId[] = ['games', 'comm', 'soundcloud', 'youtube', 'browser', 'settings'];

export function Dock({ windows, activeAppId, onDockClick, isMobile, unreadCommCount = 0 }: DockProps) {
  const [hoveredId, setHoveredId] = useState<AppId | null>(null);

  const extraOpenGames = (Object.keys(windows) as AppId[]).filter(
    (id) => !DOCK_ORDER.includes(id) && windows[id].isOpen
  );

  if (isMobile) {
    return (
      <nav
        aria-label="App Switcher"
        className="fixed bottom-0 inset-x-0 z-50 h-14 px-1.5 bg-slate-950/85 backdrop-blur-2xl border-t border-white/15 grid grid-cols-6 items-center"
      >
        {MOBILE_DOCK_ORDER.map((id) => {
          const meta = APPS_CATALOG[id];
          const isActive = activeAppId === id && windows[id].isOpen && !windows[id].isMinimized;
          const badge = id === 'comm' ? unreadCommCount : 0;
          return (
            <button
              key={id}
              onClick={() => onDockClick(id)}
              className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                isActive ? 'text-white bg-white/10' : 'text-white/65 hover:text-white'
              }`}
            >
              <div className="relative">
                <AppIcon id={id} size="sm" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-[54px]">
                {meta.shortTitle}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  const allDockApps = [...DOCK_ORDER, ...extraOpenGames];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="flex items-end gap-2.5 px-3 py-2 rounded-2xl bg-slate-950/50 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/50">
        {allDockApps.map((id) => {
          const meta = APPS_CATALOG[id];
          const win = windows[id];
          const isRunning = win.isOpen;
          const isHovered = hoveredId === id;
          const badge = id === 'comm' ? unreadCommCount : 0;

          return (
            <div key={id} className="relative flex flex-col items-center">
              {isHovered && (
                <div className="absolute -top-9 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap shadow-lg pointer-events-none">
                  {meta.shortTitle}
                </div>
              )}

              <button
                onClick={() => onDockClick(id)}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`Open ${meta.title}`}
                className="group relative transition-transform duration-150 ease-out origin-bottom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
                style={{
                  transform: isHovered ? 'translateY(-6px) scale(1.18)' : 'translateY(0) scale(1)',
                }}
              >
                <AppIcon id={id} size="md" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 border-2 border-slate-950 text-[10px] font-bold text-slate-950 flex items-center justify-center shadow">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>

              <div
                className={`mt-1 w-1 h-1 rounded-full transition-opacity duration-150 ${
                  isRunning ? 'bg-white/90 opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
