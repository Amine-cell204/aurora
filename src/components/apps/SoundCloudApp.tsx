import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Search,
  Play,
  Heart,
  ListPlus,
  SkipBack,
  SkipForward,
  Flame,
  Disc3,
  User,
  Link2,
  Loader2,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';
import { SoundCloudItem } from '../../types/os';
import { soundFx } from '../../utils/sound';

const CHART_GENRES = [
  { id: 'all-music', label: 'Featured' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'hiphoprap', label: 'Hip-Hop & Rap' },
  { id: 'ambient', label: 'Lo-Fi / Ambient' },
  { id: 'danceedm', label: 'Dance & EDM' },
  { id: 'indie', label: 'Indie' },
];

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return 'Stream';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPlays(n: number): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M plays`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K plays`;
  return `${n} plays`;
}

interface PlayerSlotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SoundCloudAppProps {
  pausedByHide?: boolean;
  currentItem: SoundCloudItem | null;
  onSelectTrack: (item: SoundCloudItem | null) => void;
  visualPlayer: boolean;
  onToggleVisualPlayer: () => void;
  onPlayerSlotRectChange: (rect: PlayerSlotRect | null) => void;
}

export function SoundCloudApp({
  pausedByHide = false,
  currentItem,
  onSelectTrack,
  visualPlayer,
  onToggleVisualPlayer,
  onPlayerSlotRectChange,
}: SoundCloudAppProps) {
  const [section, setSection] = useState<'charts' | 'search' | 'library'>('charts');
  const [genre, setGenre] = useState('all-music');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchKind, setSearchKind] = useState<'tracks' | 'playlists' | 'users'>('tracks');
  const [items, setItems] = useState<SoundCloudItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [queue, setQueue] = useState<SoundCloudItem[]>([]);
  const slotRef = useRef<HTMLDivElement>(null);

  const [likes, setLikes] = useState<SoundCloudItem[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_sc_likes');
      return saved ? (JSON.parse(saved) as SoundCloudItem[]) : [];
    } catch {
      return [];
    }
  });

  const [hiddenUrls, setHiddenUrls] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_sc_hidden');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [urlError, setUrlError] = useState('');

  const loadCharts = async (g: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/soundcloud/charts?genre=${encodeURIComponent(g)}`);
      const data = (await res.json()) as { items?: SoundCloudItem[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharts('all-music');
  }, []);

  const handleSearchOrUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    const q = searchQuery.trim();
    if (!q) return;

    if (/^https?:\/\/(www\.|m\.)?soundcloud\.com\//i.test(q)) {
      setLoading(true);
      try {
        const res = await fetch(`/api/soundcloud/resolve?url=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { item?: SoundCloudItem; error?: string };
        if (data.item) {
          soundFx.click();
          onSelectTrack(data.item);
          setSearchQuery('');
        } else {
          setUrlError(data.error || 'Could not resolve SoundCloud URL');
        }
      } catch {
        setUrlError('Could not resolve SoundCloud URL');
      } finally {
        setLoading(false);
      }
      return;
    }

    setSection('search');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/soundcloud/search?q=${encodeURIComponent(q)}&kind=${encodeURIComponent(searchKind)}`
      );
      const data = (await res.json()) as { items?: SoundCloudItem[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const runKindSearch = async (kind: 'tracks' | 'playlists' | 'users') => {
    setSearchKind(kind);
    const q = searchQuery.trim() || 'synthwave gaming';
    setLoading(true);
    try {
      const res = await fetch(
        `/api/soundcloud/search?q=${encodeURIComponent(q)}&kind=${encodeURIComponent(kind)}`
      );
      const data = (await res.json()) as { items?: SoundCloudItem[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const playItem = (item: SoundCloudItem) => {
    soundFx.click();
    onSelectTrack(item);
  };

  const stopAndClearPlayer = () => {
    soundFx.click();
    onSelectTrack(null);
  };

  const toggleLike = (item: SoundCloudItem) => {
    soundFx.click();
    setLikes((prev) => {
      const exists = prev.some((x) => x.permalinkUrl === item.permalinkUrl);
      const next = exists
        ? prev.filter((x) => x.permalinkUrl !== item.permalinkUrl)
        : [item, ...prev];
      localStorage.setItem('aurora_sc_likes', JSON.stringify(next));
      return next;
    });
  };

  const removeTrackEverywhere = (item: SoundCloudItem) => {
    soundFx.click();
    if (section === 'library') {
      setLikes((prev) => {
        const next = prev.filter((x) => x.permalinkUrl !== item.permalinkUrl);
        localStorage.setItem('aurora_sc_likes', JSON.stringify(next));
        return next;
      });
    } else {
      setHiddenUrls((prev) => {
        if (prev.includes(item.permalinkUrl)) return prev;
        const next = [...prev, item.permalinkUrl];
        localStorage.setItem('aurora_sc_hidden', JSON.stringify(next));
        return next;
      });
    }
    setQueue((prev) => prev.filter((q) => q.permalinkUrl !== item.permalinkUrl));
    if (currentItem?.permalinkUrl === item.permalinkUrl) {
      onSelectTrack(null);
    }
  };

  const restoreHiddenTracks = () => {
    soundFx.click();
    setHiddenUrls([]);
    localStorage.removeItem('aurora_sc_hidden');
  };

  const addToQueue = (item: SoundCloudItem) => {
    soundFx.click();
    setQueue((prev) =>
      prev.some((q) => q.permalinkUrl === item.permalinkUrl) ? prev : [...prev, item]
    );
  };

  const removeFromQueue = (permalinkUrl: string) => {
    soundFx.click();
    setQueue((prev) => prev.filter((q) => q.permalinkUrl !== permalinkUrl));
  };

  const visibleItems = useMemo(
    () => items.filter((item) => !hiddenUrls.includes(item.permalinkUrl)),
    [items, hiddenUrls]
  );

  const displayedList = section === 'library' ? likes : visibleItems;

  const stepTrack = (dir: 1 | -1) => {
    const pool = queue.length > 0 ? queue : displayedList;
    if (!pool.length) return;
    const idx = currentItem
      ? pool.findIndex((i) => i.permalinkUrl === currentItem.permalinkUrl)
      : -1;
    const nextIdx = idx === -1 ? 0 : (idx + dir + pool.length) % pool.length;
    playItem(pool[nextIdx]);
  };

  // Sync the player slot coordinates so the persistent SoundCloud iframe stays aligned
  useEffect(() => {
    if (!currentItem || pausedByHide) {
      onPlayerSlotRectChange(null);
      return;
    }

    let rafId = 0;
    let lastKey = '';

    const measure = () => {
      const el = slotRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) {
          const top = Math.round(r.top);
          const left = Math.round(r.left);
          const width = Math.round(r.width);
          const height = Math.round(r.height);
          const key = `${top},${left},${width},${height}`;
          if (key !== lastKey) {
            lastKey = key;
            onPlayerSlotRectChange({ top, left, width, height });
          }
        } else if (lastKey !== 'empty') {
          lastKey = 'empty';
          onPlayerSlotRectChange(null);
        }
      }
      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(rafId);
      onPlayerSlotRectChange(null);
    };
  }, [currentItem, pausedByHide, onPlayerSlotRectChange]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#18120e] via-[#0e0f14] to-[#08090d] text-white">
      {/* Top SoundCloud Header & Search */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-[#ff5500] flex items-center justify-center text-white shadow-md">
              <AudioLines className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">SoundCloud</h2>
              <p className="text-[11px] text-white/55 hidden sm:block">
                Full tracks, charts, playlists & artists
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearchOrUrl}
            className="flex-1 min-w-[200px] max-w-xl flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/12 focus-within:border-[#ff5500]/80">
              <Search className="w-4 h-4 text-white/45 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SoundCloud or paste soundcloud.com URL..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-white text-xs font-semibold transition-colors shrink-0"
            >
              Go
            </button>
          </form>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/8 border border-white/10 shrink-0">
            <button
              onClick={() => {
                setSection('charts');
                loadCharts(genre);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                section === 'charts' ? 'bg-[#ff5500] text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Charts</span>
            </button>
            <button
              onClick={() => {
                setSection('search');
                if (!searchQuery.trim()) runKindSearch(searchKind);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                section === 'search' ? 'bg-[#ff5500] text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setSection('library')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                section === 'library'
                  ? 'bg-[#ff5500] text-white'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Likes ({likes.length})
            </button>
          </div>
        </div>

        {urlError && <p className="text-[11px] text-rose-400">{urlError}</p>}

        {/* Sub-filters */}
        {section === 'charts' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 os-scroll">
              {CHART_GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGenre(g.id);
                    loadCharts(g.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    genre === g.id
                      ? 'bg-white text-slate-950'
                      : 'bg-white/8 text-white/75 hover:bg-white/14 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {hiddenUrls.length > 0 && (
              <button
                onClick={restoreHiddenTracks}
                className="text-[11px] text-white/55 hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Restore removed tracks"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore ({hiddenUrls.length})</span>
              </button>
            )}
          </div>
        )}

        {section === 'search' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(['tracks', 'playlists', 'users'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runKindSearch(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    searchKind === k
                      ? 'bg-white text-slate-950'
                      : 'bg-white/8 text-white/75 hover:bg-white/14'
                  }`}
                >
                  {k === 'users' ? 'Artists' : k}
                </button>
              ))}
            </div>
            {hiddenUrls.length > 0 && (
              <button
                onClick={restoreHiddenTracks}
                className="text-[11px] text-white/55 hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore ({hiddenUrls.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Track / Chart / Search List */}
        <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-3 space-y-1.5">
          {loading ? (
            <div className="h-40 flex items-center justify-center gap-2 text-xs text-white/65">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff5500]" />
              <span>Loading SoundCloud catalog...</span>
            </div>
          ) : displayedList.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-xs text-white/55 text-center px-4">
              <p>
                {section === 'library'
                  ? 'No liked tracks yet. Click the heart on any track to save it here.'
                  : 'No SoundCloud results shown. Try searching or restoring hidden tracks.'}
              </p>
            </div>
          ) : (
            displayedList.map((item) => {
              const active = currentItem?.permalinkUrl === item.permalinkUrl;
              const liked = likes.some((x) => x.permalinkUrl === item.permalinkUrl);

              return (
                <div
                  key={`${item.id}-${item.permalinkUrl}`}
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                    active
                      ? 'bg-[#ff5500]/16 border-[#ff5500]/55'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/10'
                  }`}
                >
                  <button
                    onClick={() => playItem(item)}
                    className="flex-1 flex items-center gap-3 min-w-0 text-left"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-orange-500/30 to-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                      {item.artwork ? (
                        <img
                          src={item.artwork}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : item.kind === 'user' ? (
                        <User className="w-5 h-5 text-orange-300" />
                      ) : (
                        <Disc3 className="w-5 h-5 text-orange-300" />
                      )}
                      <div
                        className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                          active ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                        }`}
                      >
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-white/55 truncate mt-0.5">
                        {item.artist}
                        {item.genre ? ` · ${item.genre}` : ''}
                        {item.playbackCount > 0 ? ` · ${formatPlays(item.playbackCount)}` : ''}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {item.durationMs > 0 && (
                      <span className="text-[11px] text-white/45 font-mono tabular-nums hidden sm:inline mr-1">
                        {formatDuration(item.durationMs)}
                      </span>
                    )}
                    <button
                      onClick={() => toggleLike(item)}
                      className={`p-2 rounded-lg transition-colors ${
                        liked
                          ? 'text-[#ff5500] bg-[#ff5500]/15'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                      aria-label={liked ? 'Remove from likes' : 'Like track'}
                      title={liked ? 'Unlike' : 'Like'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => addToQueue(item)}
                      className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Add to Up Next queue"
                      title="Add to queue"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeTrackEverywhere(item)}
                      className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      aria-label={`Remove ${item.title}`}
                      title="Remove track"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right / Bottom Full SoundCloud Widget & Queue Panel */}
        <aside className="lg:w-[400px] border-t lg:border-t-0 lg:border-l border-white/10 bg-black/35 p-3 flex flex-col gap-3 shrink-0">
          {currentItem ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#ff5500]">Now Playing</div>
                  <div className="text-xs font-semibold text-white truncate">
                    {currentItem.title}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => stepTrack(-1)}
                    className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/80"
                    aria-label="Previous"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => stepTrack(1)}
                    className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/80"
                    aria-label="Next"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onToggleVisualPlayer}
                    className="px-2 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-[11px] text-white/75"
                  >
                    {visualPlayer ? 'Waveform' : 'Artwork'}
                  </button>
                  <button
                    onClick={stopAndClearPlayer}
                    className="p-1.5 rounded-lg bg-white/8 hover:bg-rose-500/25 text-white/70 hover:text-rose-300"
                    aria-label="Stop and close track"
                    title="Stop & remove from player"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={slotRef}
                className="w-full h-[180px] sm:h-[200px] lg:h-[250px] rounded-xl overflow-hidden border border-white/12 bg-black/60 flex items-center justify-center text-[11px] text-white/45"
              >
                {pausedByHide ? 'Paused in Hide Mode' : 'Loading SoundCloud player...'}
              </div>
            </>
          ) : (
            <div className="h-[180px] lg:h-[270px] rounded-xl border border-dashed border-white/15 bg-white/[0.03] flex flex-col items-center justify-center p-5 text-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
                <AudioLines className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-white">Player Idle</div>
              <p className="text-[11px] text-white/55 max-w-xs">
                Click any track, playlist, or artist on the left — or paste a soundcloud.com URL —
                to start streaming.
              </p>
            </div>
          )}

          {/* Up Next Queue */}
          <div className="hidden lg:flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between text-xs font-semibold text-white/70 mb-1.5">
              <span>Up Next Queue ({queue.length})</span>
              {queue.length > 0 && (
                <button
                  onClick={() => setQueue([])}
                  className="text-[11px] text-white/45 hover:text-white flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto os-scroll space-y-1">
              {queue.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-[11px] text-white/50 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-[#ff5500] shrink-0" />
                  <span>Click + on any track to build your queue, or × to remove tracks.</span>
                </div>
              ) : (
                queue.map((qItem, idx) => (
                  <div
                    key={`${qItem.permalinkUrl}-${idx}`}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/10"
                  >
                    <button
                      onClick={() => playItem(qItem)}
                      className="min-w-0 flex-1 text-left flex items-center gap-2"
                    >
                      <Play className="w-3 h-3 text-[#ff5500] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{qItem.title}</div>
                        <div className="text-[10px] text-white/50 truncate">{qItem.artist}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => removeFromQueue(qItem.permalinkUrl)}
                      className="p-1 rounded text-white/40 hover:text-rose-400"
                      aria-label={`Remove ${qItem.title} from queue`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
