<?php
declare(strict_types=1);

// Autoload (composer) and env
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// --- CORS (adjust in .env for prod) ---
$origin = $_ENV['FRONTEND_ORIGIN'] ?? 'http://localhost:3000';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Always return JSON
header('Content-Type: application/json');

// Basic router
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($path === '/' && $method === 'GET') {
        echo json_encode(['ok' => true, 'service' => 'wrapfield-api']);
        exit;
    }

    if ($path === '/createBoard' && $method === 'POST') {
        // script reads php://input itself (leave it that way)
        require __DIR__ . '/../src/CreateBoard.php';
        exit;
    }

    if ($path === '/joinBoard' && $method === 'POST') {
        require __DIR__ . '/../src/JoinBoard.php';
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
