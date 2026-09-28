import { Form } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/types';

type ProjectFormDialogProps = {
    project?: Project;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export default function ProjectFormDialog({
    project,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: ProjectFormDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;
    const isEditing = project !== undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogTitle>
                    {isEditing ? 'Editar projeto' : 'Novo projeto'}
                </DialogTitle>
                <DialogDescription>
                    {isEditing
                        ? 'Atualize o nome e a descrição do projeto.'
                        : 'Crie um projeto para organizar as tarefas de um cliente.'}
                </DialogDescription>

                <Form
                    {...(isEditing
                        ? ProjectController.update.form(project.id)
                        : ProjectController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    resetOnSuccess={!isEditing}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="project-name">Nome</Label>
                                <Input
                                    id="project-name"
                                    name="name"
                                    defaultValue={project?.name}
                                    required
                                    maxLength={255}
                                    placeholder="Ex.: Implantação de ERP · Cliente Alfa"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="project-description">
                                    Descrição (opcional)
                                </Label>
                                <Textarea
                                    id="project-description"
                                    name="description"
                                    defaultValue={project?.description ?? ''}
                                    maxLength={2000}
                                    rows={3}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {isEditing ? 'Salvar' : 'Criar projeto'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
