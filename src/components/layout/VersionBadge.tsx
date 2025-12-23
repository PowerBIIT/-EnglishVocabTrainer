type VersionBadgeProps = {
  version?: string;
};

export function VersionBadge({ version }: VersionBadgeProps) {
  const normalized = (version ?? '').trim();
  let label = 'dev';
  if (normalized && normalized !== 'unknown') {
    label = normalized.startsWith('v') || normalized.startsWith('V') ? normalized : `v${normalized}`;
  }

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-4 md:right-6 z-40 text-[11px] text-slate-500 dark:text-slate-400">
      <div
        className="rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/70 px-2 py-1 shadow-sm backdrop-blur"
        title={`App version ${label}`}
      >
        {label}
      </div>
    </div>
  );
}
