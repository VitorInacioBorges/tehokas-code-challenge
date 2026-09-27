export type EnumOption<T extends string = string> = {
    value: T;
    label: string;
};

export type TaskStatusValue = 'pending' | 'in_progress' | 'completed';
export type TaskPriorityValue = 'low' | 'medium' | 'high';
export type ProjectHealthValue = 'no_tasks' | 'healthy' | 'alert';

export type Project = {
    id: number;
    name: string;
    description: string | null;
    tasks_count: number;
    completed_tasks_count: number;
    overdue_tasks_count: number;
    overdue_percentage: number;
    health: EnumOption<ProjectHealthValue>;
};

export type Task = {
    id: number;
    title: string;
    description: string | null;
    status: EnumOption<TaskStatusValue>;
    priority: EnumOption<TaskPriorityValue>;
    deadline: string;
    deadline_input: string;
    is_overdue: boolean;
};

export type DashboardSummary = {
    total_projects: number;
    projects_in_alert: number;
    overdue_tasks: number;
};
