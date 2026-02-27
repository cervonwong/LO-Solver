export function SkeletonTrace() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border border-[rgba(255,255,255,0.15)] p-3">
          <svg
            width="100%"
            height="20"
            viewBox="0 0 400 20"
            preserveAspectRatio="none"
            className="text-foreground"
          >
            <line
              x1="0"
              y1="10"
              x2="400"
              y2="10"
              stroke="currentColor"
              strokeWidth="0.5"
              className="animate-plotter"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          </svg>
          <svg
            width="60%"
            height="12"
            viewBox="0 0 240 12"
            preserveAspectRatio="none"
            className="mt-2 text-muted-foreground"
          >
            <line
              x1="0"
              y1="6"
              x2="240"
              y2="6"
              stroke="currentColor"
              strokeWidth="0.5"
              className="animate-plotter"
              style={{ animationDelay: `${i * 200 + 100}ms` }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
