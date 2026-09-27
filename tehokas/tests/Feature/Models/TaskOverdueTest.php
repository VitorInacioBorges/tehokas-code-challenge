<?php

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));
});

test('an open task past its deadline is overdue', function (TaskStatus $status) {
    $task = Task::factory()->create(['status' => $status, 'deadline' => now()->subMinute()]);

    expect($task->is_overdue)->toBeTrue()
        ->and(Task::query()->overdue()->pluck('id')->all())->toBe([$task->id]);
})->with([
    'pending' => [TaskStatus::Pending],
    'in progress' => [TaskStatus::InProgress],
]);

test('a completed task is never overdue', function () {
    $task = Task::factory()->completed()->create(['deadline' => now()->subDays(5)]);

    expect($task->is_overdue)->toBeFalse()
        ->and(Task::query()->overdue()->exists())->toBeFalse();
});

test('a task due in the future is not overdue', function () {
    $task = Task::factory()->pending()->create(['deadline' => now()->addMinute()]);

    expect($task->is_overdue)->toBeFalse()
        ->and(Task::query()->overdue()->exists())->toBeFalse();
});
