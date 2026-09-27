import { Head } from '@inertiajs/react';
import { AlertTriangle, FolderKanban, ListTodo, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ProjectCard from '@/components/projects/project-card';
import ProjectFormDialog from '@/components/projects/project-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { DashboardSummary, Project } from '@/types';

function SummaryCard({
    icon: Icon,
    label,
    value,
    highlight = false,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <Card className="py-4">
            <CardContent className="flex items-center gap-4">
                <div
                    className={
                        highlight
                            ? 'rounded-lg bg-red-100 p-2.5 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                            : 'rounded-lg bg-muted p-2.5 text-muted-foreground'
                    }
                >
                    <Icon className="size-5" />
                </div>
                <div>
                    <p className="text-2xl font-semibold tabular-nums">
                        {value}
                    </p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    projects,
    summary,
}: {
    projects: Project[];
    summary: DashboardSummary;
}) {
    return (
        <>
            <Head title="Projetos" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Projetos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe a saúde dos projetos dos seus clientes.
                        </p>
                    </div>
                    <ProjectFormDialog
                        trigger={
                            <Button>
                                <Plus /> Novo projeto
                            </Button>
                        }
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <SummaryCard
                        icon={FolderKanban}
                        label="Projetos"
                        value={summary.total_projects}
                    />
                    <SummaryCard
                        icon={AlertTriangle}
                        label="Projetos em alerta"
                        value={summary.projects_in_alert}
                        highlight={summary.projects_in_alert > 0}
                    />
                    <SummaryCard
                        icon={ListTodo}
                        label="Tarefas atrasadas"
                        value={summary.overdue_tasks}
                        highlight={summary.overdue_tasks > 0}
                    />
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
                        <FolderKanban className="size-10 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Nenhum projeto ainda</p>
                            <p className="text-sm text-muted-foreground">
                                Crie o primeiro projeto para começar a
                                acompanhar as tarefas.
                            </p>
                        </div>
                        <ProjectFormDialog
                            trigger={
                                <Button>
                                    <Plus /> Criar primeiro projeto
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Projetos',
            href: dashboard(),
        },
    ],
};
