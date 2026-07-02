<?php
/**
 * Proxy de API para la PWA de la Barrioteca Acalencá
 * Este archivo permite que la PWA se comunique con la API interna de SLiMS
 * manejando CORS y mapeando las peticiones a los endpoints correctos.
 *
 * IMPORTANTE: No pongas claves de API directamente aquí.
 * Crea un archivo api-config.php (está en .gitignore) con:
 *   <?php
 *   define('GOOGLE_BOOKS_API_KEY', 'tu-clave-aqui');
 *   define('SLIMS_API_BASE', 'http://localhost/slims/api/index.php');
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
if (file_exists(__DIR__ . '/api-config.php')) {
    require __DIR__ . '/api-config.php';
}
// Valores por defecto si no se han definido en api-config.php
if (!defined('GOOGLE_BOOKS_API_KEY')) {
    define('GOOGLE_BOOKS_API_KEY', '');
}
if (!defined('SLIMS_API_BASE')) {
    define('SLIMS_API_BASE', 'http://localhost/slims/api/index.php');
}

/**
 * Función auxiliar: ejecuta una petición cURL a SLiMS
 * @param string $url    URL completa de la API de SLiMS
 * @param string $method GET o POST
 * @param array  $body   Datos a enviar en el cuerpo (si es POST)
 * @return array [http_code, response_body]
 */
function slimRequest($url, $method = 'GET', $body = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: Barrioteca-PWA/1.0'
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    }

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$http_code, $response];
}

// ─── Obtener la acción a ejecutar (ROBUSTO — compatible con Nginx Synology) ────
$qs = $_SERVER['QUERY_STRING'] ?? '';

// Si no hay QUERY_STRING, intentar REQUEST_URI
if (empty($qs) && !empty($_SERVER['REQUEST_URI'])) {
    $parts = explode('?', $_SERVER['REQUEST_URI'], 2);
    $qs = $parts[1] ?? '';
}

// Parsear parámetros manualmente
$params = [];
parse_str($qs, $params);
$action = $params['action'] ?? '';

// Mantener $_GET sincronizado (por si acaso)
if (empty($_GET) && !empty($params)) {
    $_GET = $params;
}

$path = '/' . $action;

// Leer datos de entrada — combinar body JSON + $_GET + $_POST para máxima compatibilidad
$input_data = [];

// Leer body JSON (funciona en la mayoría de casos)
$rawInput = @file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = @json_decode($rawInput, true);
    if (is_array($decoded)) {
        $input_data = array_merge($input_data, $decoded);
    }
}

// Fusionar $_GET (para compatibilidad con Nginx que a veces no pasa el body)
if (!empty($_GET)) {
    $input_data = array_merge($input_data, $_GET);
}

// Fusionar $_POST
if (!empty($_POST)) {
    $input_data = array_merge($input_data, $_POST);
}

// ─── Mapeo de rutas de la PWA a la API interna de SLiMS ────

if ($path == '/verify-member') {
    $member_id = $input_data['member_id'] ?? $_GET['member_id'] ?? '';
    if (empty($member_id)) {
        echo json_encode(['status' => 'error', 'message' => 'El ID de la socia es obligatorio.']);
        exit;
    }

    $target_url = SLIMS_API_BASE . "?_api_path=/member/" . urlencode($member_id) . "/verify";
    list($http_code, $response) = slimRequest($target_url, 'GET');

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Respuesta no válida del servidor SLiMS.']);
        exit;
    }

    // Transformar respuesta para el frontend
    if (isset($data['status']) && $data['status'] === 'success' && isset($data['data'])) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Socia verificada: ' . ($data['data']['member_name'] ?? $member_id),
            'data' => [
                'member_id' => $member_id,
                'member_name' => $data['data']['member_name'] ?? ('Socia ' . $member_id),
            ] + ($data['data'] ?? [])
        ]);
    } else {
        http_response_code($http_code >= 400 ? $http_code : 404);
        echo json_encode($data ?: ['status' => 'error', 'message' => 'Socia no encontrada.']);
    }
    exit;
}

elseif ($path == '/perform-action') {
    $accion = $input_data['accion'] ?? '';
    $code = $input_data['code'] ?? $input_data['asin'] ?? $input_data['isbn'] ?? '';
    $member_id = $input_data['member_id'] ?? $input_data['id_socia'] ?? $input_data['id_socio'] ?? '';

    if (empty($accion)) {
        echo json_encode(['status' => 'error', 'message' => "Faltan parámetros requeridos: 'accion'"]);
        exit;
    }

    $lowerAccion = strtolower($accion);

    // Verificar socia
    if (in_array($lowerAccion, ['verificar_socia', 'verificar_socio', 'login', 'verificar'])) {
        if (empty($member_id)) {
            echo json_encode(['status' => 'error', 'message' => 'El ID de la socia es obligatorio.']);
            exit;
        }
        $target_url = SLIMS_API_BASE . "?_api_path=/member/" . urlencode($member_id) . "/verify";
        list($http_code, $response) = slimRequest($target_url, 'GET');

        $data = json_decode($response, true);
        if (isset($data['status']) && $data['status'] === 'success' && isset($data['data'])) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Acceso concedido a ' . ($data['data']['member_name'] ?? $member_id) . '.',
                'data' => [
                    'member_id' => $member_id,
                    'member_name' => $data['data']['member_name'] ?? ('Socia ' . $member_id),
                ] + ($data['data'] ?? [])
            ]);
        } else {
            echo json_encode($data ?: ['status' => 'error', 'message' => 'Socia no encontrada.']);
        }
        exit;
    }

    // Préstamo
    elseif (in_array($lowerAccion, ['prestamo', 'loan'])) {
        if (empty($member_id) || empty($code)) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos para el préstamo (ID de socia y código de libro).']);
            exit;
        }

        $target_url = SLIMS_API_BASE . "?_api_path=/loan/borrow";
        $postBody = [
            'member_id' => trim($member_id),
            'item_code' => trim($code)
        ];
        list($http_code, $response) = slimRequest($target_url, 'POST', $postBody);

        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Respuesta no válida del servidor SLiMS.']);
            exit;
        }
        http_response_code($http_code);
        echo json_encode($data ?: ['status' => 'error', 'message' => 'Error al procesar el préstamo.']);
        exit;
    }

    // Devolución
    elseif (in_array($lowerAccion, ['devolucion', 'return'])) {
        if (empty($code)) {
            echo json_encode(['status' => 'error', 'message' => 'Falta el código del libro para la devolución.']);
            exit;
        }

        $target_url = SLIMS_API_BASE . "?_api_path=/loan/return";
        $postBody = [
            'item_code' => trim($code)
        ];
        list($http_code, $response) = slimRequest($target_url, 'POST', $postBody);

        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Respuesta no válida del servidor SLiMS.']);
            exit;
        }
        http_response_code($http_code);
        echo json_encode($data ?: ['status' => 'error', 'message' => 'Error al procesar la devolución.']);
        exit;
    }

    else {
        echo json_encode(['status' => 'error', 'message' => "Acción desconocida: $accion"]);
        exit;
    }
}

elseif ($path == '/catalog-proxy') {
    $q = $_GET['q'] ?? '';
    if (empty($q)) {
        echo json_encode([]);
        exit;
    }

    $target_url = SLIMS_API_BASE . "?_api_path=/biblio/search&q=" . urlencode($q);
    list($http_code, $response) = slimRequest($target_url, 'GET');

    $data = json_decode($response, true);
    if (is_array($data)) {
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
        echo json_encode([]);
    }
    exit;
}

elseif ($path == '/book-metadata') {
    $isbn = $_GET['isbn'] ?? '';
    if (empty($isbn)) {
        echo json_encode(['status' => 'error', 'message' => 'ISBN requerido']);
        exit;
    }
    $cleanIsbn = preg_replace('/[-\s]/', '', $isbn);
    $googleApiKey = GOOGLE_BOOKS_API_KEY ?: getenv('GOOGLE_BOOKS_API_KEY') ?: '';

    $url = "https://www.googleapis.com/books/v1/volumes?q=isbn:{$cleanIsbn}";
    if ($googleApiKey) $url .= "&key={$googleApiKey}";

    list($http_code, $response) = slimRequest($url, 'GET');

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

// Si la ruta no está mapeada
http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Ruta no encontrada en el proxy: ' . $path]);