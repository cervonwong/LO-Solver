import Image from 'next/image';

export function LexMascot() {
  return (
    <div className="flex items-start">
      <Image
        src="/lex-mascot.png"
        alt="Lex the duck mascot"
        width={60}
        height={60}
        className="shrink-0"
      />

      {/* SVG tail — sits on top of the bubble's left border via z-10 */}
      <svg
        width="12"
        height="24"
        viewBox="0 0 12 24"
        className="relative z-10 mt-3 shrink-0"
        style={{ marginRight: '-1px' }}
      >
        <polygon points="0,12 12,0 12,24" style={{ fill: 'var(--surface-1)' }} stroke="none" />
        <polyline
          points="12,0 0,12 12,24"
          fill="none"
          style={{ stroke: 'var(--border-strong)' }}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Speech bubble with crosshair corner extensions */}
      <div className="speech-bubble px-4 py-3">
        <p className="font-heading text-base leading-relaxed">
          I&apos;m Lex, the Linguistics Olympiad Problem solving duck!{' '}
          <span className="text-accent">Copy and paste</span> a LO Problem below or try one of my
          examples!
        </p>
      </div>
    </div>
  );
}
