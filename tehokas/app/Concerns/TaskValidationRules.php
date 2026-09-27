<?php

namespace App\Concerns;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait TaskValidationRules
{
    /**
     * Get the validation rules used to create and update tasks.
     *
     * Past deadlines are allowed on purpose: consultants must be able to register tasks that are already late.
     *
     * @return array<string, array<int, ValidationRule|string|object>>
     */
    protected function taskRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'priority' => ['required', Rule::enum(TaskPriority::class)],
            'deadline' => ['required', 'date'],
        ];
    }
}
