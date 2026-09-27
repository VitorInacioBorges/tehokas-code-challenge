<?php

use App\Enums\TaskPriority;
use App\Models\Project;
use App\Models\Task;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->project = Project::factory()->create();
    Task::factory()->for($this->project)->pending()->priority(TaskPriority::High)->create(['title' => 'Pendente alta']);
    Task::factory()->for($this->project)->pending()->priority(TaskPriority::Low)->create(['title' => 'Pendente baixa']);
    Task::factory()->for($this->project)->completed()->priority(TaskPriority::High)->create(['title' => 'Concluída alta']);
});

test('tasks can be filtered by priority', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 2)
            ->where('filters', ['status' => null, 'priority' => 'high']));
});

test('tasks can be filtered by status and priority together', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'status' => 'pending', 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 1)
            ->where('tasks.0.title', 'Pendente alta')
            ->where('filters', ['status' => 'pending', 'priority' => 'high']));
});

test('invalid filter values are ignored instead of failing', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'status' => 'xyz', 'priority' => 'urgente']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 3)
            ->where('filters', ['status' => null, 'priority' => null]));
});

test('filters do not change the project health, which always considers every task', function () {
    Task::factory()->for($this->project)->overdue()->priority(TaskPriority::Low)->count(2)->create();

    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.tasks_count', 5)
            ->where('project.health.value', 'alert'));
});

test('array-shaped filter values are ignored instead of failing', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'status' => ['xyz'], 'priority' => ['high']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 3)
            ->where('filters', ['status' => null, 'priority' => null]));
});
