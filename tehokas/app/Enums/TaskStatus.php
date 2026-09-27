<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum TaskStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Completed = 'completed';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendente',
            self::InProgress => 'Em Andamento',
            self::Completed => 'Concluída',
        };
    }
}
