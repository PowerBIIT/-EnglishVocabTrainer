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
        aria-label={`Henio ${skin.name}`}
      >
        <defs>
          <linearGradient id={`fur-${skin.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8f8f8" />
          </linearGradient>
          <linearGradient id={`bg-${skin.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={skin.colors.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={skin.colors.body} stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id={`bg-radial-${skin.id}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor={skin.colors.accent} stopOpacity="0.25" />
            <stop offset="70%" stopColor={skin.colors.body} stopOpacity="0.15" />
            <stop offset="100%" stopColor={skin.colors.body} stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Background circle with color */}
        <circle cx="60" cy="60" r="54" fill={`url(#bg-radial-${skin.id})`} />

        {/* Dog body */}
        <ellipse cx="60" cy="75" rx="28" ry="24" fill={`url(#fur-${skin.id})`} stroke="#d0d0d0" strokeWidth="1.5" />

        {/* Dog head */}
        <ellipse cx="60" cy="50" rx="24" ry="26" fill={`url(#fur-${skin.id})`} stroke="#d0d0d0" strokeWidth="1.5" />

        {/* Ears */}
        <ellipse cx="42" cy="42" rx="8" ry="16" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="1.5" />
        <ellipse cx="78" cy="42" rx="8" ry="16" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="1.5" />

        {/* Snout */}
        <ellipse cx="60" cy="58" rx="12" ry="10" fill="#fafafa" stroke="#d0d0d0" strokeWidth="1" />

        {/* Nose */}
        <ellipse cx="60" cy="60" rx="4" ry="3" fill="#2d2d2d" />

        {/* Eyes */}
        <circle cx="52" cy="48" r="3" fill="#2d2d2d" />
        <circle cx="68" cy="48" r="3" fill="#2d2d2d" />
        <circle cx="53" cy="47" r="1" fill="#ffffff" />
        <circle cx="69" cy="47" r="1" fill="#ffffff" />

        {/* Accessory/collar with skin colors */}
        <ellipse cx="60" cy="70" rx="16" ry="4" fill={skin.colors.accent} opacity="0.8" />
        <circle cx="60" cy="70" r="3" fill={skin.colors.gear} />

        {/* Tail (curved) */}
        <path d="M 80 78 Q 92 72 94 80 Q 92 84 86 82" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="1.5" />

        {/* Front paws */}
        <ellipse cx="50" cy="95" rx="5" ry="8" fill="#fafafa" stroke="#d0d0d0" strokeWidth="1" />
        <ellipse cx="70" cy="95" rx="5" ry="8" fill="#fafafa" stroke="#d0d0d0" strokeWidth="1" />

        {/* Decorative element (bow or accessory) based on skin */}
        {skin.id === 'explorer' && (
          <path d="M 52 35 L 48 32 L 52 29 L 56 32 Z M 68 35 L 72 32 L 68 29 L 64 32 Z" fill={skin.colors.accent} />
        )}
        {skin.id === 'forest-scout' && (
          <circle cx="60" cy="32" r="4" fill={skin.colors.accent} />
        )}
        {skin.id === 'desert-nomad' && (
          <rect x="54" y="30" width="12" height="3" rx="1.5" fill={skin.colors.accent} />
        )}
        {skin.id === 'arctic-ranger' && (
          <>
            <circle cx="56" cy="32" r="2.5" fill={skin.colors.accent} />
            <circle cx="64" cy="32" r="2.5" fill={skin.colors.accent} />
          </>
        )}
        {skin.id === 'sky-captain' && (
          <>
            {/* Bow tie - left wing */}
            <path d="M 44 70 L 54 66 L 54 74 Z" fill={skin.colors.accent} />
            {/* Bow tie - right wing */}
            <path d="M 76 70 L 66 66 L 66 74 Z" fill={skin.colors.accent} />
            {/* Bow tie - center knot */}
            <rect x="54" y="67" width="12" height="6" rx="1" fill={skin.colors.gear} />
          </>
        )}
        {skin.id === 'ruins-diver' && (
          <rect x="56" y="29" width="8" height="5" rx="2" fill={skin.colors.accent} />
        )}
      </svg>
    </div>
  );
}
