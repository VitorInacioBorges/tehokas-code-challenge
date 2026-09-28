<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

test('a newly registered user goes straight to the dashboard', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard'));

    $this->get(route('dashboard'))->assertOk();
});

test('an unverified user can use the app', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
});

test('email verification and password reset routes no longer exist', function () {
    expect(Route::has('verification.notice'))->toBeFalse();
    expect(Route::has('password.request'))->toBeFalse();
    expect(Route::has('password.reset'))->toBeFalse();
});
