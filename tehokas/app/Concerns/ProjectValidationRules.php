<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;

trait ProjectValidationRules
{
    /**
     * Get the validation rules used to create and update projects.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    protected function projectRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
