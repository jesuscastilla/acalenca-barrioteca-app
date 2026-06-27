<?php
/**
 * Diagnóstico de conexión entre api-proxy.php y la API de SLiMS
 * 
 * Sube este archivo a {barrioteca}/ y accede a:
 *   https://pelotxo.synology.me/barrioteca/diagnostico.php
 */
header('Content-Type: application/json; charset=utf-8');

$resultados = [];

// --- 1. Probar URL con localhost ---
$url_local = 'http://localhost/slims/api/index.php?_api_path=/member/pelotxo/verify';
$ch = curl_init($url_local);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp_local = curl_exec($ch);
$info_local = curl_getinfo($ch);
$error_local = curl_error($ch);
curl_close($ch);

$resultados['localhost'] = [
    'url' => $url_local,
    'http_code' => $info_local['http_code'],
    'curl_error' => $error_local ?: '(ninguno)',
    'respuesta_primeros_100' => substr($resp_local ?? '', 0, 100),
    'es_json' => json_decode($resp_local ?? '') !== null,
];

// --- 2. Probar URL con 127.0.0.1 ---
$url_127 = 'http://127.0.0.1/slims/api/index.php?_api_path=/member/pelotxo/verify';
$ch = curl_init($url_127);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp_127 = curl_exec($ch);
$info_127 = curl_getinfo($ch);
$error_127 = curl_error($ch);
curl_close($ch);

$resultados['127.0.0.1'] = [
    'url' => $url_127,
    'http_code' => $info_127['http_code'],
    'curl_error' => $error_127 ?: '(ninguno)',
    'respuesta_primeros_100' => substr($resp_127 ?? '', 0, 100),
    'es_json' => json_decode($resp_127 ?? '') !== null,
];

// --- 3. Probar con dominio público ---
$url_dominio = 'https://pelotxo.synology.me/slims/api/index.php?_api_path=/member/pelotxo/verify';
$ch = curl_init($url_dominio);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$resp_dom = curl_exec($ch);
$info_dom = curl_getinfo($ch);
$error_dom = curl_error($ch);
curl_close($ch);

$resultados['dominio'] = [
    'url' => $url_dominio,
    'http_code' => $info_dom['http_code'],
    'curl_error' => $error_dom ?: '(ninguno)',
    'respuesta_primeros_100' => substr($resp_dom ?? '', 0, 100),
    'es_json' => json_decode($resp_dom ?? '') !== null,
];

// --- 4. Mostrar rutas de archivos PHP ---
$resultados['archivos'] = [
    'api/index.php existe' => file_exists(__DIR__ . '/../slims/api/index.php') ? 'SÍ' : 'NO',
    'api-proxy.php existe' => file_exists(__DIR__ . '/api-proxy.php') ? 'SÍ' : 'NO',
    'ruta_absoluta_slims' => realpath(__DIR__ . '/../slims') ?: '(no encontrada)',
];

echo json_encode($resultados, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
