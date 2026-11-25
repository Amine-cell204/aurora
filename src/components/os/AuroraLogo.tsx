interface AuroraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showVersion?: string;
}

export function AuroraLogo({ size = 'sm', showVersion }: AuroraLogoProps) {
  const shieldDim =
    size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const textSize =
    size === 'lg' ? 'text-xl' : size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span className="inline-flex items-center gap-1.5 leading-none select-none">
      {/* Red Shield Emblem */}
      <svg
        viewBox="0 0 24 24"
        className={`${shieldDim} shrink-0 drop-shadow-[0_1px_4px_rgba(239,68,68,0.55)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="auroraRedShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="55%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        </defs>
        <path
          d="M12 2L4 5.4V11.3C4 16.4 7.4 20.9 12 22.3C16.6 20.9 20 16.4 20 11.3V5.4L12 2Z"
          fill="url(#auroraRedShieldGrad)"
          stroke="#fecaca"
          strokeOpacity="0.65"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M12 4.3L6.2 6.8V11.2C6.2 15.1 8.7 18.6 12 19.9V4.3Z"
          fill="#ffffff"
          fillOpacity="0.18"
        />
      </svg>

      {/* Left-Angled AltitudeMAX OS Wordmark (level baseline) */}
      <span
        className={`inline-block font-[family-name:var(--font-display)] font-bold tracking-tight leading-none text-white skew-x-[14deg] px-0.5 ${textSize}`}
      >
        AltitudeMAX OS
      </span>

      {showVersion && (
        <span className="hidden sm:inline text-[10px] font-medium leading-none text-white/45 tabular-nums ml-0.5">
          {showVersion}
        </span>
      )}
    </span>
  );
}
