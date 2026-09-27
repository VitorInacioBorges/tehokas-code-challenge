<?php

namespace App\Http\Requests\Tasks;

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateTaskStatusRequest extends FormRequest
{
    /**
     * Only the owner of the task's project may move it on the board.
     */
    public function authorize(): Response
    {
        /** @var Task $task */
        $task = $this->route('task');

        return Gate::inspect('update', $task->project);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ];
    }
}
