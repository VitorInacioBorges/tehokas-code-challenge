<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    /**
     * Transform the project into the shape consumed by the React pages.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'tasks_count' => (int) $this->tasks_count,
            'completed_tasks_count' => (int) $this->completed_tasks_count,
            'overdue_tasks_count' => (int) $this->overdue_tasks_count,
            'overdue_percentage' => $this->overduePercentage(),
            'health' => $this->health()->toOption(),
        ];
    }
}
