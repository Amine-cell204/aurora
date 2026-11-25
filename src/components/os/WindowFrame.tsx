import { useRef, ReactNode } from 'react';
import { motion } from 'motion/react';
import { X, Minus, Maximize2, Minimize2, ChevronLeft } from 'lucide-react';
import { AppId, WindowState } from '../../types/os';

interface WindowFrameProps {
  win: WindowState;
  isActive: boolean;
  isMobile: boolean;
  onFocus: (id: AppId) => void;
  onClose: (id: AppId) => void;
  onMinimize: (id: AppId) => void;
  onToggleMaximize: (id: AppId) => void;
  onMove: (id: AppId, x: number, y: number) => void;
  onResize: (id: AppId, width: number, height: number) => void;
  children: ReactNode;
}

export function WindowFrame({
  win,
  isActive,
  isMobile,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
}: WindowFrameProps) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  if (!win.isOpen || win.isMinimized) return null;

  const surfaceClass = 'bg-slate-950/78 backdrop-blur-2xl border-white/20';

  if (isMobile) {
    if (!isActive) return null;
    return (
      <motion.section
        key={win.id}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ zIndex: win.zIndex }}
        className={`fixed top-8 bottom-14 inset-x-0 flex flex-col ${surfaceClass} border-t overflow-hidden`}
      >
        <div className="h-11 px-3 flex items-center justify-between border-b border-white/12 bg-white/5 shrink-0">
          <button
            onClick={() => onMinimize(win.id)}
            className="min-h-[36px] px-2 flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Desktop</span>
          </button>
          <span className="text-sm font-semibold text-white truncate max-w-[50vw]">
            {win.title}
          </span>
          <button
            onClick={() => onClose(win.id)}
            className="min-h-[36px] px-2 text-xs font-medium text-white/60 hover:text-rose-400"
          >
            Close
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden relative">{children}</div>
      </motion.section>
    );
  }

  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (win.isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus(win.id);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
  };

  const handleTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = Math.max(0, window.innerWidth - 160);
    const maxY = Math.max(28, window.innerHeight - 120);
    const nextX = Math.min(maxX, Math.max(-win.width + 160, dragRef.current.origX + dx));
    const nextY = Math.min(maxY, Math.max(28, dragRef.current.origY + dy));
    onMove(win.id, nextX, nextY);
  };

  const handleTitlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (win.isMaximized) return;
    e.stopPropagation();
    onFocus(win.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: win.width,
      origH: win.height,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const nextW = Math.max(380, Math.min(window.innerWidth - 20, resizeRef.current.origW + dx));
    const nextH = Math.max(320, Math.min(window.innerHeight - 96, resizeRef.current.origH + dy));
    onResize(win.id, nextW, nextH);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      resizeRef.current = null;
    }
  };

  const style: React.CSSProperties = win.isMaximized
    ? {
        top: 32,
        left: 8,
        right: 8,
        bottom: 76,
        width: 'auto',
        height: 'auto',
        zIndex: win.zIndex,
      }
    : {
        top: win.y,
        left: win.x,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      onPointerDown={() => onFocus(win.id)}
      className={`fixed flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${surfaceClass} ${
        isActive ? 'ring-1 ring-white/25 shadow-black/70' : 'opacity-95 shadow-black/45'
      }`}
    >
      {/* macOS Titlebar */}
      <div
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={() => onToggleMaximize(win.id)}
        className="h-10 px-3.5 flex items-center justify-between border-b border-white/10 bg-white/[0.04] shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 group shrink-0">
          <button
            onClick={() => onClose(win.id)}
            aria-label={`Close ${win.title}`}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] hover:brightness-110 flex items-center justify-center text-black/75 transition-transform active:scale-90"
          >
            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => onMinimize(win.id)}
            aria-label={`Minimize ${win.title}`}
            className="w-3.5 h-3.5 rounded-full bg-[#febc2e] hover:brightness-110 flex items-center justify-center text-black/75 transition-transform active:scale-90"
          >
            <Minus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => onToggleMaximize(win.id)}
            aria-label={win.isMaximized ? `Restore ${win.title}` : `Maximize ${win.title}`}
            className="w-3.5 h-3.5 rounded-full bg-[#28c840] hover:brightness-110 flex items-center justify-center text-black/75 transition-transform active:scale-90"
          >
            {win.isMaximized ? (
              <Minimize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        <div className="text-xs font-semibold text-white/90 truncate px-3 pointer-events-none">
          {win.title}
        </div>

        <div className="w-12 shrink-0" />
      </div>

      {/* App Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">{children}</div>

      {/* Bottom-Right Resize Grip */}
      {!win.isMaximized && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          title="Resize window"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30"
        />
      )}
    </motion.section>
  );
}
