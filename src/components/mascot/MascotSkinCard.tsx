import { MascotSkin } from '@/data/mascotSkins';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface MascotSkinCardProps {
  skin: MascotSkin;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function MascotSkinCard({ skin, selected = false, onSelect }: MascotSkinCardProps) {
  const language = useLanguage();
  const name = language === 'en' ? skin.nameEn : language === 'uk' ? skin.nameUk : skin.name;
  const description =
    language === 'en'
      ? skin.descriptionEn
      : language === 'uk'
      ? skin.descriptionUk
      : skin.description;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(skin.id)}
      className={cn(
        'w-full rounded-2xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-transparent bg-gradient-to-br from-primary-50 to-pink-50 dark:from-primary-900/40 dark:to-pink-900/40 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500'
          : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          'shrink-0 p-1 rounded-2xl transition-all',
          selected && 'bg-gradient-to-br from-primary-100 to-pink-100 dark:from-primary-800/50 dark:to-pink-800/50'
        )}>
          <MascotAvatar skinId={skin.id} size={72} />
        </div>
        <div>
          <p className={cn(
            'text-base font-semibold',
            selected
              ? 'bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent'
              : 'text-slate-800 dark:text-slate-100'
          )}>
            {name}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
