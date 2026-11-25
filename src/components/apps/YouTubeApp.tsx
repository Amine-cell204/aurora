import { useEffect, useState } from 'react';
import { Search, Play, Maximize2, Minimize2, Youtube, Loader2 } from 'lucide-react';
import { soundFx } from '../../utils/sound';

interface VideoItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
}

const CATEGORIES = [
  { label: 'Gaming', query: 'minecraft roblox gameplay no commentary' },
  { label: 'Lo-Fi Radio', query: 'lofi hip hop radio beats' },
  { label: 'Speedruns', query: 'world record speedrun progression' },
  { label: 'Synthwave', query: 'synthwave chillwave mix' },
  { label: 'Tech & OS', query: 'macOS setup desk tour' },
];

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

interface YouTubeAppProps {
  pausedByHide?: boolean;
}

export function YouTubeApp({ pausedByHide = false }: YouTubeAppProps) {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoItem>({
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to',
    channel: 'Lofi Girl',
    duration: 'LIVE',
    views: 'Live stream',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  });
  const [loading, setLoading] = useState(false);
  const [theater, setTheater] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Gaming');

  const searchYouTube = async (term: string) => {
    const maybeId = extractYouTubeId(term);
    if (maybeId) {
      soundFx.click();
      setCurrentVideo({
        id: maybeId,
        title: `YouTube Video (${maybeId})`,
        channel: 'Direct Video Link',
        duration: 'Watch',
        views: 'Loaded by URL',
        thumbnail: `https://i.ytimg.com/vi/${maybeId}/hqdefault.jpg`,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(term)}`);
      const data = (await res.json()) as { results?: VideoItem[] };
      if (data.results && data.results.length > 0) {
        setVideos(data.results);
      }
    } catch {
      // Keep current list on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchYouTube(CATEGORIES[0].query);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0b0d12] text-white">
      {/* Top Search & Category Bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <Youtube className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold hidden sm:inline">YouTube</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) searchYouTube(query.trim());
            }}
            className="flex-1 flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/12 focus-within:border-red-500/70">
              <Search className="w-4 h-4 text-white/45 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search YouTube or paste any video URL / ID..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          <button
            onClick={() => setTheater((t) => !t)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/10 text-xs text-white/80 shrink-0"
            title="Toggle Theater View"
          >
            {theater ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{theater ? 'Split' : 'Theater'}</span>
          </button>
        </div>

        {/* Category Pills -> Clean Interactive Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 os-scroll">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => {
                  setActiveCategory(cat.label);
                  setQuery('');
                  searchYouTube(cat.query);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white text-slate-950'
                    : 'bg-white/8 text-white/75 hover:bg-white/14 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 min-h-0 flex flex-col ${
          theater ? '' : 'lg:flex-row'
        } overflow-hidden`}
      >
        {/* Video Player Area */}
        <div
          className={`flex flex-col p-3 sm:p-4 shrink-0 ${
            theater ? 'flex-1 min-h-0' : 'lg:flex-1 min-h-0'
          }`}
        >
          <div className="w-full aspect-video lg:flex-1 lg:aspect-auto rounded-xl overflow-hidden bg-black border border-white/12 shadow-xl">
            {!pausedByHide && (
              <iframe
                key={currentVideo.id}
                title={currentVideo.title}
                src={`https://www.youtube-nocookie.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )}
          </div>

          <div className="mt-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-1">
                {currentVideo.title}
              </h3>
              <p className="text-xs text-white/55 mt-0.5">
                {currentVideo.channel} · {currentVideo.views}
              </p>
            </div>
          </div>
        </div>

        {/* Queue / Search Results */}
        <aside
          className={`${
            theater
              ? 'h-48 border-t border-white/10'
              : 'flex-1 lg:flex-none lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10'
          } overflow-y-auto os-scroll p-3 space-y-2`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-white/70">Up Next & Results</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />}
          </div>

          {videos.map((v) => {
            const active = currentVideo.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  soundFx.click();
                  setCurrentVideo(v);
                }}
                className={`w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-colors ${
                  active
                    ? 'bg-red-500/15 border-red-500/45'
                    : 'bg-white/[0.03] border-white/8 hover:bg-white/10'
                }`}
              >
                <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                    {v.duration}
                  </span>
                  {active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white line-clamp-2 leading-snug">
                    {v.title}
                  </div>
                  <div className="text-[11px] text-white/50 truncate mt-1">{v.channel}</div>
                  <div className="text-[11px] text-white/40 truncate">{v.views}</div>
                </div>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
