'use client';

import type { ReactNode } from 'react';

interface LabeledListProps {
  data: Record<string, unknown>;
  label?: string;
  className?: string;
}

export function LabeledList({ data, label, className }: LabeledListProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className={className}>
        {label && (
          <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
        )}
        <span className="text-[11px] italic text-muted-foreground">empty</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      )}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <Entries entries={entries} depth={0} />
      </div>
    </div>
  );
}

function Entries({ entries, depth }: { entries: [string, unknown][]; depth: number }) {
  return (
    <>
      {entries.map(([key, value]) => (
        <EntryRow key={key} entryKey={key} value={value} depth={depth} />
      ))}
    </>
  );
}

function EntryRow({
  entryKey,
  value,
  depth,
}: {
  entryKey: string;
  value: unknown;
  depth: number;
}) {
  // Nested object within depth limit
  if (isPlainObject(value) && depth < 2) {
    const subEntries = Object.entries(value as Record<string, unknown>);
    if (subEntries.length === 0) {
      return (
        <>
          <span className="text-[11px] text-muted-foreground">{entryKey}</span>
          <span className="text-[11px] italic text-muted-foreground">empty</span>
        </>
      );
    }
    return (
      <>
        {/* Parent key label spanning both columns */}
        <span className="col-span-2 text-[11px] text-muted-foreground">{entryKey}</span>
        {/* Indented children */}
        <div className="col-span-2 pl-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <Entries entries={subEntries} depth={depth + 1} />
          </div>
        </div>
      </>
    );
  }

  // Array handling
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <>
          <span className="text-[11px] text-muted-foreground">{entryKey}</span>
          <span className="text-[11px] italic text-muted-foreground">empty</span>
        </>
      );
    }
    return (
      <>
        {/* Array parent key */}
        <span className="col-span-2 text-[11px] text-muted-foreground">{entryKey}</span>
        <div className="col-span-2 pl-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {value.map((item, i) => (
              <ArrayItem key={i} index={i} value={item} depth={depth + 1} />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Leaf value
  return (
    <>
      <span className="text-[11px] text-muted-foreground">{entryKey}</span>
      <ValueDisplay value={value} depth={depth} />
    </>
  );
}

function ArrayItem({ index, value, depth }: { index: number; value: unknown; depth: number }) {
  const label = `[${index}]`;

  // Object items in arrays within depth limit
  if (isPlainObject(value) && depth < 2) {
    const subEntries = Object.entries(value as Record<string, unknown>);
    if (subEntries.length === 0) {
      return (
        <>
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-[11px] italic text-muted-foreground">empty</span>
        </>
      );
    }
    return (
      <>
        <span className="col-span-2 text-[11px] text-muted-foreground">{label}</span>
        <div className="col-span-2 pl-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <Entries entries={subEntries} depth={depth + 1} />
          </div>
        </div>
      </>
    );
  }

  // Leaf array item
  return (
    <>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <ValueDisplay value={value} depth={depth} />
    </>
  );
}

function ValueDisplay({ value, depth }: { value: unknown; depth: number }): ReactNode {
  if (value === null) {
    return <span className="text-[11px] italic text-muted-foreground">null</span>;
  }
  if (value === undefined) {
    return <span className="text-[11px] italic text-muted-foreground">undefined</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-[11px]">{value ? 'true' : 'false'}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-[11px]">{String(value)}</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-[11px] break-words">{value}</span>;
  }
  // Object or array beyond depth limit -- inline JSON
  if (isPlainObject(value) || Array.isArray(value)) {
    return (
      <span className="text-[10px] font-mono text-muted-foreground break-words">
        {JSON.stringify(value)}
      </span>
    );
  }
  // Fallback
  return <span className="text-[11px] break-words">{String(value)}</span>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
