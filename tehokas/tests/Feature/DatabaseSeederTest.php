<?php

use App\Models\Project;
use App\Models\User;

test('the demo seeder creates one project per health state', function () {
    $this->seed();

    $consultant = User::query()->where('email', 'consultor@tehokas.test')->firstOrFail();

    $healthStates = $consultant->projects()
        ->withTaskCounts()
        ->get()
        ->map(fn (Project $project): string => $project->health()->value)
        ->sort()
        ->values()
        ->all();

    expect($healthStates)->toBe(['alert', 'healthy', 'no_tasks']);
});
