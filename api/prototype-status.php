<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode([
        'error' => 'Method not allowed',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode([
    'application' => 'UWC Website Prototype',
    'mode' => 'prototype',
    'acceptsBookings' => false,
    'processesPayments' => false,
], JSON_UNESCAPED_SLASHES);
