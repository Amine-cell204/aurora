export type AppId =
  | 'games'
  | 'comm'
  | 'soundcloud'
  | 'youtube'
  | 'browser'
  | 'settings';

export type WallpaperId =
  | 'aurora'
  | 'midnight'
  | 'emerald'
  | 'sunset'
  | 'obsidian'
  | 'nordic'
  | 'custom';

export interface ClockPrefs {
  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
}

export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  role: 'owner' | 'player';
  createdAt: string;
}

export interface AuthStatus {
  playerCount: number;
}

export interface CommContact extends PlayerProfile {
  online: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface ChatMessage {
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

export type CallMode = 'audio' | 'video';

export interface IncomingCallInfo {
  callId: string;
  fromUser: PlayerProfile;
  mode: CallMode;
}

export interface ActiveCallState {
  callId: string;
  peer: PlayerProfile;
  mode: CallMode;
  status: 'calling' | 'connecting' | 'connected';
  startedAt: number | null;
  micMuted: boolean;
  camOff: boolean;
  mediaNote?: string;
}

export interface SoundCloudItem {
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

export interface WindowState {
  id: AppId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppMeta {
  id: AppId;
  title: string;
  shortTitle: string;
  accent: string;
  showInDock: boolean;
  category: 'core' | 'media' | 'games';
  description: string;
}

export const APPS_CATALOG: Record<AppId, AppMeta> = {
  games: {
    id: 'games',
    title: 'Games',
    shortTitle: 'Games',
    accent: '#f97316',
    showInDock: true,
    category: 'games',
    description: 'Play real online multiplayer, racing, action & puzzle games',
  },
  comm: {
    id: 'comm',
    title: 'Messages & Calls',
    shortTitle: 'Messages',
    accent: '#10b981',
    showInDock: true,
    category: 'core',
    description: 'Real-time player messaging, voice & video calling',
  },
  soundcloud: {
    id: 'soundcloud',
    title: 'SoundCloud',
    shortTitle: 'SoundCloud',
    accent: '#ff5500',
    showInDock: true,
    category: 'media',
    description: 'Full-length SoundCloud tracks, charts, playlists & artists',
  },
  youtube: {
    id: 'youtube',
    title: 'YouTube',
    shortTitle: 'YouTube',
    accent: '#ef4444',
    showInDock: true,
    category: 'media',
    description: 'Search and watch real YouTube videos & gaming streams',
  },
  browser: {
    id: 'browser',
    title: 'Brave Browser',
    shortTitle: 'Brave',
    accent: '#fb542b',
    showInDock: true,
    category: 'core',
    description: 'Privacy-first browser with Brave Shields, Live Web & Search',
  },
  settings: {
    id: 'settings',
    title: 'System Settings',
    shortTitle: 'Settings',
    accent: '#64748b',
    showInDock: true,
    category: 'core',
    description: 'Wallpaper backgrounds, OS software updates, clock & battery',
  },
};
