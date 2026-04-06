import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ThreatBadgeProps {
  level: 'Low' | 'Medium' | 'High';
}

export function ThreatBadge({ level }: ThreatBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold px-1.5',
        level === 'High' && 'border-red-500 text-red-400 bg-red-950/30',
        level === 'Medium' && 'border-yellow-500 text-yellow-400 bg-yellow-950/30',
        level === 'Low' && 'border-green-500 text-green-400 bg-green-950/30'
      )}
    >
      {level}
    </Badge>
  );
}
