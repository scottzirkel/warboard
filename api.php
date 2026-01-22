<?php

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$listsDir = __DIR__ . '/data/lists';

if (!is_dir($listsDir)) {
    mkdir($listsDir, 0755, true);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        handleList($listsDir);
        break;

    case 'save':
        handleSave($listsDir);
        break;

    case 'load':
        handleLoad($listsDir);
        break;

    case 'delete':
        handleDelete($listsDir);
        break;

    default:
        response(['error' => 'Invalid action'], 400);
}

function handleList(string $listsDir): void
{
    $files = glob($listsDir . '/*.json');
    $lists = [];

    foreach ($files as $file) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);

        $lists[] = [
            'filename' => basename($file),
            'name' => $data['name'] ?? basename($file, '.json'),
            'units' => count($data['units'] ?? []),
            'modified' => filemtime($file),
        ];
    }

    usort($lists, fn($a, $b) => $b['modified'] - $a['modified']);

    response(['success' => true, 'lists' => $lists]);
}

function handleSave(string $listsDir): void
{
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['name'])) {
        response(['error' => 'Invalid data'], 400);
        return;
    }

    $filename = sanitizeFilename($data['name']) . '.json';
    $filepath = $listsDir . '/' . $filename;

    $data['savedAt'] = date('c');

    $result = file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT));

    if ($result === false) {
        response(['error' => 'Failed to save file'], 500);
        return;
    }

    response(['success' => true, 'filename' => $filename]);
}

function handleLoad(string $listsDir): void
{
    $filename = $_GET['file'] ?? '';

    if (!$filename) {
        response(['error' => 'No file specified'], 400);
        return;
    }

    $filename = sanitizeFilename($filename);

    if (!str_ends_with($filename, '.json')) {
        $filename .= '.json';
    }

    $filepath = $listsDir . '/' . $filename;

    if (!file_exists($filepath)) {
        response(['error' => 'File not found'], 404);
        return;
    }

    $content = file_get_contents($filepath);
    $data = json_decode($content, true);

    if ($data === null) {
        response(['error' => 'Invalid JSON in file'], 500);
        return;
    }

    response(['success' => true, 'data' => $data]);
}

function handleDelete(string $listsDir): void
{
    $filename = $_GET['file'] ?? '';

    if (!$filename) {
        response(['error' => 'No file specified'], 400);
        return;
    }

    $filename = sanitizeFilename($filename);

    if (!str_ends_with($filename, '.json')) {
        $filename .= '.json';
    }

    $filepath = $listsDir . '/' . $filename;

    if (!file_exists($filepath)) {
        response(['error' => 'File not found'], 404);
        return;
    }

    $result = unlink($filepath);

    if (!$result) {
        response(['error' => 'Failed to delete file'], 500);
        return;
    }

    response(['success' => true]);
}

function sanitizeFilename(string $filename): string
{
    $filename = basename($filename);

    $filename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);

    $filename = preg_replace('/_+/', '_', $filename);

    return trim($filename, '_.');
}

function response(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
