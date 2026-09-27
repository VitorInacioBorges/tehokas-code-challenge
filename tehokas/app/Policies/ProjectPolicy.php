<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectPolicy
{
    /**
     * Determine whether the user can view the project (and its tasks).
     */
    public function view(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Determine whether the user can update the project or manage its tasks.
     */
    public function update(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Determine whether the user can delete the project.
     */
    public function delete(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Only the owner may access a project; everyone else gets a 404 so its existence is not revealed.
     */
    private function ownership(User $user, Project $project): Response
    {
        return $user->id === $project->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
