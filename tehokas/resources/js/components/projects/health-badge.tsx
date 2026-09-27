import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EnumOption, ProjectHealthValue } from '@/types';

const healthStyles: Record<ProjectHealthValue, string> = {
    healthy:
        'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    alert: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    no_tasks:
        'border-transparent bg-muted text-muted-foreground dark:bg-muted/60',
};

export default function HealthBadge({
    health,
    className,
}: {
    health: EnumOption<ProjectHealthValue>;
    className?: string;
}) {
    return (
        <Badge className={cn(healthStyles[health.value], className)}>
            <span
                aria-hidden
                className={cn(
                    'size-1.5 rounded-full',
                    health.value === 'healthy' && 'bg-emerald-500',
                    health.value === 'alert' && 'bg-red-500',
                    health.value === 'no_tasks' && 'bg-muted-foreground',
                )}
            />
            {health.label}
        </Badge>
    );
}
