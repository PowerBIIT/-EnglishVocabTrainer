import { mascotSkins } from '@/data/mascotSkins';
import { cn } from '@/lib/utils';

interface MascotAvatarProps {
  skinId: string;
  size?: number;
  className?: string;
}

export function MascotAvatar({ skinId, size = 120, className }: MascotAvatarProps) {
  const skin = mascotSkins.find((item) => item.id === skinId) ?? mascotSkins[0];

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Mascot ${skin.name}`}
      >
        <defs>
          <linearGradient id={`body-${skin.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={skin.colors.body} stopOpacity="0.95" />
            <stop offset="100%" stopColor={skin.colors.accent} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill="rgba(255,255,255,0.65)" />
        <rect x="34" y="46" width="52" height="50" rx="18" fill={`url(#body-${skin.id})`} />
        <rect x="40" y="20" width="40" height="34" rx="14" fill={skin.colors.body} />
        <rect x="45" y="28" width="30" height="16" rx="8" fill={skin.colors.visor} />
        <circle cx="52" cy="36" r="3" fill={skin.colors.gear} />
        <circle cx="68" cy="36" r="3" fill={skin.colors.gear} />
        <rect x="54" y="68" width="12" height="12" rx="4" fill={skin.colors.visor} />
        <circle cx="86" cy="70" r="8" fill={skin.colors.accent} />
        <circle cx="86" cy="70" r="4" fill={skin.colors.visor} />
        <path d="M24 56 L34 64 L24 72 Z" fill={skin.colors.gear} />
        <path d="M96 56 L86 64 L96 72 Z" fill={skin.colors.gear} />
      </svg>
    </div>
  );
}
