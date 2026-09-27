<?php

namespace App\Http\Controllers;

use App\Enums\ProjectHealthStatus;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the consultant's projects with their health indicator.
     */
    public function __invoke(Request $request): Response
    {
        $projects = $request->user()->projects()
            ->withTaskCounts()
            ->orderByDesc('id')
            ->get();

        return Inertia::render('dashboard', [
            'projects' => ProjectResource::collection($projects)->resolve($request),
            'summary' => [
                'total_projects' => $projects->count(),
                'projects_in_alert' => $projects
                    ->filter(fn (Project $project): bool => $project->health() === ProjectHealthStatus::Alert)
                    ->count(),
                'overdue_tasks' => (int) $projects->sum('overdue_tasks_count'),
            ],
        ]);
    }
}
