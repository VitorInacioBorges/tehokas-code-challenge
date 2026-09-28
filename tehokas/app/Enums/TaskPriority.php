<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum TaskPriority: string
{
    use HasOptions;

    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    /**
     * Get the human-readable label for the priority.
     */
    public function label(): string
    {
        return match ($this) {
            self::Low => 'Baixa',
            self::Medium => 'Média',
            self::High => 'Alta',
        };
    }
}
