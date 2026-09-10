#  Guía de Despliegue — Barrioteca Acalencá

Esta guía explica cómo desplegar las dos aplicaciones que componen el sistema:
1. **La app web** (frontend React + backend proxy)
2. **SLiMS** (sistema de gestión bibliotecaria en el NAS Synology)

---

## Arquitectura

```
 Navegador móvil (web)
         │
         ▼
┌─────────────────────────────────────┐
│  Proxy API (Node.js Express o PHP)  │  ← Este proyecto
│  • /api/verify-member               │
│  • /api/perform-action              │
│  • /api/book-metadata               │
│  • /api/catalog-proxy               │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  SLiMS API (NAS Synology)    │
│  /slims/api/index.php        │
│  • /member/{id}/verify        │
│  • /loan/borrow               │
│  • /loan/return               │
│  • /biblio/search             │
└──────────────────────────────┘
```

---

## Acceso al NAS

Para subir o actualizar los archivos puedes usar cualquiera de estas vías:

- **SSH / SFTP / SCP**: `192.168.50.93` (o `192.168.50.94`), puerto **22**.
- **SMB (Explorador de Windows)**: `\\192.168.50.94\` (carpetas compartidas del NAS).
- **File Station** (panel DSM): `https://pelotxo.synology.me:5001`.

Las carpetas web viven en `/volume1/web/` (por ejemplo `/volume1/web/barrioteca/`).

## Opciones de Despliegue

### Opción A: Node.js (recomendado para desarrollo y producción ligera)

El servidor `server.ts` usa Express.js y actúa como proxy hacia SLiMS y sirve los archivos estáticos de la app web.

**Requisitos:** Node.js 18+ en el NAS Synology.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores:
#   SLIMS_API_BASE=http://localhost/slims/api/index.php
#   GOOGLE_BOOKS_API_KEY=tu-clave-opcional
#   PORT=3000
#   NODE_ENV=production

# 3. Construir la app web para producción
npm run build

# 4. Iniciar el servidor
npm start
```

El servidor escuchará en `http://0.0.0.0:3000`. Configura un **proxy inverso** en Synology para exponerlo por HTTPS (puerto 443).

### Opción B: PHP + Apache/Nginx (recomendado para NAS con servidor web)

El archivo `api-proxy.php` actúa como proxy hacia SLiMS. La app web se sirve como archivos estáticos desde el servidor web del NAS.

**Requisitos:** Apache o Nginx con PHP 7.4+ y cURL habilitado.

**⚠️ IMPORTANTE — `api-proxy.php` DEBE estar en la RAÍZ de la app web:**
```
/barrioteca/
├── api-proxy.php        ← AQUÍ, en la raíz de la app web
├── api-config.php        ← Junto a api-proxy.php
├── index.html            ← Build de la app web
├── assets/               ← JS y CSS compilados
└── ...
```

```bash
# 1. Subir la carpeta del proyecto al NAS
#    Ejemplo: /var/services/web/barrioteca/

# 2. COPIAR api-proxy.php a la RAÍZ de la app web si no está ya allí
#    Asegúrate de que api-proxy.php está en /barrioteca/api-proxy.php
#    (el frontend llama a ./api-proxy.php, que se resuelve contra esta ruta)

# 3. Configurar api-config.php
cp api-config.example.php api-config.php
# Edita api-config.php con tus valores:
#   define('GOOGLE_BOOKS_API_KEY', 'tu-clave');
#   define('SLIMS_API_BASE', 'http://localhost/slims/api/index.php');

# 4. Configurar Nginx (Web Station en Synology ya lo gestiona)
#    No se necesita regla de reescritura porque el frontend llama
#    directamente a ./api-proxy.php?action=... con rutas relativas.

# 5. Construir la app web
npm install
npm run build

# 6. Copiar el contenido de dist/ a /barrioteca/ en el NAS
#    El directorio final debe contener tanto index.html como api-proxy.php
```

---

## Variables de Entorno y Configuración

### Para Node.js (server.ts)

Copia `.env.example` → `.env` y configura:

| Variable | Descripción | Ejemplo |
|----------|------------|---------|
| `SLIMS_API_BASE` | URL base de la API de SLiMS | `http://localhost/slims/api/index.php` |
| `GOOGLE_BOOKS_API_KEY` | Clave de Google Books API (opcional) | `AIzaSy...` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `production` |

### Para PHP (api-proxy.php)

Copia `api-config.example.php` → `api-config.php` y configura:

| Constante | Descripción | Ejemplo |
|-----------|------------|---------|
| `GOOGLE_BOOKS_API_KEY` | Clave de Google Books API (opcional) | `'AIzaSy...'` |
| `SLIMS_API_BASE` | URL base de la API de SLiMS | `'http://localhost/slims/api/index.php'` |

---

## Configuracion de HTTPS

La app web funciona correctamente sobre HTTPS.

1. En el NAS Synology, ve a **Panel de Control → Portal de Inicio de Sesión → Avanzado → Proxy Inverso**.
2. Crea una regla:
   - **Origen**: `https://TU-DOMINIO.synology.me` (puerto 443)
   - **Destino**: `http://localhost:3000` (o el puerto que uses)
3. Asegúrate de tener un certificado SSL válido (Let's Encrypt gratuito desde Synology).

---

## Estructura de Archivos

```
barrioteca/
├── src/                    # Código fuente React
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Punto de entrada
│   └── components/         # Componentes (Scanner, CatalogSearch, BorrowedBooks)
├── public/                 # Archivos estáticos
│   ├── logo.png            # Logo de la app
│   └── icon.png            # Favicon
├── server.ts               # Servidor Node.js (proxy + estáticos)
├── api-proxy.php           # Proxy PHP alternativo
├── api-config.example.php  # Plantilla de configuración PHP
├── .env.example            # Plantilla de variables de entorno Node.js
├── package.json            # Dependencias y scripts
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración de TypeScript
└── DEPLOYMENT_GUIDE.md     # Esta guía
```

---

## Verificacion del Despliegue

1. **Probar la API**: Accede a `https://TU-DOMINIO/barrioteca/diagnostico.php` para verificar la conexión con SLiMS.
2. **Probar la app web**: Abre la app en un móvil y verifica que:
   - Puedes iniciar sesión con un ID de socia válido
   - El escáner funciona (pide permisos de cámara)
   - Se ve el logo de la app en la cabecera
   - Puedes buscar en el catálogo
3. **Probar préstamo/devolución**: Realiza un préstamo y una devolución con un libro de prueba.

---

## Actualizacion de la app web

Para actualizar la app web a una nueva versión:

```bash
git pull
npm install
npm run build
# Reiniciar el servidor Node.js o recargar Apache/Nginx
```

Los cambios se verán en los dispositivos de las usuarias la próxima vez que abran la app (recargando la página).

## Sin caché (cambios inmediatos)

La app web está configurada para **no cachear nada**, de modo que al subir un `dist/` nuevo los cambios se ven al recargar, en cualquier dispositivo.

Se consigue con tres capas:

1. **Sin Service Worker** (ya eliminado): no hay cache offline.
2. **Metas no-cache en `index.html`** (`Cache-Control`, `Pragma`, `Expires`).
3. **Cabeceras HTTP en el servidor**:
   - Con **Node.js** (`npm start`): `server.ts` ya envía `Cache-Control: no-store`.
   - Con **Nginx** (NAS Synology): añade el bloque de `nginx-no-cache.conf` al vhost de `/barrioteca/`.

### Aplicar el no-cache en Nginx (NAS)

El fichero `nginx-no-cache.conf` (raíz del repo) contiene el bloque listo para copiar:

```nginx
location /barrioteca/ {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
    expires -1;
}
```

Por SSH en el NAS (`ssh pelotxo@192.168.50.93`) edita el vhost de Web Station y añade ese bloque dentro del `server { ... }` que sirve `pelotxo.synology.me`. En Synology DSM el fichero suele estar en `/etc/nginx/app.d/` o dentro de la config de Web Station; DSM puede regenerarla al cambiar Web Station, así que conviene re-aplicarlo si se toca esa config.

> Nota: los `assets/*.js|css` llevan hash en el nombre (cada build genera nombres nuevos) y el `index.html` se sirve sin cache, así que no queda nada obsoleto.

---

> **Nota**: Los archivos `.env` y `api-config.php` contienen información sensible y **nunca** deben subirse al repositorio. Ya están incluidos en `.gitignore`.
