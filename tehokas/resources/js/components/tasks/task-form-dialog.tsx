import { Form } from '@inertiajs/react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
    EnumOption,
    Task,
    TaskPriorityValue,
    TaskStatusValue,
} from '@/types';

type TaskFormDialogProps = {
    projectId: number;
    task?: Task;
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
    defaultStatus?: TaskStatusValue;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function TaskFormDialog({
    projectId,
    task,
    statusOptions,
    priorityOptions,
    defaultStatus = 'pending',
    open,
    onOpenChange,
}: TaskFormDialogProps) {
    const isEditing = task !== undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>
                    {isEditing ? 'Editar tarefa' : 'Nova tarefa'}
                </DialogTitle>
                <DialogDescription>
                    Defina o que precisa ser feito, a prioridade e o prazo.
                </DialogDescription>

                <Form
                    key={task?.id ?? 'new'}
                    {...(isEditing
                        ? TaskController.update.form(task.id)
                        : TaskController.store.form(projectId))}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    resetOnSuccess={!isEditing}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="task-title">Título</Label>
                                <Input
                                    id="task-title"
                                    name="title"
                                    defaultValue={task?.title}
                                    required
                                    maxLength={255}
                                    placeholder="Ex.: Mapear processo de compras"
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="task-description">
                                    Descrição (opcional)
                                </Label>
                                <Textarea
                                    id="task-description"
                                    name="description"
                                    defaultValue={task?.description ?? ''}
                                    maxLength={5000}
                                    rows={3}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="task-status">Status</Label>
                                    <Select
                                        name="status"
                                        defaultValue={
                                            task?.status.value ?? defaultStatus
                                        }
                                    >
                                        <SelectTrigger
                                            id="task-status"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="task-priority">
                                        Prioridade
                                    </Label>
                                    <Select
                                        name="priority"
                                        defaultValue={
                                            task?.priority.value ?? 'medium'
                                        }
                                    >
                                        <SelectTrigger
                                            id="task-priority"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.priority} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="task-deadline">Prazo</Label>
                                <Input
                                    id="task-deadline"
                                    name="deadline"
                                    type="datetime-local"
                                    defaultValue={task?.deadline_input}
                                    required
                                />
                                <InputError message={errors.deadline} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {isEditing ? 'Salvar' : 'Criar tarefa'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
