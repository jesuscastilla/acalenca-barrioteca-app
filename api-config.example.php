<?php
/**
 * Configuración sensible para api-proxy.php
 * Copia este archivo como api-config.php y pon tus claves aquí.
 *
 * api-config.php está en .gitignore y NO se sube al repositorio.
 * api-config.example.php SÍ está en el repo, como plantilla.
 */

// Clave de API de Google Books (para portadas y autoras al escanear)
// Obtén tu clave gratuita en: https://console.cloud.google.com/apis/credentials
// Activa la API "Books API" y crea una credencial de tipo "API Key"
define('GOOGLE_BOOKS_API_KEY', '');
// ⬆️  Pon tu clave entre las comillas, ej: 'AIzaSyB1X1X1X1X1X1X1X1X1X1X1X1X1X1X1'
