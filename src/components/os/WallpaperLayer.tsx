import { WallpaperId } from '../../types/os';

interface WallpaperLayerProps {
  wallpaper: WallpaperId;
  customBgUrl?: string;
  bgDim?: number;
  bgBlur?: boolean;
}

export function WallpaperLayer({
  wallpaper,
  customBgUrl = '',
  bgDim = 25,
  bgBlur = false,
}: WallpaperLayerProps) {
  const dimOpacity = Math.min(0.8, Math.max(0, bgDim / 100));

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#07090f]">
      <div className={`w-full h-full transition-all duration-500 ${bgBlur ? 'blur-sm scale-105' : ''}`}>
        {wallpaper === 'aurora' && (
          <img
            src="/src/assets/images/wallpaper_macos_aurora_1795490525340.jpg"
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105 opacity-95 transition-opacity duration-500"
          />
        )}

        {wallpaper === 'custom' && customBgUrl && (
          <img
            src={customBgUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        )}

        {wallpaper === 'custom' && !customBgUrl && (
          <img
            src="/src/assets/images/wallpaper_macos_aurora_1795490525340.jpg"
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105 opacity-95 transition-opacity duration-500"
          />
        )}

        {wallpaper === 'midnight' && (
          <div
            className="w-full h-full transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(120% 90% at 15% 10%, rgba(56, 189, 248, 0.24) 0%, transparent 55%), radial-gradient(90% 80% at 85% 85%, rgba(99, 102, 241, 0.28) 0%, transparent 55%), linear-gradient(145deg, #060913 0%, #0f172a 52%, #131c31 100%)',
            }}
          />
        )}

        {wallpaper === 'emerald' && (
          <div
            className="w-full h-full transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(110% 85% at 20% 20%, rgba(16, 185, 129, 0.25) 0%, transparent 55%), radial-gradient(90% 80% at 80% 75%, rgba(14, 165, 233, 0.22) 0%, transparent 55%), linear-gradient(145deg, #051014 0%, #091d22 50%, #0a141d 100%)',
            }}
          />
        )}

        {wallpaper === 'sunset' && (
          <div
            className="w-full h-full transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(110% 85% at 75% 15%, rgba(249, 115, 22, 0.26) 0%, transparent 55%), radial-gradient(90% 80% at 20% 80%, rgba(225, 29, 72, 0.22) 0%, transparent 55%), linear-gradient(145deg, #120912 0%, #1d1221 50%, #0c0e18 100%)',
            }}
          />
        )}

        {wallpaper === 'obsidian' && (
          <div
            className="w-full h-full transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(100% 80% at 25% 15%, rgba(168, 85, 247, 0.22) 0%, transparent 55%), radial-gradient(90% 85% at 80% 85%, rgba(236, 72, 153, 0.18) 0%, transparent 55%), linear-gradient(155deg, #09090b 0%, #18181b 55%, #090a0f 100%)',
            }}
          />
        )}

        {wallpaper === 'nordic' && (
          <div
            className="w-full h-full transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(110% 90% at 70% 20%, rgba(125, 211, 252, 0.22) 0%, transparent 55%), radial-gradient(95% 80% at 15% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 55%), linear-gradient(145deg, #0b1320 0%, #17253b 52%, #0d1624 100%)',
            }}
          />
        )}
      </div>

      {/* Adjustable Background Dim Overlay */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: dimOpacity }}
      />
    </div>
  );
}
