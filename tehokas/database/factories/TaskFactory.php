<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state: a pending, medium priority task due in the future.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => TaskStatus::Pending,
            'priority' => TaskPriority::Medium,
            'deadline' => now()->addDays(fake()->numberBetween(1, 30)),
        ];
    }

    /**
     * Indicate that the task is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::Pending]);
    }

    /**
     * Indicate that the task is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::InProgress]);
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::Completed]);
    }

    /**
     * Indicate that the task is open and past its deadline.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TaskStatus::Pending,
            'deadline' => now()->subDays(fake()->numberBetween(1, 30)),
        ]);
    }

    /**
     * Set the task's priority.
     */
    public function priority(TaskPriority $priority): static
    {
        return $this->state(fn (array $attributes) => ['priority' => $priority]);
    }
}
