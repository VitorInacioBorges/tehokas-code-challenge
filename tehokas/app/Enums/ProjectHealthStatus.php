<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum ProjectHealthStatus: string
{
    use HasOptions;

    /**
     * A project is in alert when MORE than this percentage of its tasks is overdue.
     */
    public const ALERT_THRESHOLD_PERCENT = 20;

    case NoTasks = 'no_tasks';
    case Healthy = 'healthy';
    case Alert = 'alert';

    /**
     * Derive the project's health from its task counts.
     *
     * Integer arithmetic keeps the 20% boundary exact (no floating point error).
     */
    public static function fromCounts(int $totalTasks, int $overdueTasks): self
    {
        if ($totalTasks === 0) {
            return self::NoTasks;
        }

        return $overdueTasks * 100 > $totalTasks * self::ALERT_THRESHOLD_PERCENT
            ? self::Alert
            : self::Healthy;
    }

    /**
     * Get the human-readable label for the health status.
     */
    public function label(): string
    {
        return match ($this) {
            self::NoTasks => 'Sem tarefas',
            self::Healthy => 'Saudável',
            self::Alert => 'Em Alerta',
        };
    }
}
