import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { EnumOption, TaskPriorityValue, TaskStatusValue } from '@/types';

export type TaskFiltersValue = {
    status: TaskStatusValue | null;
    priority: TaskPriorityValue | null;
};

const ALL = 'all';

export default function TaskFilters({
    filters,
    statusOptions,
    priorityOptions,
    onChange,
}: {
    filters: TaskFiltersValue;
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
    onChange: (filters: TaskFiltersValue) => void;
}) {
    const hasFilters = filters.status !== null || filters.priority !== null;

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={filters.status ?? ''}
                onValueChange={(value) =>
                    onChange({
                        ...filters,
                        status: (value || null) as TaskStatusValue | null,
                    })
                }
                aria-label="Filtrar por status"
            >
                {statusOptions.map((option) => (
                    <ToggleGroupItem
                        key={option.value}
                        value={option.value}
                        className="px-3"
                    >
                        {option.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            <Select
                value={filters.priority ?? ALL}
                onValueChange={(value) =>
                    onChange({
                        ...filters,
                        priority:
                            value === ALL ? null : (value as TaskPriorityValue),
                    })
                }
            >
                <SelectTrigger
                    className="w-44"
                    aria-label="Filtrar por prioridade"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Todas as prioridades</SelectItem>
                    {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            Prioridade {option.label.toLowerCase()}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ status: null, priority: null })}
                >
                    <X /> Limpar filtros
                </Button>
            )}
        </div>
    );
}
