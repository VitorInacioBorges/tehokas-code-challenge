<?php

use App\Models\Project;
use App\Models\User;

test('validation messages are shown in portuguese', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => ''])
        ->assertSessionHasErrors(['name' => 'O campo nome é obrigatório.']);
});

test('task validation uses portuguese attribute names', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), [
            'title' => 'Tarefa',
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => 'amanhã',
        ])
        ->assertSessionHasErrors(['deadline' => 'O campo prazo não é uma data válida.']);
});

test('failed logins are reported in portuguese', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'senha-errada'])
        ->assertSessionHasErrors(['email' => 'Essas credenciais não correspondem aos nossos registros.']);
});

test('the html document declares the portuguese locale', function () {
    $this->get(route('home'))->assertSee('<html lang="pt-BR"', false);
});
