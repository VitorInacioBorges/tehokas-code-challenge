<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('the dashboard lists only the user projects with their health and a summary', function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));

    $user = User::factory()->create();
    $alertProject = Project::factory()->for($user)->create(['name' => 'Projeto em alerta']);
    Task::factory()->for($alertProject)->overdue()->create();
    Task::factory()->for($alertProject)->pending()->create();
    Project::factory()->for($user)->create(['name' => 'Projeto vazio']);
    Project::factory()->create(['name' => 'Projeto de outra pessoa']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('projects', 2)
            ->where('projects.0.name', 'Projeto vazio')
            ->where('projects.0.health.value', 'no_tasks')
            ->where('projects.1.name', 'Projeto em alerta')
            ->where('projects.1.health', ['value' => 'alert', 'label' => 'Em Alerta'])
            ->where('projects.1.tasks_count', 2)
            ->where('projects.1.overdue_tasks_count', 1)
            ->where('projects.1.overdue_percentage', 50)
            ->where('summary.total_projects', 2)
            ->where('summary.projects_in_alert', 1)
            ->where('summary.overdue_tasks', 1));
});
