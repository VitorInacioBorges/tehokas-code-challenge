import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    AlertTriangle,
    CalendarClock,
    GripVertical,
    MoreHorizontal,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDeadline } from '@/lib/date';
import { cn } from '@/lib/utils';
import type {
    EnumOption,
    Task,
    TaskPriorityValue,
    TaskStatusValue,
} from '@/types';

const priorityStyles: Record<TaskPriorityValue, string> = {
    low: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    medium: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    high: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

type TaskCardProps = {
    task: Task;
    statusOptions: EnumOption<TaskStatusValue>[];
    onStatusChange: (task: Task, status: TaskStatusValue) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
};

export default function TaskCard({
    task,
    statusOptions,
    onStatusChange,
    onEdit,
    onDelete,
}: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id: task.id, data: { task } });

    return (
        <article
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={cn(
                'space-y-3 rounded-lg border bg-card p-3 shadow-xs',
                task.is_overdue && 'border-red-300 dark:border-red-500/50',
                isDragging &&
                    'z-10 opacity-80 shadow-lg ring-2 ring-primary/40',
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    aria-label={`Arrastar tarefa ${task.title}`}
                    className="mt-0.5 cursor-grab touch-none rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                >
                    <GripVertical className="size-4" />
                </button>
                <h3 className="flex-1 text-sm leading-snug font-medium">
                    {task.title}
                </h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-mt-1 -mr-1 size-7"
                            aria-label={`Ações da tarefa ${task.title}`}
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(task)}>
                            <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onDelete(task)}
                        >
                            <Trash2 /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {task.description && (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                    {task.description}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={priorityStyles[task.priority.value]}>
                    {task.priority.label}
                </Badge>
                <span
                    className={cn(
                        'inline-flex items-center gap-1',
                        task.is_overdue
                            ? 'font-medium text-red-600 dark:text-red-400'
                            : 'text-muted-foreground',
                    )}
                >
                    {task.is_overdue ? (
                        <AlertTriangle className="size-3.5" />
                    ) : (
                        <CalendarClock className="size-3.5" />
                    )}
                    {task.is_overdue && 'Atrasada · '}
                    {formatDeadline(task.deadline)}
                </span>
            </div>

            <Select
                value={task.status.value}
                onValueChange={(value) =>
                    onStatusChange(task, value as TaskStatusValue)
                }
            >
                <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label={`Status da tarefa ${task.title}`}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </article>
    );
}
