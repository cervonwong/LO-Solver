export function LexMascot() {
  return (
    <div className="flex items-start gap-4">
      {/* Duck placeholder — blueprint-line style circle */}
      <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center border border-foreground">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground"
        >
          {/* Simple duck outline drawn in blueprint line style */}
          <circle cx="16" cy="12" r="8" />
          <ellipse cx="20" cy="28" rx="14" ry="10" />
          <path d="M24 12 L30 10 L28 14" />
          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* Speech bubble */}
      <div className="relative border border-foreground bg-card px-4 py-3">
        {/* Bubble tail */}
        <div
          className="absolute -left-2 top-4 h-3 w-3 border-b border-l border-foreground bg-card"
          style={{ transform: 'rotate(45deg)' }}
        />
        <p className="font-heading text-base leading-relaxed">
          I&apos;m Lex, the Linguistics Olympiad Problem solving duck!{' '}
          <span className="text-accent">Copy and paste</span> a LO Problem below or try one of my
          examples!
        </p>
      </div>
    </div>
  );
}
