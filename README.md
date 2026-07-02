# Barrioteca Acalencá — PWA de Préstamos

Aplicación Web Progresiva (PWA) para la gestión vecinal de préstamos y devoluciones de la **Barrioteca Acalencá** en Salobreña.

## ¿Qué es la Barrioteca Acalencá?

Somos una biblioteca vecinal autogestionada. Cualquier vecina puede asociarse, llevarse libros en préstamo y devolverlos cuando termine de leerlos. Todo el sistema funciona con software libre (SLiMS + PWA) alojado en un NAS Synology de la propia barrioteca, sin depender de servicios externos ni ceder datos a terceros.

## Cómo funciona la autogestión

1. **Alta de socias**: Una administradora da de alta a las vecinas en el panel de SLiMS (backend), asignando un ID de socia único (ej. `SOCIA-001`).
2. **Identificación**: Cada socia introduce su ID en la PWA desde su móvil para identificarse.
3. **Préstamo**: Escanea el código de barras (ISBN/ASIN) del libro que quiere llevarse. La PWA se comunica con SLiMS y registra el préstamo.
4. **Devolución**: Escanea el mismo código al devolver el libro. SLiMS lo marca como disponible.
5. **Catálogo**: Cualquier socia puede buscar libros por título, autora o ISBN desde la app.

Todo queda registrado en la base de datos de SLiMS, permitiendo saber en todo momento qué libros están prestados y a quién.

## Características

- **Escaneo de códigos**: Usa la cámara del móvil para leer códigos de barras (ISBN/ASIN) de libros y tarjetas de socias.
- **Acceso directo**: Al instalarse como app, funciona como aplicación nativa con acceso rápido desde la pantalla de inicio.
- **Lenguaje inclusivo**: Interfaz en femenino (socia, autora, bienvenida), coherente con el espíritu del proyecto.
- **Privacidad total**: Todo corre en el NAS de la barrioteca. No se comparten datos con terceros.
- **HTTPS automático**: Redirección forzosa de HTTP a HTTPS para que la PWA sea instalable y los Service Workers funcionen correctamente.
- **Dos modos de backend**: Puede funcionar con Node.js (Express) o con PHP (Apache/Nginx) como proxy hacia SLiMS.

## Tecnología

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend proxy (Node.js)**: Express + Axios (sirve la PWA y hace de puente con SLiMS)
- **Backend proxy (PHP)**: api-proxy.php + cURL (alternativa para servidores web tradicionales)
- **Backend real**: SLiMS 9 (PHP + MariaDB) con API REST
- **Escáner**: html5-qrcode (lectura de códigos de barras desde la cámara)

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con la URL de tu SLiMS local

# Iniciar servidor de desarrollo
npm run dev
```

El servidor se lanza en `http://localhost:3000` y hace de proxy hacia la API de SLiMS. El frontend detecta automáticamente que está en modo Node.js y usa `/api/*` como endpoint.

## Despliegue en producción

Consulta la guía completa en:

- [`MANUAL_USUARIA.md`](MANUAL_USUARIA.md) — Cómo usan la app las socias
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — Despliegue técnico detallado (Node.js o PHP)

### Resumen rápido

**Opción A — Node.js:**
```bash
npm install
cp .env.example .env   # Configurar SLIMS_API_BASE
npm run build
npm start
```

**Opción B — PHP (NAS Synology con Web Station):**
```bash
npm install
cp api-config.example.php api-config.php   # Configurar SLIMS_API_BASE
npm run build
# Copiar dist/ y api-proxy.php al servidor web del NAS
```

## 🔒 HTTPS (obligatorio para PWA)

La PWA necesita HTTPS para que los Service Workers funcionen y la app se pueda instalar. Debes configurar un certificado SSL (gratuito con Let's Encrypt desde Synology) y un proxy inverso o forzar HTTPS desde Web Station. Consulta [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) para instrucciones paso a paso.

## Archivos de configuración sensibles

Estos archivos **nunca** se suben al repositorio (están en `.gitignore`):

- `.env` — Variables de entorno del servidor Node.js (URLs, claves)
- `api-config.php` — Configuración del proxy PHP (claves, URLs)

Usa los archivos `.example` como plantilla:
- `.env.example` → copiar a `.env`
- `api-config.example.php` → copiar a `api-config.php`

## Licencia

GNU General Public License v3.0