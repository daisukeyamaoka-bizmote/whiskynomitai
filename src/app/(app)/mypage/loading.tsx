export default function MypageLoading() {
  return (
    <div className="py-4 space-y-5 animate-fadeIn">
      <div className="flex items-center gap-4 p-4">
        <div className="w-20 h-20 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded shimmer" />
          <div className="h-3 w-48 rounded shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-3 text-center space-y-2">
            <div className="w-5 h-5 rounded shimmer mx-auto" />
            <div className="h-5 w-8 rounded shimmer mx-auto" />
            <div className="h-3 w-12 rounded shimmer mx-auto" />
          </div>
        ))}
      </div>
      <div className="glass-card p-4 space-y-3">
        <div className="h-4 w-24 rounded shimmer" />
        <div className="h-3 w-full rounded shimmer" />
        <div className="h-3 w-2/3 rounded shimmer" />
      </div>
    </div>
  );
}
