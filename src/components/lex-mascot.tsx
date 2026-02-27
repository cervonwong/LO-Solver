export function LexMascot() {
  return (
    <div className="flex items-start">
      {/* Duck placeholder — blueprint-line style square */}
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
          <circle cx="16" cy="12" r="8" />
          <ellipse cx="20" cy="28" rx="14" ry="10" />
          <path d="M24 12 L30 10 L28 14" />
          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* SVG tail */}
      <svg
        width="12"
        height="24"
        viewBox="0 0 12 24"
        className="mt-3 shrink-0"
        style={{ marginRight: '-1px' }}
      >
        <polygon
          points="0,12 12,0 12,24"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Hide the right edge so it merges with the bubble border */}
        <line x1="12" y1="0" x2="12" y2="24" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      </svg>

      {/* Speech bubble with backdrop blur */}
      <div className="frosted border border-foreground px-4 py-3">
        <p className="font-heading text-base leading-relaxed">
          I&apos;m Lex, the Linguistics Olympiad Problem solving duck!{' '}
          <span className="text-accent">Copy and paste</span> a LO Problem below or try one of my
          examples!
        </p>
      </div>
    </div>
  );
}
