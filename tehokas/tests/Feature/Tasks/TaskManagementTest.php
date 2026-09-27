<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function validTaskPayload(array $overrides = []): array
{
    return [
        'title' => 'Mapear processo de compras',
        'description' => 'Entrevistar o time de suprimentos',
        'status' => 'pending',
        'priority' => 'high',
        'deadline' => '2026-10-01T14:30',
        ...$overrides,
    ];
}

test('a consultant can add a task to their project', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->from(route('projects.show', $project))
        ->post(route('projects.tasks.store', $project), validTaskPayload())
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.show', $project));

    $task = $project->tasks()->sole();
    expect($task->title)->toBe('Mapear processo de compras')
        ->and($task->status)->toBe(TaskStatus::Pending)
        ->and($task->priority)->toBe(TaskPriority::High)
        ->and($task->deadline->format('Y-m-d H:i'))->toBe('2026-10-01 14:30');
});

test('the deadline round-trips through the form without timezone drift', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload(['deadline' => '2026-10-01T14:30']));

    $this->actingAs($project->user)
        ->get(route('projects.show', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.deadline_input', '2026-10-01T14:30')
            ->where('tasks.0.deadline', '2026-10-01T14:30:00-03:00'));
});

test('a task payload is validated', function (array $overrides, string $invalidField) {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload($overrides))
        ->assertSessionHasErrors($invalidField);

    expect(Task::query()->count())->toBe(0);
})->with([
    'missing title' => [['title' => ''], 'title'],
    'unknown status' => [['status' => 'archived'], 'status'],
    'unknown priority' => [['priority' => 'urgent'], 'priority'],
    'missing deadline' => [['deadline' => ''], 'deadline'],
    'invalid deadline' => [['deadline' => 'amanhã'], 'deadline'],
]);

test('a deadline in the past is accepted so late tasks can be registered', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload(['deadline' => '2020-01-01T09:00']))
        ->assertSessionHasNoErrors();

    expect($project->tasks()->count())->toBe(1);
});

test('a consultant can edit a task without moving it to another project', function () {
    $task = Task::factory()->create();
    $otherProject = Project::factory()->for($task->project->user)->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.update', $task), validTaskPayload([
            'title' => 'Título revisado',
            'project_id' => $otherProject->id,
        ]))
        ->assertSessionHasNoErrors();

    $task->refresh();
    expect($task->title)->toBe('Título revisado')
        ->and($task->project_id)->not->toBe($otherProject->id);
});

test('a consultant can move a task to another status', function () {
    $task = Task::factory()->pending()->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.status.update', $task), ['status' => 'in_progress'])
        ->assertSessionHasNoErrors();

    expect($task->refresh()->status)->toBe(TaskStatus::InProgress);
});

test('an unknown status is rejected when moving a task', function () {
    $task = Task::factory()->pending()->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.status.update', $task), ['status' => 'done'])
        ->assertSessionHasErrors('status');

    expect($task->refresh()->status)->toBe(TaskStatus::Pending);
});

test('a consultant can delete a task', function () {
    $task = Task::factory()->create();

    $this->actingAs($task->project->user)
        ->delete(route('tasks.destroy', $task))
        ->assertSessionHasNoErrors();

    expect(Task::query()->count())->toBe(0);
});

test('tasks of other consultants are not found', function (string $method, string $routeName, array $payload) {
    $task = Task::factory()->pending()->create(['title' => 'Original']);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->{$method}(route($routeName, $task), $payload)
        ->assertNotFound();

    $task->refresh();
    expect($task->title)->toBe('Original')
        ->and($task->status)->toBe(TaskStatus::Pending);
})->with([
    'update' => ['patch', 'tasks.update', validTaskPayload(['title' => 'Invadido'])],
    'move' => ['patch', 'tasks.status.update', ['status' => 'completed']],
    'delete' => ['delete', 'tasks.destroy', []],
]);

test('tasks cannot be added to another consultant project', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('projects.tasks.store', $project), validTaskPayload())
        ->assertNotFound();

    expect(Task::query()->count())->toBe(0);
});
