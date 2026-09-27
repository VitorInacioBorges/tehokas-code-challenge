<?php

use App\Enums\ProjectHealthStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));
});

test('task counts and health are computed in a single query', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->overdue()->count(3)->create();
    Task::factory()->for($project)->completed()->count(2)->create();
    Task::factory()->for($project)->pending()->count(5)->create();

    $project = Project::query()->withTaskCounts()->findOrFail($project->id);

    expect($project->tasks_count)->toBe(10)
        ->and($project->overdue_tasks_count)->toBe(3)
        ->and($project->completed_tasks_count)->toBe(2)
        ->and($project->overduePercentage())->toBe(30)
        ->and($project->health())->toBe(ProjectHealthStatus::Alert);
});

test('a project without tasks has its own health state', function () {
    $project = Project::factory()->create();

    $project->loadCount(Project::taskCountDefinitions());

    expect($project->health())->toBe(ProjectHealthStatus::NoTasks)
        ->and($project->overduePercentage())->toBe(0);
});

test('reading health without loading the counts fails loudly', function () {
    $project = Project::factory()->create();

    $project->health();
})->throws(LogicException::class);

test('deleting a project deletes its tasks', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->count(2)->create();

    $project->delete();

    expect(Task::query()->count())->toBe(0);
});
