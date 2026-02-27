export function LexMascot() {
  return (
    <div className="flex items-start gap-0">
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

      {/* Speech bubble as single SVG with embedded foreignObject for text */}
      <svg viewBox="0 0 400 80" className="h-auto w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
        {/* Tail pointing left */}
        <polygon points="0,30 12,24 12,36" fill="rgba(0,40,80,0.6)" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinejoin="round" />
        {/* Bubble rectangle */}
        <rect x="12" y="4" width="384" height="72" rx="0" fill="rgba(0,40,80,0.6)" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
        {/* Cover the tail-to-rect seam */}
        <line x1="12" y1="25" x2="12" y2="36" stroke="rgba(0,40,80,0.6)" strokeWidth="2" />
        <foreignObject x="24" y="10" width="360" height="60">
          <p
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.85)', margin: 0 }}
          >
            I&apos;m Lex, the Linguistics Olympiad Problem solving duck!{' '}
            <span style={{ color: '#00ffff' }}>Copy and paste</span> a LO Problem below or try one
            of my examples!
          </p>
        </foreignObject>
      </svg>
    </div>
  );
}
