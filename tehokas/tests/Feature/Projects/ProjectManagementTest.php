<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

test('a consultant can create a project', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Implantação de CRM',
        'description' => 'Projeto piloto',
    ]);

    $project = Project::query()->sole();
    $response->assertSessionHasNoErrors()->assertRedirect(route('projects.show', $project));
    expect($project->name)->toBe('Implantação de CRM')
        ->and($project->user_id)->toBe($user->id);
});

test('a project cannot be created for someone else', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Implantação de CRM',
        'user_id' => $otherUser->id,
    ]);

    expect(Project::query()->sole()->user_id)->toBe($user->id);
});

test('a project requires a name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => ''])
        ->assertSessionHasErrors('name');

    expect(Project::query()->count())->toBe(0);
});

test('a consultant can update their project', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->from(route('dashboard'))
        ->patch(route('projects.update', $project), ['name' => 'Novo nome', 'description' => null])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('dashboard'));

    expect($project->refresh()->name)->toBe('Novo nome');
});

test('a consultant can delete their project and its tasks', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->count(2)->create();

    $this->actingAs($project->user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('dashboard'));

    expect(Project::query()->count())->toBe(0)
        ->and(Task::query()->count())->toBe(0);
});

test('projects of other consultants are not found', function (string $method, string $routeName) {
    $project = Project::factory()->create(['name' => 'Original']);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->{$method}(route($routeName, $project), ['name' => 'Invadido'])
        ->assertNotFound();

    expect($project->refresh()->name)->toBe('Original');
})->with([
    'update' => ['patch', 'projects.update'],
    'delete' => ['delete', 'projects.destroy'],
]);

test('guests cannot manage projects', function () {
    $this->post(route('projects.store'), ['name' => 'X'])->assertRedirect(route('login'));
});
