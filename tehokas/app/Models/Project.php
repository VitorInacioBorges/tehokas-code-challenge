<?php

namespace App\Models;

use App\Enums\ProjectHealthStatus;
use App\Enums\TaskStatus;
use Closure;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $description
 * @property int|null $tasks_count
 * @property int|null $overdue_tasks_count
 * @property int|null $completed_tasks_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'description'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    /**
     * Get the consultant who owns the project.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project's tasks.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * The task aggregates needed to compute the project's health and progress.
     *
     * @return array<int|string, string|Closure(Builder<Task>): mixed>
     */
    public static function taskCountDefinitions(): array
    {
        return [
            'tasks',
            'tasks as overdue_tasks_count' => fn (Builder $query) => $query->overdue(),
            'tasks as completed_tasks_count' => fn (Builder $query) => $query->where('status', TaskStatus::Completed),
        ];
    }

    /**
     * Load the task aggregates alongside the projects in a single query.
     *
     * @param  Builder<Project>  $query
     */
    #[Scope]
    protected function withTaskCounts(Builder $query): void
    {
        $query->withCount(self::taskCountDefinitions());
    }

    /**
     * Get the project's health indicator.
     */
    public function health(): ProjectHealthStatus
    {
        return ProjectHealthStatus::fromCounts(
            $this->loadedCount('tasks_count'),
            $this->loadedCount('overdue_tasks_count'),
        );
    }

    /**
     * Get the rounded percentage of overdue tasks.
     */
    public function overduePercentage(): int
    {
        $totalTasks = $this->loadedCount('tasks_count');

        if ($totalTasks === 0) {
            return 0;
        }

        return (int) round($this->loadedCount('overdue_tasks_count') * 100 / $totalTasks);
    }

    /**
     * Read an aggregate loaded by withTaskCounts(), failing if it was not loaded.
     */
    private function loadedCount(string $attribute): int
    {
        $value = $this->getAttribute($attribute);

        if ($value === null) {
            throw new LogicException("Load the task counts with withTaskCounts() before reading [{$attribute}].");
        }

        return (int) $value;
    }
}
