import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Maximize2,
  Play,
  RotateCw,
  Search,
  Globe,
} from 'lucide-react';
import { soundFx } from '../../utils/sound';

type GameCategory =
  | 'All'
  | 'Multiplayer'
  | 'Racing'
  | 'Action'
  | 'Arcade'
  | 'Puzzle'
  | 'Story';

interface GameEntry {
  id: string;
  title: string;
  category: Exclude<GameCategory, 'All'>;
  subtitle: string;
  url: string;
  gradient: string;
  cover?: string;
}

const GAMES_CATALOG: GameEntry[] = [
  {
    id: 'fnaf',
    title: "Five Nights at Freddy's (FNAF)",
    category: 'Action',
    subtitle: 'HTML5 web survival horror · Monitor security cameras, manage power & survive till 6 AM',
    url: 'https://dorukyum.github.io/FNAF-Web/',
    gradient: 'from-stone-800 via-red-950 to-black',
    cover: '/src/assets/images/cover_space_nova_1795491775110.jpg',
  },
  {
    id: 'ddlc',
    title: 'Doki Doki Literature Club! (DDLC)',
    category: 'Story',
    subtitle: 'Full Ren’Py web HTML5 visual novel · Write poems & uncover the club mystery',
    url: 'https://html5.gdata1.com/Doki%20Doki%20Literature%20Club!/',
    gradient: 'from-pink-400 via-rose-500 to-fuchsia-700',
    cover: '/src/assets/images/banner_ddlc_club_1795524978038.jpg',
  },
  {
    id: 'hexgl',
    title: 'HexGL 3D Racer',
    category: 'Racing',
    subtitle: 'Open-source WebGL HTML5 futuristic anti-gravity speed racer',
    url: 'https://hexgl.bkcore.com/play/',
    gradient: 'from-amber-500 via-orange-600 to-rose-700',
    cover: '/src/assets/images/cover_neon_drift_1795490526292.jpg',
  },
  {
    id: 'smash-karts',
    title: 'Smash Karts',
    category: 'Multiplayer',
    subtitle: '3D online multiplayer kart battle arena with rockets & powerups',
    url: 'https://smashkarts.io/',
    gradient: 'from-orange-500 via-amber-600 to-red-700',
    cover: '/src/assets/images/cover_neon_drift_1795490526292.jpg',
  },
  {
    id: 'bloxd-io',
    title: 'Bloxd.io',
    category: 'Multiplayer',
    subtitle: 'Online voxel parkour, survival, bedwars & creative multiplayer',
    url: 'https://bloxd.io/',
    gradient: 'from-sky-500 via-indigo-600 to-violet-700',
    cover: '/src/assets/images/cover_block_drop_1795491775993.jpg',
  },
  {
    id: 'krunker-io',
    title: 'Krunker.io',
    category: 'Action',
    subtitle: 'Fast-paced browser FPS with custom maps, parkour & classes',
    url: 'https://krunker.io/',
    gradient: 'from-slate-600 via-zinc-700 to-neutral-900',
    cover: '/src/assets/images/cover_space_nova_1795491775110.jpg',
  },
  {
    id: 'shell-shockers',
    title: 'Shell Shockers',
    category: 'Multiplayer',
    subtitle: '3D multiplayer egg-shooter arena with multiple weapon loadouts',
    url: 'https://shellshock.io/',
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
    cover: '/src/assets/images/cover_space_nova_1795491775110.jpg',
  },
  {
    id: 'ev-io',
    title: 'Ev.io',
    category: 'Action',
    subtitle: 'Sci-fi Halo-inspired browser arena FPS with double jumps & abilities',
    url: 'https://ev.io/',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-900',
    cover: '/src/assets/images/cover_space_nova_1795491775110.jpg',
  },
  {
    id: 'suroi-io',
    title: 'Suroi.io',
    category: 'Multiplayer',
    subtitle: 'Open-source 2D top-down battle royale HTML5 game',
    url: 'https://suroi.io/',
    gradient: 'from-emerald-500 via-green-600 to-teal-800',
    cover: '/src/assets/images/cover_prism_arcade_1795490526414.jpg',
  },
  {
    id: 'astray',
    title: 'Astray 3D Maze',
    category: 'Puzzle',
    subtitle: 'Open-source Three.js & Box2D WebGL HTML5 3D labyrinth challenge',
    url: 'https://wwwtyro.github.io/Astray/',
    gradient: 'from-indigo-500 via-violet-600 to-purple-800',
    cover: '/src/assets/images/cover_prism_arcade_1795490526414.jpg',
  },
  {
    id: 'open-hexagon',
    title: 'Open Hexagon',
    category: 'Action',
    subtitle: 'High-speed HTML5 rhythm dodge reflex challenge',
    url: 'https://openhexagon.org/',
    gradient: 'from-fuchsia-500 via-pink-600 to-rose-800',
    cover: '/src/assets/images/cover_prism_arcade_1795490526414.jpg',
  },
  {
    id: 'paper-io-2',
    title: 'Paper.io 2',
    category: 'Multiplayer',
    subtitle: 'Claim territory and cut off rivals in real-time arenas',
    url: 'https://voodoo.io/paper2',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
    cover: '/src/assets/images/cover_block_drop_1795491775993.jpg',
  },
  {
    id: 'diep-io',
    title: 'Diep.io',
    category: 'Multiplayer',
    subtitle: 'Upgradeable tank arena combat & shape farming multiplayer',
    url: 'https://diep.io/',
    gradient: 'from-sky-500 via-cyan-600 to-teal-800',
    cover: '/src/assets/images/banner_street_hoops_1795524978774.jpg',
  },
  {
    id: 'skribbl-io',
    title: 'Skribbl.io',
    category: 'Multiplayer',
    subtitle: 'Online multiplayer drawing & word-guessing party rooms',
    url: 'https://skribbl.io/',
    gradient: 'from-amber-400 via-yellow-500 to-orange-600',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'official-2048',
    title: '2048 (Original HTML5)',
    category: 'Puzzle',
    subtitle: 'Official Gabriele Cirulli open-source HTML5 tile-merging classic',
    url: 'https://gabrielecirulli.github.io/2048/',
    gradient: 'from-amber-500 via-yellow-600 to-orange-700',
    cover: '/src/assets/images/cover_block_drop_1795491775993.jpg',
  },
  {
    id: 'react-tetris',
    title: 'Tetris (HTML5 Build)',
    category: 'Puzzle',
    subtitle: 'Open-source classic block-stacking HTML5 build with sound & keyboard controls',
    url: 'https://chvin.github.io/react-tetris/',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-800',
    cover: '/src/assets/images/cover_block_drop_1795491775993.jpg',
  },
  {
    id: 'sandtris',
    title: 'Sandtris',
    category: 'Puzzle',
    subtitle: 'Real-time falling sand physics twist on classic block clearing',
    url: 'https://sandtris.com/',
    gradient: 'from-yellow-500 via-amber-600 to-orange-700',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'little-alchemy-2',
    title: 'Little Alchemy 2',
    category: 'Puzzle',
    subtitle: 'Combine elements to discover hundreds of items & worlds',
    url: 'https://littlealchemy2.com/',
    gradient: 'from-teal-500 via-emerald-600 to-green-800',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'minesweeper-online',
    title: 'Minesweeper Classic',
    category: 'Puzzle',
    subtitle: 'Classic HTML5 logic mine-clearing puzzle with Beginner to Expert boards',
    url: 'https://minesweeperonline.com/',
    gradient: 'from-slate-500 via-slate-600 to-zinc-800',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'google-pacman',
    title: 'Pac-Man (HTML5)',
    category: 'Arcade',
    subtitle: 'Classic maze arcade HTML5 build with original ghost chase patterns',
    url: 'https://macek.github.io/google_pacman/',
    gradient: 'from-yellow-400 via-amber-500 to-blue-700',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'tower-game',
    title: 'Tower Bloxx (HTML5)',
    category: 'Arcade',
    subtitle: 'Open-source HTML5 skyscraper stacking timing arcade game',
    url: 'https://iamkun.github.io/tower_game/',
    gradient: 'from-sky-400 via-blue-600 to-indigo-800',
    cover: '/src/assets/images/banner_street_hoops_1795524978774.jpg',
  },
  {
    id: 'clumsy-bird',
    title: 'Clumsy Bird (HTML5)',
    category: 'Arcade',
    subtitle: 'Open-source MelonJS HTML5 pipe-dodging arcade flyer',
    url: 'https://ellisonleao.github.io/clumsy-bird/',
    gradient: 'from-cyan-400 via-sky-500 to-teal-700',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'trex-runner',
    title: 'T-Rex Dino Runner (HTML5)',
    category: 'Arcade',
    subtitle: 'Open-source Chromium T-Rex desert jump & duck HTML5 runner',
    url: 'https://wayou.github.io/t-rex-runner/',
    gradient: 'from-zinc-500 via-slate-600 to-slate-800',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'jsnes',
    title: 'JSNES Retro Arcade',
    category: 'Arcade',
    subtitle: 'Open-source HTML5 8-bit console emulator with playable homebrew & classic demos',
    url: 'https://jsnes.org/',
    gradient: 'from-rose-500 via-red-600 to-slate-900',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    category: 'Arcade',
    subtitle: 'Classic online tap-to-fly pipe challenge',
    url: 'https://flappybird.io/',
    gradient: 'from-sky-400 via-cyan-600 to-teal-700',
    cover: '/src/assets/images/banner_retro_arcade_1795524978506.jpg',
  },
];

const FEATURED_GAME_IDS = [
  'fnaf',
  'hexgl',
  'ddlc',
  'smash-karts',
  'bloxd-io',
  'astray',
];

const CATEGORIES: GameCategory[] = [
  'All',
  'Multiplayer',
  'Racing',
  'Action',
  'Arcade',
  'Puzzle',
  'Story',
];

interface GamesAppProps {
  pausedByHide?: boolean;
}

export function GamesApp({ pausedByHide = false }: GamesAppProps) {
  const [category, setCategory] = useState<GameCategory>('All');
  const [search, setSearch] = useState('');
  const [activeGame, setActiveGame] = useState<GameEntry | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [bannerIdx, setBannerIdx] = useState(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const featuredGames = useMemo(
    () =>
      FEATURED_GAME_IDS.map((id) => GAMES_CATALOG.find((g) => g.id === id)).filter(
        (g): g is GameEntry => Boolean(g)
      ),
    []
  );

  useEffect(() => {
    if (activeGame) return;
    const id = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % featuredGames.length);
    }, 6500);
    return () => clearInterval(id);
  }, [activeGame, featuredGames.length]);

  const featuredGame = featuredGames[bannerIdx] ?? GAMES_CATALOG[0];

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GAMES_CATALOG.filter((g) => {
      const catMatch = category === 'All' || g.category === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    });
  }, [category, search]);

  const launchGame = (game: GameEntry) => {
    soundFx.click();
    setActiveGame(game);
    setReloadNonce((n) => n + 1);
  };

  const launchCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = customUrlInput.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      launchGame({
        id: `custom-${Date.now()}`,
        title: parsed.hostname.replace(/^www\./, ''),
        category: 'Arcade',
        subtitle: url,
        url,
        gradient: 'from-sky-500 to-indigo-700',
      });
    } catch {
      // ignore invalid URL
    }
  };

  const toggleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  if (activeGame) {
    return (
      <div ref={playerContainerRef} className="h-full flex flex-col bg-[#090d16] text-white">
        {/* Game Player Header */}
        <div className="px-3 py-2 border-b border-white/10 bg-black/45 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                soundFx.click();
                setActiveGame(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Games</span>
            </button>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{activeGame.title}</div>
              <div className="text-[10px] text-white/50 truncate">
                {activeGame.category} · Online HTML5 Game
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundFx.click();
                setReloadNonce((n) => n + 1);
              }}
              className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/75 hover:text-white transition-colors"
              title="Restart game"
              aria-label="Restart game"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/75 hover:text-white transition-colors"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <a
              href={activeGame.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/75 hover:text-white transition-colors"
              title="Open in browser tab"
              aria-label="Open in browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Game Viewport */}
        <div className="flex-1 min-h-0 relative bg-black">
          {!pausedByHide && (
            <iframe
              key={`${activeGame.id}-${reloadNonce}`}
              title={activeGame.title}
              src={activeGame.url}
              allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0d111a]/95 text-white overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 sm:px-6 border-b border-white/10 bg-black/25 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow border border-white/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-[family-name:var(--font-display)] text-white leading-tight">
                Games
              </h1>
              <p className="text-[11px] text-white/55">
                {filteredGames.length === GAMES_CATALOG.length
                  ? `${GAMES_CATALOG.length} real online HTML5 games`
                  : `${filteredGames.length} of ${GAMES_CATALOG.length} games`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-56 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/12 focus-within:border-orange-400">
              <Search className="w-3.5 h-3.5 text-white/45 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
                className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Categories + Custom URL Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto os-scroll pb-0.5">
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    soundFx.click();
                    setCategory(cat);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/6 text-white/65 hover:text-white hover:bg-white/12'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={launchCustomUrl}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10"
          >
            <Globe className="w-3.5 h-3.5 text-white/45 shrink-0" />
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Or paste HTML5 game URL..."
              className="w-44 bg-transparent text-[11px] text-white placeholder-white/40 outline-none"
            />
            <button
              type="submit"
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white whitespace-nowrap shrink-0"
            >
              Launch
            </button>
          </form>
        </div>
      </div>

      {/* Games Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6">
        {/* Featured Banner Carousel */}
        {category === 'All' && !search.trim() && (
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-900 min-h-[190px] sm:min-h-[210px] flex items-end p-5 sm:p-6 shadow-xl">
            {featuredGame.cover && (
              <img
                key={featuredGame.id}
                src={featuredGame.cover}
                alt={featuredGame.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />

            <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-lg space-y-2">
                <div className="text-[11px] font-semibold text-orange-400">
                  Featured · {featuredGame.category} · HTML5
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {featuredGame.title}
                </h2>
                <p className="text-xs text-white/80 line-clamp-2">{featuredGame.subtitle}</p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => launchGame(featuredGame)}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-lg whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Now</span>
                  </button>
                </div>
              </div>

              {/* Carousel Navigation */}
              <div className="flex items-center gap-2 self-end">
                <div className="flex items-center gap-1.5 mr-1">
                  {featuredGames.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => setBannerIdx(i)}
                      aria-label={`Show ${g.title} banner`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === bannerIdx ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/35 hover:bg-white/65'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setBannerIdx((prev) => (prev - 1 + featuredGames.length) % featuredGames.length)
                  }
                  className="p-1.5 rounded-lg bg-black/45 hover:bg-black/70 border border-white/15 text-white/85 transition-colors"
                  aria-label="Previous featured game"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBannerIdx((prev) => (prev + 1) % featuredGames.length)}
                  className="p-1.5 rounded-lg bg-black/45 hover:bg-black/70 border border-white/15 text-white/85 transition-colors"
                  aria-label="Next featured game"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredGames.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/10 text-center text-xs text-white/60">
            No matching games found. Try another search or switch categories above.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGames.map((game) => (
              <button
                key={game.id}
                onClick={() => launchGame(game)}
                className="group text-left rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/25 overflow-hidden transition-all flex flex-col"
              >
                <div
                  className={`h-28 bg-gradient-to-br ${game.gradient} relative overflow-hidden flex items-center justify-between p-4`}
                >
                  {game.cover && (
                    <img
                      src={game.cover}
                      alt={game.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="relative z-10 mt-auto flex items-end justify-between w-full gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-white/75">
                        {game.category} · HTML5
                      </div>
                      <div className="text-base font-bold text-white truncate">{game.title}</div>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:border-orange-400 transition-colors">
                      <Play className="w-4 h-4 text-white fill-current" />
                    </span>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-xs text-white/65 line-clamp-2 leading-relaxed">
                    {game.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
