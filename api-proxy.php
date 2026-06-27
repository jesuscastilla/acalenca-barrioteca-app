<?php
/**
 * Proxy de API para la PWA de la Barrioteca Acalencá
 * Este archivo permite que la PWA se comunique con la API interna de SLiMS
 * manejando CORS y mapeando las peticiones a los endpoints correctos.
 *
 * IMPORTANTE: No pongas claves de API directamente aquí.
 * Crea un archivo api-config.php (está en .gitignore) con:
 *   <?php define('GOOGLE_BOOKS_API_KEY', 'tu-clave-aqui');
 */

// --- Configuración de CORS ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
} else {
    header("Access-Control-Allow-Origin: *");
}

// Manejar peticiones preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

header('Content-Type: application/json; charset=utf-8');

// ─── Cargar configuración sensible (API keys, etc.) ────
// Crea api-config.php con tu clave de Google Books.
// Este archivo está en .gitignore y NO se sube al repositorio.
if (file_exists(__DIR__ . '/api-config.php')) {
    require __DIR__ . '/api-config.php';
}
// Valor por defecto si no se ha definido en api-config.php
if (!defined('GOOGLE_BOOKS_API_KEY')) {
    define('GOOGLE_BOOKS_API_KEY', '');
}
// ───────────────────────────────────────────────────────

/**
 * Configuración de la URL base de la API interna de SLiMS.
 * En el NAS Synology, esto suele ser la ruta local o el dominio configurado.
 *
 * NOTA: Usamos el parámetro _api_path en la query string para que funcione
 * con Nginx en Synology SIN necesidad de reglas de reescritura ni PATH_INFO.
 */
$SLIMS_API_BASE = 'http://localhost/slims/api/index.php';

// ─── Obtener la acción a ejecutar ────────────────────
// Prioridad 1: ?action=verify-member (Nginx, query params)
// Prioridad 2: /api-proxy.php/verify-member (Apache, PATH_INFO)
$method = $_SERVER['REQUEST_METHOD'];

// Intentar obtener la ruta desde query string (?action=...)
$path = isset($_GET['action']) ? '/' . $_GET['action'] : '';

// Fallback: extraer de la URL (para Apache con PATH_INFO)
if (empty($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    $base_path = dirname($_SERVER['PHP_SELF']);
    $path = str_replace($base_path . '/api-proxy.php', '', $request_uri);
    $path = explode('?', $path)[0];
}

// Si la ruta empieza con /api, quitarlo (compatibilidad con frontend antiguo)
$path = preg_replace('#^/api#', '', $path);

// Leer datos de entrada (JSON o POST tradicional)
$input_data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$target_url = '';

// Mapeo de rutas de la PWA a la API interna de SLiMS
// Usamos _api_path en la query string para compatibilidad con Nginx
if ($path == '/verify-member') {
    $member_id = $input_data['member_id'] ?? $_GET['member_id'] ?? '';
    $target_url = $SLIMS_API_BASE . "?_api_path=/member/" . urlencode($member_id) . "/verify";
} elseif ($path == '/perform-action') {
    $accion = $input_data['accion'] ?? '';
    if ($accion == 'prestamo') {
        $target_url = $SLIMS_API_BASE . "?_api_path=/loan/borrow";
    } elseif ($accion == 'devolucion') {
        $target_url = $SLIMS_API_BASE . "?_api_path=/loan/return";
    }
} elseif ($path == '/catalog-proxy') {
    $q = $_GET['q'] ?? '';
    $target_url = $SLIMS_API_BASE . "?_api_path=/biblio/search&q=" . urlencode($q);
} elseif ($path == '/book-metadata') {
    $isbn = $_GET['isbn'] ?? '';
    if (empty($isbn)) {
        echo json_encode(['status' => 'error', 'message' => 'ISBN requerido']);
        exit;
    }
    $cleanIsbn = preg_replace('/[-\s]/', '', $isbn);
    $googleApiKey = GOOGLE_BOOKS_API_KEY ?: getenv('GOOGLE_BOOKS_API_KEY') ?: '';
    $url = "https://www.googleapis.com/books/v1/volumes?q=isbn:{$cleanIsbn}";
    if ($googleApiKey) $url .= "&key={$googleApiKey}";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        $data = json_decode($response, true);
        if (!empty($data['items'][0]['volumeInfo'])) {
            $info = $data['items'][0]['volumeInfo'];
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'title' => $info['title'] ?? null,
                    'authors' => !empty($info['authors']) ? implode(', ', $info['authors']) : null,
                    'image' => $info['imageLinks']['thumbnail'] ?? null
                ]
            ]);
            exit;
        }
    }
    echo json_encode(['status' => 'success', 'data' => null]);
    exit;
}

// Si la ruta no está mapeada, devolver error
if (!$target_url) {
    echo json_encode(['status' => 'error', 'message' => 'Ruta no encontrada en el proxy: ' . $path]);
    exit;
}

// Ejecutar la petición a la API interna usando cURL
// IMPORTANTE: Siempre usamos GET aunque el frontend envíe POST,
// porque las rutas de la API de SLiMS están registradas como GET.
// Los parámetros van en la URL, no en el cuerpo de la petición.
$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Procesar la respuesta
$data = json_decode($response, true);

// Verificar si la respuesta es un JSON válido
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code($http_code >= 400 ? $http_code : 500);
    echo json_encode([
        'status' => 'error',
        'message' => 'El servidor devolvió una respuesta no válida (puede que el recurso no exista o haya un error de base de datos).'
    ]);
    exit;
}

// Mapear resultados del catálogo para usar lenguaje feminizado en el frontend
if ($path == '/catalog-proxy' && is_array($data)) {
    $results = array_map(function($item) {
        return [
            'id' => $item['biblio_id'] ?? '',
            'title' => $item['title'] ?? '',
            'author' => ($item['author'] ?? '') ?: "Autora Desconocida",
            'isbn' => $item['isbn_issn'] ?? '',
            'status' => ($item['is_available'] ?? false) ? "disponible" : "prestada",
            'image' => $item['image'] ?? ''
        ];
    }, $data);
    echo json_encode($results);
} else {
    // Para otras peticiones, devolver la respuesta original de SLiMS
    http_response_code($http_code);
    echo $response;
}
