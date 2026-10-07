<?php

// Read-only prototype information; this endpoint never receives customer details or books a slot.
declare(strict_types=1);

// This non-personal JSON notice can safely be cached for five minutes.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

// Reject write methods rather than suggesting that this endpoint accepts bookings or payments.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode([
        'error' => 'Method not allowed',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// app.js reads this flag; static previews keep the equivalent HTML fallback notice.
echo json_encode([
    'application' => 'UWC Website Prototype',
    'mode' => 'prototype',
    'acceptsBookings' => false,
    'processesPayments' => false,
], JSON_UNESCAPED_SLASHES);
