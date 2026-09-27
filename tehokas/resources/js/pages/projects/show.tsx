import { Head, router, setLayoutProps } from '@inertiajs/react';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TaskStatusController from '@/actions/App/Http/Controllers/TaskStatusController';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import HealthBadge from '@/components/projects/health-badge';
import ProjectFormDialog from '@/components/projects/project-form-dialog';
import KanbanBoard from '@/components/tasks/kanban-board';
import TaskFilters from '@/components/tasks/task-filters';
import type { TaskFiltersValue } from '@/components/tasks/task-filters';
import TaskFormDialog from '@/components/tasks/task-form-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dashboard } from '@/routes';
import type {
    EnumOption,
    Project,
    Task,
    TaskPriorityValue,
    TaskStatusValue,
} from '@/types';

type ProjectBoardProps = {
    project: Project;
    tasks: Task[];
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
    filters: TaskFiltersValue;
};

export default function ProjectBoard({
    project,
    tasks,
    statusOptions,
    priorityOptions,
    filters,
}: ProjectBoardProps) {
    const [isTaskFormOpen, setTaskFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>();
    const [deletingTask, setDeletingTask] = useState<Task | undefined>();
    const [isProjectFormOpen, setProjectFormOpen] = useState(false);
    const [isProjectDeleteOpen, setProjectDeleteOpen] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Projetos', href: dashboard() },
            { title: project.name, href: ProjectController.show(project.id) },
        ],
    });

    function changeTaskStatus(task: Task, status: TaskStatusValue) {
        if (task.status.value === status) {
            return;
        }

        const statusOption = statusOptions.find(
            (option) => option.value === status,
        );

        if (!statusOption) {
            return;
        }

        router
            .optimistic<ProjectBoardProps>((props) => ({
                tasks: props.tasks.map((current) =>
                    current.id === task.id
                        ? { ...current, status: statusOption }
                        : current,
                ),
            }))
            .patch(
                TaskStatusController.url(task.id),
                { status },
                {
                    preserveScroll: true,
                    only: ['project', 'tasks', 'filters'],
                    onError: () =>
                        toast.error('Não foi possível mover a tarefa.'),
                    onHttpException: () => {
                        toast.error('Não foi possível mover a tarefa.');
                    },
                    onNetworkError: () => {
                        toast.error(
                            'Sem conexão. A tarefa voltou para a coluna anterior.',
                        );
                    },
                },
            );
    }

    function openNewTask() {
        setEditingTask(undefined);
        setTaskFormOpen(true);
    }

    function openEditTask(task: Task) {
        setEditingTask(task);
        setTaskFormOpen(true);
    }

    function applyFilters(next: TaskFiltersValue) {
        router.get(
            ProjectController.show.url(project.id, {
                query: {
                    status: next.status ?? undefined,
                    priority: next.priority ?? undefined,
                },
            }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['tasks', 'filters'],
            },
        );
    }

    const visibleStatuses = filters.status
        ? [filters.status]
        : statusOptions.map((option) => option.value);

    return (
        <>
            <Head title={project.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {project.name}
                            </h1>
                            <HealthBadge health={project.health} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {project.tasks_count === 0
                                ? 'Nenhuma tarefa cadastrada.'
                                : `${project.overdue_tasks_count} de ${project.tasks_count} tarefas atrasadas (${project.overdue_percentage}%). O projeto entra em alerta acima de 20%.`}
                        </p>
                        {project.description && (
                            <p className="max-w-2xl text-sm">
                                {project.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={openNewTask}>
                            <Plus /> Nova tarefa
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Ações do projeto"
                                >
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={() => setProjectFormOpen(true)}
                                >
                                    <Pencil /> Editar projeto
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setProjectDeleteOpen(true)}
                                >
                                    <Trash2 /> Excluir projeto
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <TaskFilters
                    filters={filters}
                    statusOptions={statusOptions}
                    priorityOptions={priorityOptions}
                    onChange={applyFilters}
                />

                <KanbanBoard
                    tasks={tasks}
                    statusOptions={statusOptions}
                    visibleStatuses={visibleStatuses}
                    onStatusChange={changeTaskStatus}
                    onEdit={openEditTask}
                    onDelete={setDeletingTask}
                />

                {tasks.length === 0 && (filters.status || filters.priority) && (
                    <p className="text-center text-sm text-muted-foreground">
                        Nenhuma tarefa corresponde aos filtros selecionados.
                    </p>
                )}
            </div>

            <TaskFormDialog
                projectId={project.id}
                task={editingTask}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                open={isTaskFormOpen}
                onOpenChange={setTaskFormOpen}
            />

            <ConfirmDeleteDialog
                open={deletingTask !== undefined}
                onOpenChange={(open) => !open && setDeletingTask(undefined)}
                title="Excluir tarefa?"
                description={`A tarefa "${deletingTask?.title ?? ''}" será excluída permanentemente.`}
                form={TaskController.destroy.form(deletingTask?.id ?? 0)}
            />

            <ProjectFormDialog
                project={project}
                open={isProjectFormOpen}
                onOpenChange={setProjectFormOpen}
            />

            <ConfirmDeleteDialog
                open={isProjectDeleteOpen}
                onOpenChange={setProjectDeleteOpen}
                title="Excluir projeto?"
                description={`O projeto "${project.name}" e todas as suas ${project.tasks_count} tarefas serão excluídos permanentemente.`}
                form={ProjectController.destroy.form(project.id)}
            />
        </>
    );
}
