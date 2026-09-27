import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import KanbanColumn from '@/components/tasks/kanban-column';
import TaskCard from '@/components/tasks/task-card';
import { cn } from '@/lib/utils';
import type { EnumOption, Task, TaskStatusValue } from '@/types';

type KanbanBoardProps = {
    tasks: Task[];
    statusOptions: EnumOption<TaskStatusValue>[];
    visibleStatuses: TaskStatusValue[];
    onStatusChange: (task: Task, status: TaskStatusValue) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
};

export default function KanbanBoard({
    tasks,
    statusOptions,
    visibleStatuses,
    onStatusChange,
    onEdit,
    onDelete,
}: KanbanBoardProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
        useSensor(KeyboardSensor),
    );

    const columns = statusOptions.filter((option) =>
        visibleStatuses.includes(option.value),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        const task = active.data.current?.task as Task | undefined;

        if (!task || !over || over.id === task.status.value) {
            return;
        }

        onStatusChange(task, over.id as TaskStatusValue);
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
                className={cn(
                    'grid gap-4',
                    columns.length === 3 && 'md:grid-cols-3',
                    columns.length === 2 && 'md:grid-cols-2',
                )}
            >
                {columns.map((status) => {
                    const columnTasks = tasks.filter(
                        (task) => task.status.value === status.value,
                    );

                    return (
                        <KanbanColumn
                            key={status.value}
                            status={status}
                            count={columnTasks.length}
                        >
                            {columnTasks.length === 0 ? (
                                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                                    Solte uma tarefa aqui
                                </p>
                            ) : (
                                columnTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        statusOptions={statusOptions}
                                        onStatusChange={onStatusChange}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                ))
                            )}
                        </KanbanColumn>
                    );
                })}
            </div>
        </DndContext>
    );
}
