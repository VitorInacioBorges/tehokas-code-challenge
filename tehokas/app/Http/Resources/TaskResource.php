<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the task into the shape consumed by the Kanban board.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->toOption(),
            'priority' => $this->priority->toOption(),
            'deadline' => $this->deadline->toIso8601String(),
            'deadline_input' => $this->deadline->format('Y-m-d\TH:i'),
            'is_overdue' => $this->is_overdue,
        ];
    }
}
