# 🚀 Guía de Despliegue — Barrioteca Acalencá

Esta guía explica cómo desplegar las dos aplicaciones que componen el sistema:
1. **La PWA** (frontend React + backend proxy)
2. **SLiMS** (sistema de gestión bibliotecaria en el NAS Synology)

---

## 📐 Arquitectura

```
📱 Navegador móvil (PWA instalada o web)
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

## 🔧 Opciones de Despliegue

### Opción A: Node.js (recomendado para desarrollo y producción ligera)

El servidor `server.ts` usa Express.js y actúa como proxy hacia SLiMS **y** sirve los archivos estáticos de la PWA.

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

# 3. Construir la PWA para producción
npm run build

# 4. Iniciar el servidor
npm start
```

El servidor escuchará en `http://0.0.0.0:3000`. Configura un **proxy inverso** en Synology para exponerlo por HTTPS (puerto 443).

### Opción B: PHP + Apache/Nginx (recomendado para NAS con servidor web)

El archivo `api-proxy.php` actúa como proxy hacia SLiMS. La PWA se sirve como archivos estáticos desde el servidor web del NAS.

**Requisitos:** Apache o Nginx con PHP 7.4+ y cURL habilitado.

**⚠️ IMPORTANTE — `api-proxy.php` DEBE estar en la RAÍZ de la PWA:**
```
/barrioteca/
├── api-proxy.php        ← AQUÍ, en la raíz de la PWA
├── api-config.php        ← Junto a api-proxy.php
├── index.html            ← Build de la PWA
├── assets/               ← JS y CSS compilados
└── ...
```

```bash
# 1. Subir la carpeta del proyecto al NAS
#    Ejemplo: /var/services/web/barrioteca/

# 2. ⚠️ COPIAR api-proxy.php a la RAÍZ de la PWA si no está ya allí
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

# 5. Construir la PWA
npm install
npm run build

# 6. Copiar el contenido de dist/ a /barrioteca/ en el NAS
#    El directorio final debe contener tanto index.html como api-proxy.php
```

---

## ⚙️ Variables de Entorno y Configuración

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

## 🔒 Configuración de HTTPS

La PWA requiere HTTPS para funcionar correctamente (service workers, instalación, etc.).

1. En el NAS Synology, ve a **Panel de Control → Portal de Inicio de Sesión → Avanzado → Proxy Inverso**.
2. Crea una regla:
   - **Origen**: `https://TU-DOMINIO.synology.me` (puerto 443)
   - **Destino**: `http://localhost:3000` (o el puerto que uses)
3. Asegúrate de tener un certificado SSL válido (Let's Encrypt gratuito desde Synology).

---

## 📁 Estructura de Archivos

```
barrioteca/
├── src/                    # Código fuente React
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Punto de entrada
│   └── components/         # Componentes (Scanner, CatalogSearch, BorrowedBooks)
├── public/                 # Archivos estáticos
│   ├── manifest.json       # Configuración PWA
│   ├── sw.js               # Service Worker
│   └── icon*.png           # Iconos PWA
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

## 🧪 Verificación del Despliegue

1. **Probar la API**: Accede a `https://TU-DOMINIO/barrioteca/diagnostico.php` para verificar la conexión con SLiMS.
2. **Probar la PWA**: Abre la app en un móvil y verifica que:
   - Puedes iniciar sesión con un ID de socia válido
   - El escáner funciona (pide permisos de cámara)
   - Aparece el banner de instalación PWA
   - Puedes buscar en el catálogo
3. **Probar préstamo/devolución**: Realiza un préstamo y una devolución con un libro de prueba.

---

## 🔄 Actualización de la PWA

Para actualizar la PWA a una nueva versión:

```bash
git pull
npm install
npm run build
# Reiniciar el servidor Node.js o recargar Apache/Nginx
```

El Service Worker se actualizará automáticamente en los dispositivos de las usuarias la próxima vez que abran la app.

---

> **Nota**: Los archivos `.env` y `api-config.php` contienen información sensible y **nunca** deben subirse al repositorio. Ya están incluidos en `.gitignore`.