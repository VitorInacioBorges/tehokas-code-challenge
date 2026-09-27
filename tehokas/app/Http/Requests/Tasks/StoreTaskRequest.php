<?php

namespace App\Http\Requests\Tasks;

use App\Concerns\TaskValidationRules;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Only the project's owner may add tasks to it.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('project'));
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
