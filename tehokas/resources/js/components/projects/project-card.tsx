import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import HealthBadge from '@/components/projects/health-badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Project } from '@/types';

export default function ProjectCard({ project }: { project: Project }) {
    const progress =
        project.tasks_count === 0
            ? 0
            : Math.round(
                  (project.completed_tasks_count / project.tasks_count) * 100,
              );

    return (
        <Card className="h-full gap-4 transition-shadow hover:shadow-md">
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="leading-snug">
                        {project.name}
                    </CardTitle>
                    <HealthBadge health={project.health} />
                </div>
                {project.description && (
                    <CardDescription className="line-clamp-2">
                        {project.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="mt-auto space-y-3">
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>
                            {project.completed_tasks_count} de{' '}
                            {project.tasks_count} concluídas
                        </span>
                    </div>
                    <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Progresso do projeto"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <p className="flex items-center gap-1.5 text-sm">
                    {project.overdue_tasks_count > 0 ? (
                        <>
                            <AlertTriangle className="size-4 text-red-500" />
                            <span>
                                {project.overdue_tasks_count}{' '}
                                {project.overdue_tasks_count === 1
                                    ? 'tarefa atrasada'
                                    : 'tarefas atrasadas'}{' '}
                                ({project.overdue_percentage}%)
                            </span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            <span className="text-muted-foreground">
                                Nenhuma tarefa atrasada
                            </span>
                        </>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}
