<?php

namespace App\Http\Controllers;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Create a project for the authenticated consultant.
     */
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('projects.show', $project);
    }

    /**
     * Show the project's Kanban board.
     */
    public function show(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $project->loadCount(Project::taskCountDefinitions());

        $tasks = $project->tasks()->orderBy('deadline')->orderBy('id')->get();

        return Inertia::render('projects/show', [
            'project' => ProjectResource::make($project)->resolve($request),
            'tasks' => TaskResource::collection($tasks)->resolve($request),
            'statusOptions' => TaskStatus::options(),
            'priorityOptions' => TaskPriority::options(),
        ]);
    }

    /**
     * Update the project's details.
     */
    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project updated.')]);

        return back();
    }

    /**
     * Delete the project and, through the foreign key cascade, its tasks.
     */
    public function destroy(Project $project): RedirectResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project deleted.')]);

        return to_route('dashboard');
    }
}
