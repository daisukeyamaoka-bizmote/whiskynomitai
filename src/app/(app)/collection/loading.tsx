export default function CollectionLoading() {
  return (
    <div className="py-4 space-y-4 animate-fadeIn">
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-full shimmer" />
        <div className="h-9 w-24 rounded-full shimmer" />
      </div>
      <div className="h-10 w-full rounded-xl shimmer" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card overflow-hidden">
            <div className="aspect-square shimmer" />
            <div className="p-2.5 space-y-1.5">
              <div className="h-3 w-3/4 rounded shimmer" />
              <div className="h-2.5 w-1/2 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
