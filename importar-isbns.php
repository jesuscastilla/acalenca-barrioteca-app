<?php
/**
 * Importación masiva de libros por ISBN desde un CSV
 * 
 * Lee un archivo CSV con códigos ISBN, consulta Google Books API
 * para cada uno, y guarda los datos directamente en SLiMS.
 *
 * USO:
 *   1. Configura tu api-config.php con GOOGLE_BOOKS_API_KEY y SLIMS_API_BASE
 *   2. Crea un CSV con un ISBN por línea (ej: mis-isbns.csv)
 *   3. Coloca el CSV en la misma carpeta que este script
 *   4. Accede a: https://tu-dominio/barrioteca/importar-isbns.php
 */

// ─── Cargar configuración ─────────────────────────────
if (file_exists(__DIR__ . '/api-config.php')) {
    require __DIR__ . '/api-config.php';
}
$google_api_key = defined('GOOGLE_BOOKS_API_KEY') ? GOOGLE_BOOKS_API_KEY : '';
$SLIMS_API_BASE = defined('SLIMS_API_BASE') ? SLIMS_API_BASE : 'http://localhost/slims/api/index.php';

$csv_file = __DIR__ . '/mis-isbns.csv';  // Tu CSV con los ISBNs
// ───────────────────────────────────────────────────────

header('Content-Type: text/plain; charset=utf-8');
set_time_limit(300); // 5 minutos

if (!file_exists($csv_file)) {
    die("❌ No encuentro el CSV. Crea 'mis-isbns.csv' en esta carpeta.\n");
}

// Leer ISBNs del CSV
$isbns = [];
$handle = fopen($csv_file, 'r');
$primera = fgetcsv($handle);
$esCabecera = $primera && strtolower(trim($primera[0])) === 'isbn';

if ($esCabecera) {
    while (($row = fgetcsv($handle)) !== false)
        if (!empty($row[0])) $isbns[] = trim($row[0]);
} else {
    if ($primera && !empty($primera[0])) $isbns[] = trim($primera[0]);
    while (($row = fgetcsv($handle)) !== false)
        if (!empty($row[0])) $isbns[] = trim($row[0]);
}
fclose($handle);

$total = count($isbns);
echo "📚 $total ISBNs en el CSV.\n\n";

// Cargar SLiMS
define('INDEX_AUTH', '1');
define('DB_ACCESS', 'fa');
$_SERVER['REQUEST_METHOD'] = 'GET';

// Intentar cargar configuración de SLiMS desde ruta relativa
$slimsConfig = __DIR__ . '/../slims/sysconfig.inc.php';
if (!file_exists($slimsConfig)) {
    die("❌ No se encuentra SLiMS en: " . realpath(__DIR__ . '/../slims') . "\n");
}
require $slimsConfig;

$ok = 0;
$err = 0;

foreach ($isbns as $i => $isbn) {
    $n = $i + 1;
    $clean = preg_replace('/[^0-9X]/i', '', $isbn);
    echo "[$n/$total] $clean ... ";

    // Consultar Google Books
    $url = "https://www.googleapis.com/books/v1/volumes?q=isbn:$clean";
    if ($google_api_key) $url .= "&key=$google_api_key";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http !== 200) { echo "❌ HTTP $http\n"; $err++; continue; }

    $data = json_decode($resp, true);
    if (empty($data['items'][0]['volumeInfo'])) { echo "❌ No encontrado\n"; $err++; continue; }

    $v = $data['items'][0]['volumeInfo'];
    $titulo = $dbs->real_escape_string($v['title'] ?? 'Sin título');
    $autor = $dbs->real_escape_string($v['authors'][0] ?? '');
    $editorial = $dbs->real_escape_string($v['publisher'] ?? '');
    $anno = $dbs->real_escape_string(substr($v['publishedDate'] ?? '', 0, 4));
    $desc = $dbs->real_escape_string(substr($v['description'] ?? '', 0, 500));

    // No duplicar
    $dup = $dbs->query("SELECT biblio_id FROM biblio WHERE isbn_issn='$clean' LIMIT 1");
    if ($dup && $dup->num_rows > 0) { echo "⚠️  Ya existe\n"; continue; }

    $dbs->query("INSERT INTO biblio (title, author, isbn_issn, publisher, publish_year, notes, input_date, last_update)
                 VALUES ('$titulo', '$autor', '$clean', '$editorial', '$anno', '$desc', NOW(), NOW())");

    if ($dbs->affected_rows > 0) {
        $id = $dbs->insert_id;
        $dbs->query("INSERT INTO item (biblio_id, item_code) VALUES ($id, 'LIB-$id')");
        echo "✅ ($id)\n";
        $ok++;
    } else {
        echo "❌ " . $dbs->error . "\n";
        $err++;
    }
}

echo "\n━━━━━━━━━━━━━━━━━━━━\n✅ Importados: $ok\n❌ Errores: $err\n━━━━━━━━━━━━━━━━━━━━\n";