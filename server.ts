import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const SESSION_SIGNING_KEY =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const AUTH_STORE_DIR = path.resolve(__dirname, '.data');
const AUTH_STORE_FILE = path.resolve(AUTH_STORE_DIR, 'auth-store.json');
const COMM_STORE_FILE = path.resolve(AUTH_STORE_DIR, 'comm-store.json');

interface StoredPlayer {
  id: string;
  username: string;
  usernameLower: string;
  displayName: string;
  avatarColor: string;
  role: 'owner' | 'player';
  passwordHash: string;
  createdAt: string;
}

interface AuthStoreData {
  players: StoredPlayer[];
}

const AVATAR_COLOR_ALLOWLIST = new Set([
  '#ef4444',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
]);

function loadAuthStore(): AuthStoreData {
  try {
    if (fs.existsSync(AUTH_STORE_FILE)) {
      const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AuthStoreData>;
      return {
        players: Array.isArray(parsed.players) ? parsed.players : [],
      };
    }
  } catch {
    // start with empty store if unreadable
  }
  return { players: [] };
}

function saveAuthStore(store: AuthStoreData): void {
  fs.mkdirSync(AUTH_STORE_DIR, { recursive: true });
  const tempFile = `${AUTH_STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempFile, AUTH_STORE_FILE);
}

const authStore: AuthStoreData = loadAuthStore();

interface StoredChatMessage {
  id: string;
  clientMsgId?: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarColor: string;
  body: string;
  createdAt: string;
}

interface CommStoreData {
  messages: StoredChatMessage[];
}

function loadCommStore(): CommStoreData {
  try {
    if (fs.existsSync(COMM_STORE_FILE)) {
      const raw = fs.readFileSync(COMM_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CommStoreData>;
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-1500) : [],
      };
    }
  } catch {
    // start with empty comm store
  }
  return { messages: [] };
}

function saveCommStore(store: CommStoreData): void {
  fs.mkdirSync(AUTH_STORE_DIR, { recursive: true });
  const tempFile = `${COMM_STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify({ messages: store.messages.slice(-1500) }, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(tempFile, COMM_STORE_FILE);
}

const commStore: CommStoreData = loadCommStore();

function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifySecret(secret: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(secret, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

interface TokenPayload {
  typ: 'player';
  sub: string;
  role: 'owner' | 'player';
  exp: number;
}

function signToken(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (
      decoded.typ !== 'player' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function toPublicPlayer(player: StoredPlayer) {
  return {
    id: player.id,
    username: player.username,
    displayName: player.displayName,
    avatarColor: player.avatarColor,
    role: player.role,
    createdAt: player.createdAt,
  };
}

const authAttempts = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count += 1;
  return true;
}

interface YouTubeResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
}

const FALLBACK_YOUTUBE_VIDEOS: YouTubeResult[] = [
  {
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to',
    channel: 'Lofi Girl',
    duration: 'LIVE',
    views: 'Live stream',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  },
  {
    id: '4xDzrJKXOOY',
    title: 'synthwave radio - chill synth / retro beats',
    channel: 'Lofi Girl Synthwave',
    duration: 'LIVE',
    views: 'Live stream',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
  },
  {
    id: 'd-2r7_lG5lQ',
    title: 'Mario Kart 8 Deluxe - 200cc World Record Progression',
    channel: 'Summoning Salt',
    duration: '42:18',
    views: '3.2M views',
    thumbnail: 'https://i.ytimg.com/vi/d-2r7_lG5lQ/hqdefault.jpg',
  },
  {
    id: 'MVPTGNGiI-4',
    title: 'Synthwave & Chillwave Mix for Late Night Gaming',
    channel: 'Astral Throb',
    duration: '58:12',
    views: '1.9M views',
    thumbnail: 'https://i.ytimg.com/vi/MVPTGNGiI-4/hqdefault.jpg',
  },
  {
    id: '5qap5aO4i9A',
    title: 'Chill Beats & Ambient Focus Session',
    channel: 'Chilled Archive',
    duration: '1:12:40',
    views: '840K views',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
  },
  {
    id: 'aqz-KE-bpKQ',
    title: 'Big Buck Bunny 60fps 4K Blender Open Movie',
    channel: 'Blender Foundation',
    duration: '10:34',
    views: '14M views',
    thumbnail: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
  },
];

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }
  return true;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Local addresses are blocked');
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('Private network addresses are blocked');
    }
  } else {
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (isPrivateIp(rec.address)) {
        throw new Error('Resolved to a private network address');
      }
    }
  }
  return parsed;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
}

function extractVideoRenderers(obj: unknown, out: YouTubeResult[]): void {
  if (!obj || typeof obj !== 'object' || out.length >= 16) return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractVideoRenderers(item, out);
      if (out.length >= 16) return;
    }
    return;
  }
  const record = obj as Record<string, unknown>;
  if (record.videoRenderer && typeof record.videoRenderer === 'object') {
    const v = record.videoRenderer as Record<string, unknown>;
    const videoId = typeof v.videoId === 'string' ? v.videoId : '';
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      const titleObj = v.title as { runs?: Array<{ text?: string }>; simpleText?: string } | undefined;
      const title =
        titleObj?.runs?.map((r) => r.text ?? '').join('') ||
        titleObj?.simpleText ||
        'Untitled Video';
      const ownerObj = v.ownerText as { runs?: Array<{ text?: string }> } | undefined;
      const channel = ownerObj?.runs?.[0]?.text || 'YouTube';
      const lengthObj = v.lengthText as { simpleText?: string } | undefined;
      const duration = lengthObj?.simpleText || 'LIVE';
      const viewObj = v.shortViewCountText as { simpleText?: string; runs?: Array<{ text?: string }> } | undefined;
      const views =
        viewObj?.simpleText ||
        viewObj?.runs?.map((r) => r.text ?? '').join('') ||
        'Watch';
      if (!out.some((item) => item.id === videoId)) {
        out.push({
          id: videoId,
          title,
          channel,
          duration,
          views,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      }
    }
  }
  for (const key of Object.keys(record)) {
    extractVideoRenderers(record[key], out);
    if (out.length >= 16) return;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Player Authentication routes
  app.get('/api/auth/status', (_req, res) => {
    res.json({
      playerCount: authStore.players.length,
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(`register:${clientIp}`)) {
      res.status(429).json({ error: 'Too many registration attempts. Please wait a few minutes.' });
      return;
    }
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const rawDisplayName =
      typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawColor =
      typeof req.body?.avatarColor === 'string' ? req.body.avatarColor.trim() : '#ef4444';

    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(rawUsername)) {
      res.status(400).json({
        error: 'Username must be 3–20 characters using letters, numbers, _, ., or -.',
      });
      return;
    }
    if (rawPassword.length < 4 || rawPassword.length > 128) {
      res.status(400).json({ error: 'Password must be between 4 and 128 characters.' });
      return;
    }
    const usernameLower = rawUsername.toLowerCase();
    if (authStore.players.some((p) => p.usernameLower === usernameLower)) {
      res.status(409).json({ error: 'That player username is already taken.' });
      return;
    }

    const displayName = (rawDisplayName || rawUsername).slice(0, 30);
    const avatarColor = AVATAR_COLOR_ALLOWLIST.has(rawColor) ? rawColor : '#ef4444';
    const role: 'owner' | 'player' = authStore.players.length === 0 ? 'owner' : 'player';
    const newPlayer: StoredPlayer = {
      id: crypto.randomUUID(),
      username: rawUsername,
      usernameLower,
      displayName,
      avatarColor,
      role,
      passwordHash: hashSecret(rawPassword),
      createdAt: new Date().toISOString(),
    };
    authStore.players.push(newPlayer);
    saveAuthStore(authStore);

    const token = signToken({
      typ: 'player',
      sub: newPlayer.id,
      role: newPlayer.role,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ token, player: toPublicPlayer(newPlayer) });
  });

  app.post('/api/auth/login', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(`login:${clientIp}`)) {
      res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes.' });
      return;
    }
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const player = authStore.players.find((p) => p.usernameLower === rawUsername.toLowerCase());
    if (!player || !verifySecret(rawPassword, player.passwordHash)) {
      res.status(401).json({ error: 'Invalid player username or password.' });
      return;
    }
    const token = signToken({
      typ: 'player',
      sub: player.id,
      role: player.role,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });
    res.json({ token, player: toPublicPlayer(player) });
  });

  function authenticateRequest(req: express.Request): StoredPlayer | null {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const payload = verifyToken(token);
    if (!payload?.sub) return null;
    return authStore.players.find((p) => p.id === payload.sub) ?? null;
  }

  function makeDmChannelId(userA: string, userB: string): string {
    return userA < userB ? `dm:${userA}:${userB}` : `dm:${userB}:${userA}`;
  }

  function resolveChannelAccess(
    requesterId: string,
    rawChannelId: string
  ): { channelId: string; participantIds: string[] | null } | null {
    if (rawChannelId === 'lounge') {
      return { channelId: 'lounge', participantIds: null };
    }
    if (!rawChannelId.startsWith('dm:')) return null;
    const parts = rawChannelId.split(':');
    if (parts.length !== 3) return null;
    const [, idA, idB] = parts;
    if (!idA || !idB || idA === idB) return null;
    if (requesterId !== idA && requesterId !== idB) return null;
    const existsA = authStore.players.some((p) => p.id === idA);
    const existsB = authStore.players.some((p) => p.id === idB);
    if (!existsA || !existsB) return null;
    return {
      channelId: makeDmChannelId(idA, idB),
      participantIds: [idA, idB],
    };
  }

  const onlineSockets = new Map<string, Set<WebSocket>>();

  app.get('/api/auth/me', (req, res) => {
    const player = authenticateRequest(req);
    if (!player) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ player: toPublicPlayer(player) });
  });

  // Real-Time Messaging & Calling Directory + History
  app.get('/api/comm/directory', (req, res) => {
    const me = authenticateRequest(req);
    if (!me) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const contacts = authStore.players.map((p) => {
      const dmChannel = p.id === me.id ? 'lounge' : makeDmChannelId(me.id, p.id);
      let lastMsg: StoredChatMessage | undefined;
      for (let i = commStore.messages.length - 1; i >= 0; i--) {
        if (commStore.messages[i].channelId === dmChannel) {
          lastMsg = commStore.messages[i];
          break;
        }
      }
      const sockets = onlineSockets.get(p.id);
      return {
        ...toPublicPlayer(p),
        online: Boolean(sockets && sockets.size > 0),
        lastMessage: lastMsg?.body,
        lastMessageAt: lastMsg?.createdAt,
      };
    });
    res.json({ contacts });
  });

  app.get('/api/comm/messages', (req, res) => {
    const me = authenticateRequest(req);
    if (!me) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rawChannelId = String(req.query.channelId ?? 'lounge').trim();
    const access = resolveChannelAccess(me.id, rawChannelId);
    if (!access) {
      res.status(403).json({ error: 'Invalid or forbidden channel' });
      return;
    }
    const messages = commStore.messages
      .filter((m) => m.channelId === access.channelId)
      .slice(-150);
    res.json({ channelId: access.channelId, messages });
  });

  // Real YouTube search endpoint
  app.get('/api/youtube/search', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ results: FALLBACK_YOUTUBE_VIDEOS, source: 'curated' });
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timeout);

      const html = await response.text();
      const match =
        html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ||
        html.match(/ytInitialData"\s*:\s*(\{.*?\});/s);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]) as unknown;
        const results: YouTubeResult[] = [];
        extractVideoRenderers(parsed, results);
        if (results.length > 0) {
          res.json({ results, source: 'youtube' });
          return;
        }
      }
    } catch {
      // Fallback below if network or YouTube HTML layout is unavailable
    }

    const qLower = q.toLowerCase();
    const filtered = FALLBACK_YOUTUBE_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(qLower) ||
        v.channel.toLowerCase().includes(qLower)
    );
    res.json({
      results: filtered.length > 0 ? filtered : FALLBACK_YOUTUBE_VIDEOS,
      source: 'curated',
    });
  });

  // SoundCloud public client_id cache & resolver
  let cachedScClientId = '';
  let cachedScClientIdAt = 0;

  async function getSoundCloudClientId(forceRefresh = false): Promise<string> {
    if (!forceRefresh && cachedScClientId && Date.now() - cachedScClientIdAt < 1000 * 60 * 45) {
      return cachedScClientId;
    }
    const pageRes = await fetch('https://soundcloud.com/discover', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    const html = await pageRes.text();
    const scriptMatches = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[0-9]+-[a-z0-9]+\.js/g)].map(
      (m) => m[0]
    );
    for (let i = scriptMatches.length - 1; i >= Math.max(0, scriptMatches.length - 4); i--) {
      const jsRes = await fetch(scriptMatches[i]);
      const jsText = await jsRes.text();
      const cidMatch = jsText.match(/client_id:"([a-zA-Z0-9]{24,40})"/);
      if (cidMatch && cidMatch[1]) {
        cachedScClientId = cidMatch[1];
        cachedScClientIdAt = Date.now();
        return cachedScClientId;
      }
    }
    throw new Error('Could not resolve SoundCloud client_id');
  }

  interface SoundCloudItem {
    id: string;
    kind: 'track' | 'playlist' | 'user';
    title: string;
    artist: string;
    artwork: string;
    permalinkUrl: string;
    durationMs: number;
    playbackCount: number;
    likesCount: number;
    genre: string;
    trackCount?: number;
  }

  const FALLBACK_SC_ITEMS: SoundCloudItem[] = [
    {
      id: 'sc-monstercat-1',
      kind: 'user',
      title: 'Monstercat Official Catalog',
      artist: 'Monstercat',
      artwork: '',
      permalinkUrl: 'https://soundcloud.com/monstercat',
      durationMs: 0,
      playbackCount: 0,
      likesCount: 0,
      genre: 'Electronic',
    },
    {
      id: 'sc-chillhop-1',
      kind: 'user',
      title: 'Chillhop Music',
      artist: 'Chillhop Music',
      artwork: '',
      permalinkUrl: 'https://soundcloud.com/chillhopdotcom',
      durationMs: 0,
      playbackCount: 0,
      likesCount: 0,
      genre: 'Lo-Fi',
    },
    {
      id: 'sc-ncs-1',
      kind: 'user',
      title: 'NoCopyrightSounds (NCS)',
      artist: 'NCS',
      artwork: '',
      permalinkUrl: 'https://soundcloud.com/nocopyrightsounds',
      durationMs: 0,
      playbackCount: 0,
      likesCount: 0,
      genre: 'Gaming Electronic',
    },
  ];

  function mapScEntity(raw: Record<string, unknown>, fallbackKind: 'track' | 'playlist' | 'user'): SoundCloudItem | null {
    const kindRaw = String(raw.kind ?? fallbackKind);
    const kind: 'track' | 'playlist' | 'user' =
      kindRaw === 'playlist' ? 'playlist' : kindRaw === 'user' ? 'user' : 'track';
    const permalinkUrl = typeof raw.permalink_url === 'string' ? raw.permalink_url : '';
    if (!permalinkUrl) return null;

    const userObj = raw.user as Record<string, unknown> | undefined;
    const rawArt =
      (typeof raw.artwork_url === 'string' && raw.artwork_url) ||
      (typeof raw.avatar_url === 'string' && raw.avatar_url) ||
      (typeof userObj?.avatar_url === 'string' && userObj.avatar_url) ||
      '';
    const artwork = rawArt.replace('-large.', '-t500x500.');

    const title =
      (typeof raw.title === 'string' && raw.title) ||
      (typeof raw.username === 'string' && raw.username) ||
      'SoundCloud Stream';
    const artist =
      (typeof userObj?.username === 'string' && userObj.username) ||
      (typeof raw.username === 'string' && raw.username) ||
      'SoundCloud Artist';

    return {
      id: String(raw.id ?? permalinkUrl),
      kind,
      title,
      artist,
      artwork,
      permalinkUrl,
      durationMs: Number(raw.duration ?? 0),
      playbackCount: Number(raw.playback_count ?? 0),
      likesCount: Number(raw.likes_count ?? 0),
      genre: typeof raw.genre === 'string' && raw.genre ? raw.genre : 'SoundCloud',
      trackCount: typeof raw.track_count === 'number' ? raw.track_count : undefined,
    };
  }

  async function fetchScApi(endpointPath: string): Promise<unknown> {
    let cid = await getSoundCloudClientId(false);
    const sep = endpointPath.includes('?') ? '&' : '?';
    let response = await fetch(`https://api-v2.soundcloud.com${endpointPath}${sep}client_id=${cid}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (response.status === 401 || response.status === 403) {
      cid = await getSoundCloudClientId(true);
      response = await fetch(`https://api-v2.soundcloud.com${endpointPath}${sep}client_id=${cid}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
    }
    if (!response.ok) {
      throw new Error(`SoundCloud API returned ${response.status}`);
    }
    return response.json();
  }

  // Real SoundCloud search (tracks, playlists, users)
  app.get('/api/soundcloud/search', async (req, res) => {
    const q = String(req.query.q ?? 'electronic gaming').trim();
    const kindParam = String(req.query.kind ?? 'tracks');
    const kind =
      kindParam === 'playlists' ? 'playlists' : kindParam === 'users' ? 'users' : 'tracks';
    const fallbackKind = kind === 'playlists' ? 'playlist' : kind === 'users' ? 'user' : 'track';

    try {
      const data = (await fetchScApi(
        `/search/${kind}?q=${encodeURIComponent(q)}&limit=24`
      )) as { collection?: Array<Record<string, unknown>> };
      const items = (data.collection ?? [])
        .map((row) => mapScEntity(row, fallbackKind))
        .filter((x): x is SoundCloudItem => x !== null);
      res.json({ items, source: 'soundcloud' });
    } catch {
      res.json({ items: FALLBACK_SC_ITEMS, source: 'curated' });
    }
  });

  const GENRE_SEARCH_MAP: Record<string, string> = {
    'all-music': 'electronic chillwave gaming',
    electronic: 'electronic synthwave monstercat',
    hiphoprap: 'hip hop instrumental beats',
    ambient: 'lofi chill beats ambient',
    danceedm: 'edm house dance',
    indie: 'indie alternative',
  };

  // Real SoundCloud Top Charts by genre
  app.get('/api/soundcloud/charts', async (req, res) => {
    const genre = String(req.query.genre ?? 'all-music').trim();
    const scGenre = genre.startsWith('soundcloud:genres:') ? genre : `soundcloud:genres:${genre}`;
    try {
      let items: SoundCloudItem[] = [];
      try {
        const data = (await fetchScApi(
          `/charts?kind=top&genre=${encodeURIComponent(scGenre)}&limit=24`
        )) as { collection?: Array<{ track?: Record<string, unknown> }> };
        items = (data.collection ?? [])
          .map((entry) => (entry.track ? mapScEntity(entry.track, 'track') : null))
          .filter((x): x is SoundCloudItem => x !== null);
      } catch {
        // /charts may return 404/empty for some regions; fall through to live genre track search
      }

      if (items.length === 0) {
        const searchTerm = GENRE_SEARCH_MAP[genre] ?? genre;
        const searchData = (await fetchScApi(
          `/search/tracks?q=${encodeURIComponent(searchTerm)}&limit=24`
        )) as { collection?: Array<Record<string, unknown>> };
        items = (searchData.collection ?? [])
          .map((row) => mapScEntity(row, 'track'))
          .filter((x): x is SoundCloudItem => x !== null);
      }

      res.json({ items: items.length > 0 ? items : FALLBACK_SC_ITEMS, source: 'soundcloud' });
    } catch {
      res.json({ items: FALLBACK_SC_ITEMS, source: 'curated' });
    }
  });

  // Resolve any pasted SoundCloud URL
  app.get('/api/soundcloud/resolve', async (req, res) => {
    const targetUrl = String(req.query.url ?? '').trim();
    if (!/^https?:\/\/(www\.|m\.)?soundcloud\.com\//i.test(targetUrl)) {
      res.status(400).json({ error: 'Invalid SoundCloud URL' });
      return;
    }
    try {
      const resolved = (await fetchScApi(
        `/resolve?url=${encodeURIComponent(targetUrl)}`
      )) as Record<string, unknown>;
      const item = mapScEntity(resolved, 'track');
      if (item) {
        res.json({ item });
        return;
      }
    } catch {
      // Fallback to SoundCloud oEmbed
    }
    try {
      const oe = await fetch(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(targetUrl)}`
      );
      if (oe.ok) {
        const data = (await oe.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        res.json({
          item: {
            id: targetUrl,
            kind: 'track',
            title: data.title ?? 'SoundCloud Stream',
            artist: data.author_name ?? 'SoundCloud',
            artwork: data.thumbnail_url ?? '',
            permalinkUrl: targetUrl,
            durationMs: 0,
            playbackCount: 0,
            likesCount: 0,
            genre: 'SoundCloud',
          },
        });
        return;
      }
    } catch {
      // ignore
    }
    res.json({
      item: {
        id: targetUrl,
        kind: 'track',
        title: 'SoundCloud Stream',
        artist: 'SoundCloud',
        artwork: '',
        permalinkUrl: targetUrl,
        durationMs: 0,
        playbackCount: 0,
        likesCount: 0,
        genre: 'SoundCloud',
      },
    });
  });

  function decodeBingTargetUrl(href: string): string {
    try {
      const parsed = new URL(href);
      const u = parsed.searchParams.get('u');
      if (u && u.startsWith('a1')) {
        const b64 = u.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
    } catch {
      // ignore
    }
    return href;
  }

  // Real Web Search API for Brave Browser
  app.get('/api/browser/search', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }

    const results: Array<{ title: string; url: string; snippet: string; source: string }> = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5500);
      const bingRes = await fetch(
        `https://www.bing.com/search?q=${encodeURIComponent(q)}&mkt=en-US`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );
      clearTimeout(timeout);

      if (bingRes.ok) {
        const html = await bingRes.text();
        const itemRegex = /<li class="b_algo"[\s\S]*?<\/li>/gi;
        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(html)) !== null && results.length < 14) {
          const block = match[0];
          const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i);
          if (!linkMatch) continue;
          const rawHref = decodeHtmlEntities(linkMatch[1]);
          const targetUrl = decodeBingTargetUrl(rawHref);
          const title = stripTags(linkMatch[2]);
          const snipMatch =
            block.match(/<div class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
            block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          const snippet = snipMatch ? stripTags(snipMatch[1]) : '';
          let hostname = '';
          try {
            hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
          } catch {
            continue;
          }
          if (!results.some((r) => r.url === targetUrl)) {
            results.push({
              title,
              url: targetUrl,
              snippet: snippet || targetUrl,
              source: hostname,
            });
          }
        }
      }
    } catch {
      // Fallback below if Bing search fails
    }

    if (results.length === 0) {
      try {
        const hnRes = await fetch(
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=8`
        );
        if (hnRes.ok) {
          const hnData = (await hnRes.json()) as {
            hits?: Array<{ title?: string; url?: string; objectID: string; points?: number }>;
          };
          for (const hit of hnData.hits ?? []) {
            if (!hit.title) continue;
            const targetUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
            results.push({
              title: hit.title,
              url: targetUrl,
              snippet: `Web result · ${hit.points ?? 0} points`,
              source: new URL(targetUrl).hostname.replace(/^www\./, ''),
            });
          }
        }
      } catch {
        // ignore
      }
    }

    res.json({ results });
  });

  // Live Visual Web Proxy for Brave Browser (allows rendering X-Frame-Options blocked sites inside sandboxed iframe)
  app.get('/api/browser/proxy', async (req, res) => {
    const rawUrl = String(req.query.url ?? '').trim();
    const shields = String(req.query.shields ?? '1') !== '0';
    if (!rawUrl) {
      res.status(400).send('Missing url');
      return;
    }

    try {
      const safeUrl = await assertSafeExternalUrl(rawUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);
      const response = await fetch(safeUrl.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      await assertSafeExternalUrl(response.url);
      const contentType = response.headers.get('content-type') ?? 'text/html';

      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        const buf = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', contentType);
        res.send(buf);
        return;
      }

      let html = (await response.text()).slice(0, 750_000);
      html = html.replace(
        /<meta[^>]+http-equiv=["']?(?:Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi,
        ''
      );
      if (shields) {
        html = html.replace(
          /<script[^>]+src=["'][^"']*(?:doubleclick|googlesyndication|googletagmanager|google-analytics|facebook\.net|adservice|taboola|outbrain|scorecardresearch|hotjar|segment\.com)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
          ''
        );
      }

      const finalUrl = new URL(response.url);
      const safeBaseHref = finalUrl.href.replace(/"/g, '&quot;');
      const baseTag = `<base href="${safeBaseHref}" target="_self" />`;
      const bridgeScript = `<script>
        (function() {
          var pageUrl = ${JSON.stringify(response.url)};
          document.addEventListener('click', function(e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            var href = a.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
            e.preventDefault();
            try {
              var resolved = new URL(href, pageUrl).toString();
              if (/^https?:\\/\\//i.test(resolved)) {
                window.parent.postMessage({ type: 'brave-navigate', url: resolved }, '*');
              }
            } catch (err) {}
          }, true);

          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.tagName || form.tagName.toLowerCase() !== 'form') return;
            var method = (form.getAttribute('method') || 'get').toLowerCase();
            if (method !== 'get') return;
            e.preventDefault();
            try {
              var action = form.getAttribute('action') || pageUrl;
              var target = new URL(action, pageUrl);
              var fd = new FormData(form);
              fd.forEach(function(value, key) {
                if (typeof value === 'string') target.searchParams.set(key, value);
              });
              if (/^https?:\\/\\//i.test(target.toString())) {
                window.parent.postMessage({ type: 'brave-navigate', url: target.toString() }, '*');
              }
            } catch (err) {}
          }, true);

          var ctrlAlone = false;
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Control') {
              if (!e.repeat) ctrlAlone = true;
            } else {
              ctrlAlone = false;
            }
          }, true);
          document.addEventListener('keyup', function(e) {
            if (e.key === 'Control' && ctrlAlone) {
              ctrlAlone = false;
              window.parent.postMessage({ type: 'brave-panic-ctrl' }, '*');
            }
          }, true);
        })();
      </script>`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}\n${bridgeScript}`);
      } else {
        html = `${baseTag}\n${bridgeScript}\n${html}`;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach site';
      res.status(502).send(`
        <!doctype html>
        <html>
          <body style="margin:0;background:#0e121a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;text-align:center;">
            <div style="max-width:420px;">
              <h2 style="margin:0 0 8px;color:#fb542b;">Site could not be loaded</h2>
              <p style="font-size:13px;color:#94a3b8;line-height:1.5;">${msg.replace(/</g, '&lt;')}</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Built-in Browser safe fetch + frameability check + reader extraction
  app.get('/api/browser/fetch', async (req, res) => {
    const rawUrl = String(req.query.url ?? '').trim();
    if (!rawUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }
    try {
      const safeUrl = await assertSafeExternalUrl(rawUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const response = await fetch(safeUrl.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      const xfo = (response.headers.get('x-frame-options') ?? '').toLowerCase();
      const csp = (response.headers.get('content-security-policy') ?? '').toLowerCase();
      const blocksFrame =
        xfo.includes('deny') ||
        xfo.includes('sameorigin') ||
        (csp.includes('frame-ancestors') && !csp.includes('frame-ancestors *'));

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        res.json({
          url: response.url,
          title: safeUrl.hostname,
          description: `Content type: ${contentType || 'binary'}`,
          frameable: !blocksFrame,
          blocksFrame,
          blockedScripts: 0,
          paragraphs: [],
          links: [],
        });
        return;
      }

      const rawText = (await response.text()).slice(0, 350_000);
      const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : safeUrl.hostname;
      const descMatch =
        rawText.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        rawText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const description = descMatch ? decodeHtmlEntities(descMatch[1]) : '';

      const scriptMatches = rawText.match(/<script[\s\S]*?<\/script>/gi);
      const blockedScripts = scriptMatches ? scriptMatches.length : 0;

      const cleaned = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

      const paragraphs: string[] = [];
      const pRegex = /<(p|h1|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi;
      let m: RegExpExecArray | null;
      while ((m = pRegex.exec(cleaned)) !== null && paragraphs.length < 36) {
        const text = stripTags(m[2]);
        if (text.length >= 28) {
          paragraphs.push(text);
        }
      }

      const links: Array<{ text: string; href: string }> = [];
      const aRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = aRegex.exec(cleaned)) !== null && links.length < 20) {
        const hrefRaw = m[1].trim();
        const linkText = stripTags(m[2]);
        if (linkText.length >= 3 && linkText.length <= 80 && !hrefRaw.startsWith('javascript:')) {
          try {
            const resolved = new URL(hrefRaw, response.url).toString();
            if (!links.some((l) => l.href === resolved)) {
              links.push({ text: linkText, href: resolved });
            }
          } catch {
            // ignore invalid relative URL
          }
        }
      }

      res.json({
        url: response.url,
        title,
        description,
        frameable: !blocksFrame,
        blocksFrame,
        blockedScripts,
        paragraphs,
        links,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Could not fetch URL',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  interface AuthedSocket extends WebSocket {
    playerId?: string;
    isAlive?: boolean;
  }

  function sendJson(ws: WebSocket, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function sendToPlayer(playerId: string, payload: unknown, excludeSocket?: WebSocket): void {
    const set = onlineSockets.get(playerId);
    if (!set) return;
    const raw = JSON.stringify(payload);
    for (const client of set) {
      if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  function broadcastAll(payload: unknown): void {
    const raw = JSON.stringify(payload);
    for (const set of onlineSockets.values()) {
      for (const client of set) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(raw);
        }
      }
    }
  }

  function getOnlineUserIds(): string[] {
    const ids: string[] = [];
    for (const [uid, set] of onlineSockets.entries()) {
      if (set.size > 0) ids.push(uid);
    }
    return ids;
  }

  const activeCalls = new Map<string, { peerId: string; callId: string }>();

  httpServer.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname !== '/ws/comm') return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (rawWs) => {
    const ws = rawWs as AuthedSocket;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString('utf8')) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = typeof msg.type === 'string' ? msg.type : '';

      if (type === 'auth') {
        const token = typeof msg.token === 'string' ? msg.token.trim() : '';
        const payload = verifyToken(token);
        const player = payload?.sub ? authStore.players.find((p) => p.id === payload.sub) : undefined;
        if (!player) {
          sendJson(ws, { type: 'auth:error', error: 'Invalid session token' });
          ws.close(4001, 'Unauthorized');
          return;
        }
        ws.playerId = player.id;
        let set = onlineSockets.get(player.id);
        const wasOffline = !set || set.size === 0;
        if (!set) {
          set = new Set();
          onlineSockets.set(player.id, set);
        }
        set.add(ws);

        sendJson(ws, {
          type: 'auth:ok',
          player: toPublicPlayer(player),
          onlineUserIds: getOnlineUserIds(),
        });

        if (wasOffline) {
          broadcastAll({
            type: 'presence:update',
            userId: player.id,
            online: true,
            player: toPublicPlayer(player),
          });
        }
        return;
      }

      if (!ws.playerId) {
        sendJson(ws, { type: 'error', error: 'Authenticate first' });
        return;
      }

      const sender = authStore.players.find((p) => p.id === ws.playerId);
      if (!sender) return;

      if (type === 'chat:send') {
        const rawChannelId = typeof msg.channelId === 'string' ? msg.channelId.trim() : 'lounge';
        const rawBody = typeof msg.body === 'string' ? msg.body.trim() : '';
        const clientMsgId = typeof msg.clientMsgId === 'string' ? msg.clientMsgId.slice(0, 80) : undefined;
        if (!rawBody || rawBody.length > 1000) return;

        const access = resolveChannelAccess(sender.id, rawChannelId);
        if (!access) return;

        if (clientMsgId) {
          const dup = commStore.messages.find(
            (m) => m.senderId === sender.id && m.clientMsgId === clientMsgId
          );
          if (dup) {
            sendToPlayer(sender.id, { type: 'chat:message', message: dup });
            return;
          }
        }

        const chatMessage: StoredChatMessage = {
          id: crypto.randomUUID(),
          clientMsgId,
          channelId: access.channelId,
          senderId: sender.id,
          senderUsername: sender.username,
          senderDisplayName: sender.displayName,
          senderAvatarColor: sender.avatarColor,
          body: rawBody,
          createdAt: new Date().toISOString(),
        };

        commStore.messages.push(chatMessage);
        if (commStore.messages.length > 1500) {
          commStore.messages = commStore.messages.slice(-1500);
        }
        saveCommStore(commStore);

        if (access.participantIds === null) {
          broadcastAll({ type: 'chat:message', message: chatMessage });
        } else {
          for (const pid of access.participantIds) {
            sendToPlayer(pid, { type: 'chat:message', message: chatMessage });
          }
        }
        return;
      }

      if (type === 'chat:typing') {
        const rawChannelId = typeof msg.channelId === 'string' ? msg.channelId.trim() : 'lounge';
        const isTyping = Boolean(msg.isTyping);
        const access = resolveChannelAccess(sender.id, rawChannelId);
        if (!access) return;

        const evt = {
          type: 'chat:typing',
          channelId: access.channelId,
          fromUserId: sender.id,
          fromDisplayName: sender.displayName,
          isTyping,
        };
        if (access.participantIds === null) {
          for (const uid of getOnlineUserIds()) {
            if (uid !== sender.id) sendToPlayer(uid, evt);
          }
        } else {
          for (const pid of access.participantIds) {
            if (pid !== sender.id) sendToPlayer(pid, evt);
          }
        }
        return;
      }

      if (type === 'call:invite') {
        const toUserId = typeof msg.toUserId === 'string' ? msg.toUserId : '';
        const callId = typeof msg.callId === 'string' ? msg.callId.slice(0, 80) : crypto.randomUUID();
        const mode = msg.mode === 'video' ? 'video' : 'audio';
        if (!toUserId || toUserId === sender.id) return;

        const recipient = authStore.players.find((p) => p.id === toUserId);
        if (!recipient) return;

        const recipientSockets = onlineSockets.get(toUserId);
        if (!recipientSockets || recipientSockets.size === 0) {
          sendJson(ws, {
            type: 'call:unavailable',
            callId,
            toUserId,
            reason: `${recipient.displayName} is currently offline.`,
          });
          return;
        }

        const existingTargetCall = activeCalls.get(toUserId);
        if (existingTargetCall && existingTargetCall.peerId !== sender.id) {
          sendJson(ws, {
            type: 'call:unavailable',
            callId,
            toUserId,
            reason: `${recipient.displayName} is on another call.`,
          });
          return;
        }

        activeCalls.set(sender.id, { peerId: toUserId, callId });
        sendToPlayer(toUserId, {
          type: 'call:incoming',
          callId,
          mode,
          fromUser: toPublicPlayer(sender),
        });
        return;
      }

      if (type === 'call:accept') {
        const toUserId = typeof msg.toUserId === 'string' ? msg.toUserId : '';
        const callId = typeof msg.callId === 'string' ? msg.callId : '';
        const mode = msg.mode === 'video' ? 'video' : 'audio';
        if (!toUserId || !callId) return;

        activeCalls.set(sender.id, { peerId: toUserId, callId });
        activeCalls.set(toUserId, { peerId: sender.id, callId });
        sendToPlayer(toUserId, {
          type: 'call:accepted',
          callId,
          mode,
          fromUser: toPublicPlayer(sender),
        });
        return;
      }

      if (type === 'call:decline') {
        const toUserId = typeof msg.toUserId === 'string' ? msg.toUserId : '';
        const callId = typeof msg.callId === 'string' ? msg.callId : '';
        if (!toUserId || !callId) return;

        if (activeCalls.get(toUserId)?.callId === callId) {
          activeCalls.delete(toUserId);
        }
        if (activeCalls.get(sender.id)?.callId === callId) {
          activeCalls.delete(sender.id);
        }
        sendToPlayer(toUserId, {
          type: 'call:declined',
          callId,
          fromUserId: sender.id,
          fromDisplayName: sender.displayName,
        });
        return;
      }

      if (type === 'call:end') {
        const toUserId = typeof msg.toUserId === 'string' ? msg.toUserId : '';
        const callId = typeof msg.callId === 'string' ? msg.callId : '';
        if (activeCalls.get(sender.id)?.callId === callId) {
          activeCalls.delete(sender.id);
        }
        if (toUserId) {
          if (activeCalls.get(toUserId)?.callId === callId) {
            activeCalls.delete(toUserId);
          }
          sendToPlayer(toUserId, {
            type: 'call:ended',
            callId,
            fromUserId: sender.id,
          });
        }
        return;
      }

      if (type === 'rtc:offer' || type === 'rtc:answer' || type === 'rtc:ice') {
        const toUserId = typeof msg.toUserId === 'string' ? msg.toUserId : '';
        const callId = typeof msg.callId === 'string' ? msg.callId : '';
        if (!toUserId || !callId) return;
        sendToPlayer(toUserId, {
          type,
          callId,
          fromUserId: sender.id,
          sdp: msg.sdp,
          candidate: msg.candidate,
        });
      }
    });

    ws.on('close', () => {
      const uid = ws.playerId;
      if (!uid) return;
      const set = onlineSockets.get(uid);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          onlineSockets.delete(uid);
          const active = activeCalls.get(uid);
          if (active) {
            activeCalls.delete(uid);
            if (activeCalls.get(active.peerId)?.callId === active.callId) {
              activeCalls.delete(active.peerId);
            }
            sendToPlayer(active.peerId, {
              type: 'call:ended',
              callId: active.callId,
              fromUserId: uid,
            });
          }
          broadcastAll({
            type: 'presence:update',
            userId: uid,
            online: false,
          });
        }
      }
    });
  });

  const wsHeartbeat = setInterval(() => {
    for (const client of wss.clients) {
      const authed = client as AuthedSocket;
      if (authed.isAlive === false) {
        authed.terminate();
        continue;
      }
      authed.isAlive = false;
      authed.ping();
    }
  }, 30_000);

  wss.on('close', () => clearInterval(wsHeartbeat));

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AltitudeMAX OS server listening on http://localhost:${PORT}`);
  });
}

startServer();
