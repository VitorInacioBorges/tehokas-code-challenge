<?php

namespace App\Http\Requests\Tasks;

use App\Concerns\TaskValidationRules;
use App\Models\Task;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Only the owner of the task's project may edit it.
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
     * @return array<string, array<int, ValidationRule|string|object>>
     */
    public function rules(): array
    {
        return $this->taskRules();
    }
}
