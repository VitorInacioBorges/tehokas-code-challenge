<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\Tasks\UpdateTaskStatusRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class TaskStatusController extends Controller
{
    /**
     * Move the task to another Kanban column.
     *
     * No toast here: the card moving is the feedback, and a toast per drag would be noise.
     */
    public function __invoke(UpdateTaskStatusRequest $request, Task $task): RedirectResponse
    {
        $task->update(['status' => $request->enum('status', TaskStatus::class)]);

        return back();
    }
}
