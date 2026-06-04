# Barrioteca Acalencá - PWA

Aplicación Web Progresiva (PWA) diseñada para la gestión de préstamos y devoluciones de la Barrioteca Acalencá en Salobreña.

## Características
- **Escaneo de códigos**: Permite escanear códigos de barras (ISBN/ASIN) de libros y tarjetas de socias.
- **Modo Offline**: Funciona como una aplicación nativa instalable en el móvil.
- **Lenguaje Inclusivo**: Interfaz totalmente feminizada (Socia, Autora, Bienvenida).
- **Privacidad**: Servidor propio, autogestionado, seguro y confidencial.

## Ejecución en Desarrollo
1. Instalar dependencias: `npm install`
2. Iniciar servidor de desarrollo: `npm run dev`

## Despliegue en Producción (Synology NAS)
1. Generar la versión optimizada: `npm run build`
2. Copiar el contenido de la carpeta `dist` al servidor.
3. Asegurarse de que el archivo `api-proxy.php` esté configurado correctamente para conectar con SLiMS.

Más información en: [https://pelotxo.synology.me/acalenca](https://pelotxo.synology.me/acalenca)
