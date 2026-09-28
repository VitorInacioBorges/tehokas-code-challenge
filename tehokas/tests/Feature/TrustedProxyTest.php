<?php

use Illuminate\Support\Facades\Route;

test('generated URLs use https when the Render proxy forwards a secure request', function () {
    Route::get('/__trusted-proxy-test', fn () => url('/'));

    $response = $this->get('/__trusted-proxy-test', [
        'X-Forwarded-Proto' => 'https',
        'X-Forwarded-Host' => 'checklist-projetos.onrender.com',
    ]);

    $response->assertOk();
    expect($response->getContent())->toStartWith('https://checklist-projetos.onrender.com');
});
