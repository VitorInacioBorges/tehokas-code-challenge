import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { EnumOption, TaskStatusValue } from '@/types';

export default function KanbanColumn({
    status,
    count,
    children,
}: {
    status: EnumOption<TaskStatusValue>;
    count: number;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.value });

    return (
        <section
            ref={setNodeRef}
            aria-label={`Coluna ${status.label}`}
            className={cn(
                'flex min-h-40 flex-col gap-3 rounded-xl border bg-muted/40 p-3 transition-colors',
                isOver && 'border-primary/50 bg-primary/5',
            )}
        >
            <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{status.label}</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {count}
                </span>
            </header>
            {children}
        </section>
    );
}
