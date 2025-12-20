import { MascotSkin } from '@/data/mascotSkins';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { cn } from '@/lib/utils';

interface MascotSkinCardProps {
  skin: MascotSkin;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function MascotSkinCard({ skin, selected = false, onSelect }: MascotSkinCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(skin.id)}
      className={cn(
        'w-full rounded-2xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:border-slate-300'
      )}
    >
      <div className="flex items-center gap-4">
        <MascotAvatar skinId={skin.id} size={72} className="shrink-0" />
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {skin.name}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {skin.description}
          </p>
        </div>
      </div>
    </button>
  );
}
