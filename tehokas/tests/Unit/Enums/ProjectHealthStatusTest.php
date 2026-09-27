<?php

use App\Enums\ProjectHealthStatus;

test('health status is derived from task counts', function (int $totalTasks, int $overdueTasks, ProjectHealthStatus $expected) {
    expect(ProjectHealthStatus::fromCounts($totalTasks, $overdueTasks))->toBe($expected);
})->with([
    'no tasks' => [0, 0, ProjectHealthStatus::NoTasks],
    'no overdue tasks' => [3, 0, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue' => [10, 2, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue in a small project' => [5, 1, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue in a large project' => [100, 20, ProjectHealthStatus::Healthy],
    'just above 20 percent overdue' => [100, 21, ProjectHealthStatus::Alert],
    '30 percent overdue' => [10, 3, ProjectHealthStatus::Alert],
    '25 percent overdue' => [4, 1, ProjectHealthStatus::Alert],
    'every task overdue' => [1, 1, ProjectHealthStatus::Alert],
]);

test('health status exposes portuguese labels', function () {
    expect(ProjectHealthStatus::NoTasks->label())->toBe('Sem tarefas')
        ->and(ProjectHealthStatus::Healthy->label())->toBe('Saudável')
        ->and(ProjectHealthStatus::Alert->label())->toBe('Em Alerta');
});

test('health status converts to a frontend option', function () {
    expect(ProjectHealthStatus::Alert->toOption())->toBe(['value' => 'alert', 'label' => 'Em Alerta']);
});
