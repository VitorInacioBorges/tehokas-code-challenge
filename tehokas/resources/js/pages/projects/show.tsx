import { Head } from '@inertiajs/react';
import type { Project } from '@/types';

export default function ProjectShow({ project }: { project: Project }) {
    return (
        <>
            <Head title={project.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <h1 className="text-xl font-semibold tracking-tight">
                    {project.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                    O quadro Kanban deste projeto será exibido aqui.
                </p>
            </div>
        </>
    );
}
