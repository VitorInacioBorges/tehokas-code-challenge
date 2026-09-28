<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;

test('the board shows the project, its health and tasks ordered by deadline', function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));

    $project = Project::factory()->create();
    Task::factory()->for($project)->create(['title' => 'Depois', 'deadline' => now()->addDays(5)]);
    Task::factory()->for($project)->overdue()->create(['title' => 'Atrasada', 'deadline' => now()->subDay()]);

    $this->actingAs($project->user)
        ->get(route('projects.show', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
            ->where('project.health.value', 'alert')
            ->has('tasks', 2)
            ->where('tasks.0.title', 'Atrasada')
            ->where('tasks.0.is_overdue', true)
            ->where('tasks.0.status', ['value' => 'pending', 'label' => 'Pendente'])
            ->where('tasks.1.title', 'Depois')
            ->has('statusOptions', 3)
            ->has('priorityOptions', 3)
            ->where('alertThresholdPercent', 20));
});

test('the board of another consultant is not found', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('projects.show', $project))
        ->assertNotFound();
});
