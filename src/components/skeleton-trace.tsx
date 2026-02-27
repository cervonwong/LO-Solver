export function SkeletonTrace() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 animate-shimmer rounded" />
            <div className="h-4 w-32 animate-shimmer rounded" />
            <div className="ml-auto h-4 w-16 animate-shimmer rounded" />
          </div>
          <div className="h-3 w-3/4 animate-shimmer rounded" />
          <div className="h-3 w-1/2 animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}
