import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  X,
  Lock,
  BookOpen,
  Globe,
  ExternalLink,
  Search,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
} from 'lucide-react';
import { soundFx } from '../../utils/sound';

interface ReaderData {
  url: string;
  title: string;
  description: string;
  frameable: boolean;
  blocksFrame: boolean;
  blockedScripts?: number;
  paragraphs: string[];
  links: Array<{ text: string; href: string }>;
  error?: string;
}

interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIdx: number;
  mode: 'newtab' | 'search' | 'iframe' | 'reader';
  useProxy?: boolean;
  searchQuery?: string;
  searchResults?: SearchResultItem[];
  readerData?: ReaderData | null;
  loading?: boolean;
}

const BOOKMARKS = [
  { label: 'Brave Home', url: 'brave://newtab' },
  { label: 'Poki Games', url: 'https://poki.com' },
  { label: 'Itch.io', url: 'https://itch.io' },
  { label: 'BBC News', url: 'https://www.bbc.com' },
  {
    label: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/export/embed.html?bbox=-122.52%2C37.70%2C-122.35%2C37.82&layer=mapnik',
  },
  { label: 'Archive.org', url: 'https://archive.org' },
];

function createTab(url = 'brave://newtab', title = 'New Tab'): BrowserTab {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    url,
    history: [url],
    historyIdx: 0,
    mode: url === 'brave://newtab' ? 'newtab' : 'iframe',
    readerData: null,
    loading: false,
  };
}

function isLikelyUrl(raw: string): boolean {
  const t = raw.trim();
  if (t.startsWith('brave://')) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/.test(t) && !t.includes(' ')) return true;
  return false;
}

export function BrowserApp() {
  const [tabs, setTabs] = useState<BrowserTab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [addressInput, setAddressInput] = useState('brave://newtab');
  const [shieldsOn, setShieldsOn] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [showShieldsMenu, setShowShieldsMenu] = useState(false);
  const [blockedTotal, setBlockedTotal] = useState(14);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const updateTab = (tabId: string, updater: (t: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  };

  const navigate = async (rawInput: string, forceReader = false, pushHistory = true) => {
    const trimmed = rawInput.trim() || 'brave://newtab';
    const tabId = activeTab.id;
    soundFx.click();

    if (trimmed === 'brave://newtab') {
      setAddressInput('brave://newtab');
      updateTab(tabId, (t) => {
        const nextHistory = pushHistory
          ? [...t.history.slice(0, t.historyIdx + 1), trimmed]
          : t.history;
        return {
          ...t,
          url: trimmed,
          title: 'New Tab',
          mode: 'newtab',
          history: nextHistory,
          historyIdx: pushHistory ? nextHistory.length - 1 : t.historyIdx,
          loading: false,
          readerData: null,
        };
      });
      return;
    }

    // Handle Brave Search queries
    if (trimmed.startsWith('brave://search?q=') || !isLikelyUrl(trimmed)) {
      const q = trimmed.startsWith('brave://search?q=')
        ? decodeURIComponent(trimmed.replace('brave://search?q=', ''))
        : trimmed;
      const searchUrl = `brave://search?q=${encodeURIComponent(q)}`;
      setAddressInput(q);
      updateTab(tabId, (t) => {
        const nextHistory = pushHistory
          ? [...t.history.slice(0, t.historyIdx + 1), searchUrl]
          : t.history;
        return {
          ...t,
          url: searchUrl,
          title: `${q} - Brave Search`,
          mode: 'search',
          searchQuery: q,
          loading: true,
          history: nextHistory,
          historyIdx: pushHistory ? nextHistory.length - 1 : t.historyIdx,
        };
      });

      try {
        const res = await fetch(`/api/browser/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: SearchResultItem[] };
        updateTab(tabId, (t) => ({
          ...t,
          searchResults: data.results ?? [],
          loading: false,
        }));
      } catch {
        updateTab(tabId, (t) => ({ ...t, searchResults: [], loading: false }));
      }
      return;
    }

    const targetUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setAddressInput(targetUrl);

    updateTab(tabId, (t) => {
      const nextHistory = pushHistory
        ? [...t.history.slice(0, t.historyIdx + 1), targetUrl]
        : t.history;
      return {
        ...t,
        url: targetUrl,
        title: new URL(targetUrl).hostname,
        loading: true,
        history: nextHistory,
        historyIdx: pushHistory ? nextHistory.length - 1 : t.historyIdx,
      };
    });

    if (!forceReader && targetUrl.includes('openstreetmap.org/export/embed.html')) {
      updateTab(tabId, (t) => ({
        ...t,
        mode: 'iframe',
        useProxy: false,
        title: 'OpenStreetMap',
        loading: false,
      }));
      return;
    }

    try {
      const res = await fetch(`/api/browser/fetch?url=${encodeURIComponent(targetUrl)}`);
      const data = (await res.json()) as ReaderData;
      if (shieldsOn && data.blockedScripts) {
        setBlockedTotal((b) => b + (data.blockedScripts ?? 0));
      }
      if (data.error) {
        updateTab(tabId, (t) => ({
          ...t,
          mode: 'reader',
          useProxy: false,
          loading: false,
          readerData: {
            url: targetUrl,
            title: 'Page Unreachable',
            description: data.error ?? 'Network error',
            frameable: false,
            blocksFrame: true,
            paragraphs: [],
            links: [],
            error: data.error,
          },
        }));
        return;
      }

      updateTab(tabId, (t) => ({
        ...t,
        title: data.title || t.title,
        mode: forceReader ? 'reader' : 'iframe',
        useProxy: Boolean(data.blocksFrame),
        readerData: data,
        loading: false,
      }));
    } catch {
      updateTab(tabId, (t) => ({
        ...t,
        mode: forceReader ? 'reader' : 'iframe',
        useProxy: true,
        loading: false,
      }));
    }
  };

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: unknown; url?: unknown } | null;
      if (
        payload &&
        payload.type === 'brave-navigate' &&
        typeof payload.url === 'string' &&
        /^https?:\/\//i.test(payload.url)
      ) {
        navigateRef.current(payload.url, false, true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const goBack = () => {
    if (activeTab.historyIdx <= 0) return;
    const prevUrl = activeTab.history[activeTab.historyIdx - 1];
    updateTab(activeTab.id, (t) => ({ ...t, historyIdx: t.historyIdx - 1 }));
    navigate(prevUrl, false, false);
  };

  const goForward = () => {
    if (activeTab.historyIdx >= activeTab.history.length - 1) return;
    const nextUrl = activeTab.history[activeTab.historyIdx + 1];
    updateTab(activeTab.id, (t) => ({ ...t, historyIdx: t.historyIdx + 1 }));
    navigate(nextUrl, false, false);
  };

  const addTab = () => {
    const next = createTab();
    setTabs((prev) => [...prev, next]);
    setActiveTabId(next.id);
    setAddressInput(next.url);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) {
      navigate('brave://newtab');
      return;
    }
    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      const nextActive = remaining[Math.max(0, idx - 1)];
      setActiveTabId(nextActive.id);
      setAddressInput(
        nextActive.url.startsWith('brave://search?q=')
          ? decodeURIComponent(nextActive.url.replace('brave://search?q=', ''))
          : nextActive.url
      );
    }
  };

  return (
    <div
      className={`h-full flex flex-col text-white ${
        privateMode ? 'bg-[#171124]' : 'bg-[#12151e]'
      }`}
    >
      {/* Tabs Strip */}
      <div className="px-2 pt-2 flex items-center gap-1 border-b border-white/10 bg-black/30 overflow-x-auto os-scroll shrink-0">
        {tabs.map((tab) => {
          const isCurrent = tab.id === activeTab.id;
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs max-w-[185px] cursor-pointer transition-colors shrink-0 ${
                isCurrent
                  ? 'bg-white/12 text-white border-t border-x border-white/15'
                  : 'text-white/60 hover:bg-white/6 hover:text-white'
              }`}
              onClick={() => {
                setActiveTabId(tab.id);
                setAddressInput(
                  tab.url.startsWith('brave://search?q=')
                    ? decodeURIComponent(tab.url.replace('brave://search?q=', ''))
                    : tab.url
                );
              }}
            >
              <Shield className="w-3.5 h-3.5 text-[#fb542b] shrink-0" />
              <span className="truncate">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label="Close tab"
                className="p-0.5 rounded hover:bg-white/15 text-white/50 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={addTab}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          aria-label="New tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation, Address Bar & Brave Shields */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-white/[0.03] shrink-0 relative">
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={goBack}
            disabled={activeTab.historyIdx <= 0}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={activeTab.historyIdx >= activeTab.history.length - 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"
            aria-label="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(activeTab.url, activeTab.mode === 'reader', false)}
            className="p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Reload"
          >
            <RotateCw className={`w-3.5 h-3.5 ${activeTab.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('brave://newtab')}
            className="p-1.5 rounded-lg hover:bg-white/10 hidden sm:inline-flex"
            aria-label="Brave Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(addressInput);
          }}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/12 focus-within:border-[#fb542b]/80"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Search Brave or enter a web address..."
            className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
          />
        </form>

        {/* Brave Shields Toggle */}
        <button
          onClick={() => setShowShieldsMenu((s) => !s)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors shrink-0 ${
            shieldsOn
              ? 'bg-[#fb542b]/20 border-[#fb542b]/50 text-[#ff7a55]'
              : 'bg-white/8 border-white/12 text-white/60'
          }`}
          title="Brave Shields"
        >
          {shieldsOn ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline tabular-nums">{blockedTotal}</span>
        </button>

        <button
          onClick={() => setPrivateMode((p) => !p)}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            privateMode
              ? 'bg-purple-500/25 border-purple-400/50 text-purple-300'
              : 'bg-white/8 border-white/10 text-white/65 hover:text-white'
          }`}
          title={privateMode ? 'Private Window Active' : 'Switch to Private Mode'}
          aria-label="Toggle Private Mode"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>

        {(activeTab.mode === 'iframe' || activeTab.mode === 'reader') && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate(activeTab.url, activeTab.mode !== 'reader', false)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 shrink-0 ${
                activeTab.mode === 'reader'
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                  : 'bg-white/8 border-white/10 text-white/75 hover:text-white'
              }`}
              title="Toggle Reader / Live Web View"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {activeTab.mode === 'reader' ? 'Web View' : 'Reader'}
              </span>
            </button>
            {/^https?:\/\//i.test(activeTab.url) && (
              <a
                href={activeTab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/8 border border-white/10 text-white/70 hover:text-white transition-colors"
                title="Open page externally"
                aria-label="Open page externally"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {showShieldsMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowShieldsMenu(false)} />
            <div className="absolute right-3 top-12 z-40 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/18 p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#fb542b]" />
                  <span className="text-xs font-bold text-white">Brave Shields</span>
                </div>
                <button
                  onClick={() => setShieldsOn((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    shieldsOn ? 'bg-[#fb542b] text-white' : 'bg-white/12 text-white/70'
                  }`}
                >
                  {shieldsOn ? 'UP' : 'DOWN'}
                </button>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Blocks third-party tracking scripts and cleans Reader pages automatically.
              </p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/60">Trackers & scripts blocked</span>
                <span className="font-bold tabular-nums text-[#ff7a55]">{blockedTotal}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bookmarks Bar */}
      <div className="px-3 py-1.5 border-b border-white/8 flex items-center gap-1.5 overflow-x-auto os-scroll shrink-0 bg-black/15">
        {BOOKMARKS.map((bm) => (
          <button
            key={bm.label}
            onClick={() => navigate(bm.url)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 whitespace-nowrap shrink-0 transition-colors"
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[#0b0e16]">
        {activeTab.loading && (
          <div className="absolute inset-0 z-20 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-white/80">
            <Loader2 className="w-4 h-4 animate-spin text-[#fb542b]" />
            <span>Loading...</span>
          </div>
        )}

        {activeTab.mode === 'newtab' && (
          <div className="h-full overflow-y-auto os-scroll p-6 sm:p-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl space-y-6">
              {/* Brave Privacy Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="text-lg sm:text-2xl font-bold tabular-nums text-[#fb542b]">
                    {blockedTotal}
                  </div>
                  <div className="text-[11px] text-white/55">Trackers Blocked</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="text-lg sm:text-2xl font-bold tabular-nums text-sky-400">
                    {(blockedTotal * 0.14).toFixed(1)} MB
                  </div>
                  <div className="text-[11px] text-white/55">Bandwidth Saved</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="text-lg sm:text-2xl font-bold tabular-nums text-emerald-400">
                    {privateMode ? 'Private' : 'Shields Up'}
                  </div>
                  <div className="text-[11px] text-white/55">Protection Status</div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-1">
                  <Shield className="w-6 h-6 text-[#fb542b]" />
                  <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] tracking-tight text-white">
                    Brave Browser
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-white/60">
                  Search the web privately or open any URL with Brave Shields.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
                  if (val.trim()) navigate(val);
                }}
                className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/8 border border-white/15 focus-within:border-[#fb542b]/80"
              >
                <Search className="w-4 h-4 text-white/50 ml-3 shrink-0" />
                <input
                  name="q"
                  type="text"
                  placeholder="Search with Brave or enter https://..."
                  className="w-full bg-transparent text-sm text-white placeholder-white/40 py-2 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#fb542b] hover:bg-[#ff6942] text-xs font-semibold text-white transition-colors shrink-0"
                >
                  Search
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-left">
                {BOOKMARKS.filter((b) => b.url !== 'brave://newtab').map((bm) => (
                  <button
                    key={bm.label}
                    onClick={() => navigate(bm.url)}
                    className="p-3 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 transition-colors"
                  >
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#fb542b] shrink-0" />
                      <span className="truncate">{bm.label}</span>
                    </div>
                    <div className="text-[11px] text-white/45 truncate mt-0.5">{bm.url}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab.mode === 'search' && (
          <div className="h-full overflow-y-auto os-scroll p-4 sm:p-6 bg-[#0d1018]">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <div className="text-xs text-[#fb542b] font-semibold">Brave Search</div>
                  <h2 className="text-base font-bold text-white">
                    Results for "{activeTab.searchQuery}"
                  </h2>
                </div>
                <span className="text-xs text-white/50">
                  {activeTab.searchResults?.length ?? 0} results
                </span>
              </div>

              {!activeTab.searchResults || activeTab.searchResults.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
                  No results found. Try another search term or enter a direct https:// URL.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTab.searchResults.map((res, i) => (
                    <button
                      key={`${res.url}-${i}`}
                      onClick={() => navigate(res.url)}
                      className="w-full text-left p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/8 transition-colors space-y-1"
                    >
                      <div className="text-[11px] text-white/45 truncate">
                        {res.source} · {res.url}
                      </div>
                      <div className="text-sm font-semibold text-sky-300 hover:underline">
                        {res.title}
                      </div>
                      <p className="text-xs text-white/70 line-clamp-2">{res.snippet}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab.mode === 'iframe' && (
          <iframe
            key={`${activeTab.id}-${activeTab.url}-${activeTab.useProxy ? 'proxy' : 'direct'}-${shieldsOn ? '1' : '0'}`}
            title={activeTab.title}
            src={
              activeTab.useProxy
                ? `/api/browser/proxy?url=${encodeURIComponent(activeTab.url)}&shields=${shieldsOn ? '1' : '0'}`
                : activeTab.url
            }
            className="w-full h-full border-0 bg-white"
            sandbox={
              activeTab.useProxy
                ? 'allow-scripts allow-forms allow-popups'
                : 'allow-same-origin allow-scripts allow-forms allow-popups'
            }
          />
        )}

        {activeTab.mode === 'reader' && activeTab.readerData && (
          <div className="h-full overflow-y-auto os-scroll p-5 sm:p-8 bg-[#0f131c]">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div>
                  <div className="text-[11px] text-[#fb542b] font-medium">
                    Brave Reader · {new URL(activeTab.readerData.url).hostname}
                    {activeTab.readerData.blockedScripts
                      ? ` · ${activeTab.readerData.blockedScripts} scripts blocked`
                      : ''}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {activeTab.readerData.title}
                  </h1>
                  {activeTab.readerData.description && (
                    <p className="text-sm text-white/65 mt-1.5">
                      {activeTab.readerData.description}
                    </p>
                  )}
                </div>
                <a
                  href={activeTab.readerData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white shrink-0"
                >
                  <span>Open External</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {activeTab.readerData.paragraphs.length > 0 ? (
                <div className="space-y-3.5 text-sm leading-relaxed text-white/85">
                  {activeTab.readerData.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/65">
                  This site requires client-side scripts or restricts embedded viewing. Click
                  "Open External" above to view it in a dedicated tab.
                </div>
              )}

              {activeTab.readerData.links.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-white/60 mb-2.5">Links on this page</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTab.readerData.links.map((l, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(l.href)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/12 border border-white/8 text-left text-xs text-sky-300 truncate transition-colors"
                      >
                        {l.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
