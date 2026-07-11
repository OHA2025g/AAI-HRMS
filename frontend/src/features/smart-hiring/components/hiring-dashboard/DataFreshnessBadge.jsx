export default function DataFreshnessBadge({ asOf, freshness = 'live', cacheSeconds }) {
  if (!asOf) return null;
  const label = freshness === 'cached' ? 'Cached' : 'Live';
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2f7] px-3 py-1.5 text-[13px] font-semibold text-slate-500">
      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
      <span>
        {label} · as of {new Date(asOf).toLocaleString()}
        {cacheSeconds ? ` · refreshes every ${cacheSeconds}s` : ''}
      </span>
    </div>
  );
}
