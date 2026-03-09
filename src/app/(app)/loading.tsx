export default function AppLoading() {
  return (
    <div className="py-4 space-y-4 animate-fadeIn">
      <div className="h-8 w-32 rounded-lg shimmer" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shimmer" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-2.5 w-16 rounded shimmer" />
              </div>
            </div>
            <div className="h-3 w-full rounded shimmer" />
            <div className="h-3 w-3/4 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
