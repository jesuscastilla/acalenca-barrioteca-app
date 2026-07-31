<?php
/**
 * Diagnóstico de conexión entre api-proxy.php y la API de SLiMS
 * 
 * Sube este archivo a {barrioteca}/ y accede a:
 *   https://tu-dominio/barrioteca/diagnostico.php
 */
header('Content-Type: application/json; charset=utf-8');

// Cargar configuración si existe
if (file_exists(__DIR__ . '/api-config.php')) {
    require __DIR__ . '/api-config.php';
}
$SLIMS_API_BASE = defined('SLIMS_API_BASE') ? SLIMS_API_BASE : 'http://localhost/slims/api/index.php';

$resultados = [];

// ID de socia de prueba (configurable por GET: ?member=XXX)
$testMember = $_GET['member'] ?? 'PELOTXO';

// --- 1. Probar URL con localhost ---
$url_local = $SLIMS_API_BASE . "?_api_path=/member/" . urlencode($testMember) . "/verify";
$ch = curl_init($url_local);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp_local = curl_exec($ch);
$info_local = curl_getinfo($ch);
$error_local = curl_error($ch);
curl_close($ch);

$resultados['slms_api'] = [
    'url' => $url_local,
    'http_code' => $info_local['http_code'],
    'curl_error' => $error_local ?: '(ninguno)',
    'respuesta_primeros_100' => substr($resp_local ?? '', 0, 100),
    'es_json' => json_decode($resp_local ?? '') !== null,
];

// --- 2. Probar Google Books ---
$googleApiKey = defined('GOOGLE_BOOKS_API_KEY') ? GOOGLE_BOOKS_API_KEY : '';
$url_gb = "https://www.googleapis.com/books/v1/volumes?q=isbn:9780141036144";
if ($googleApiKey) $url_gb .= "&key={$googleApiKey}";

$ch = curl_init($url_gb);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp_gb = curl_exec($ch);
$info_gb = curl_getinfo($ch);
$error_gb = curl_error($ch);
curl_close($ch);

$resultados['google_books'] = [
    'url' => $url_gb,
    'http_code' => $info_gb['http_code'],
    'curl_error' => $error_gb ?: '(ninguno)',
    'api_key_configurada' => !empty($googleApiKey) ? 'SÍ' : 'NO (sin clave, límite reducido)',
];

// --- 3. Mostrar rutas de archivos ---
$resultados['archivos'] = [
    'api-proxy.php existe' => file_exists(__DIR__ . '/api-proxy.php') ? 'SÍ' : 'NO',
    'api-config.php existe' => file_exists(__DIR__ . '/api-config.php') ? 'SÍ' : 'NO',
    'ruta_actual' => __DIR__,
];

echo json_encode($resultados, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);