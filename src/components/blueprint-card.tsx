import { cn } from '@/lib/utils';

interface BlueprintCardProps {
  children: React.ReactNode;
  className?: string;
}

export function BlueprintCard({ children, className }: BlueprintCardProps) {
  return <div className={cn('blueprint-card', className)}>{children}</div>;
}
