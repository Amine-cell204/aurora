import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ArrowRight,
  Gamepad2,
  MessageSquare,
  AudioLines,
  Youtube,
  Shield,
  Settings,
} from 'lucide-react';
import { APPS_CATALOG, AppId } from '../../types/os';

interface SpotlightModalProps {
  open: boolean;
  onClose: () => void;
  onLaunchApp: (id: AppId) => void;
}

function getAppIcon(id: AppId) {
  switch (id) {
    case 'comm':
      return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    case 'soundcloud':
      return <AudioLines className="w-4 h-4 text-orange-400" />;
    case 'youtube':
      return <Youtube className="w-4 h-4 text-rose-400" />;
    case 'browser':
      return <Shield className="w-4 h-4 text-[#fb542b]" />;
    case 'settings':
      return <Settings className="w-4 h-4 text-slate-300" />;
    default:
      return <Gamepad2 className="w-4 h-4 text-amber-400" />;
  }
}

export function SpotlightModal({ open, onClose, onLaunchApp }: SpotlightModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all = Object.values(APPS_CATALOG);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (app) =>
        app.title.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[14vh] px-4 bg-black/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-900/85 backdrop-blur-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-5 h-5 text-white/60 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.min(items.length - 1, prev + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.max(0, prev - 1));
              }
              if (e.key === 'Enter' && items[selectedIdx]) {
                onLaunchApp(items[selectedIdx].id);
                onClose();
              }
            }}
            placeholder="Search Games, Brave, SoundCloud, YouTube, or Settings..."
            className="w-full bg-transparent text-white placeholder-white/40 text-base outline-none"
          />
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white px-2 py-1 rounded-md bg-white/5 border border-white/10 whitespace-nowrap shrink-0"
          >
            Esc
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto os-scroll divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-white/50">
              No matching apps or games found.
            </div>
          ) : (
            items.map((app, index) => (
              <button
                key={app.id}
                onClick={() => {
                  onLaunchApp(app.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIdx(index)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIdx ? 'bg-white/12' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    {getAppIcon(app.id)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{app.title}</div>
                    <div className="text-xs text-white/50 truncate">{app.description}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
