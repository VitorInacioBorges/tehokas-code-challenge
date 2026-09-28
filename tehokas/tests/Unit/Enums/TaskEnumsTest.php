<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;

test('task status options keep the kanban column order', function () {
    expect(TaskStatus::options())->toBe([
        ['value' => 'pending', 'label' => 'Pendente'],
        ['value' => 'in_progress', 'label' => 'Em Andamento'],
        ['value' => 'completed', 'label' => 'Concluída'],
    ]);
});

test('task priority options go from lowest to highest', function () {
    expect(TaskPriority::options())->toBe([
        ['value' => 'low', 'label' => 'Baixa'],
        ['value' => 'medium', 'label' => 'Média'],
        ['value' => 'high', 'label' => 'Alta'],
    ]);
});
