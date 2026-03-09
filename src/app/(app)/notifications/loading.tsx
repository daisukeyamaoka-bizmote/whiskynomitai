export default function NotificationsLoading() {
  return (
    <div className="py-4 space-y-3 animate-fadeIn">
      <div className="h-6 w-16 rounded shimmer" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full shimmer flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded shimmer" />
            <div className="h-2.5 w-1/2 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
