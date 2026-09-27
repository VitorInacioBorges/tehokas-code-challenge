<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('projects', ProjectController::class)->only(['store', 'show', 'update', 'destroy']);

    Route::resource('projects.tasks', TaskController::class)
        ->shallow()
        ->only(['store', 'update', 'destroy']);

    Route::patch('tasks/{task}/status', TaskStatusController::class)->name('tasks.status.update');
});
