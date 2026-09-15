# Barrioteca Acalencá — App web de Préstamos

Aplicación web para la gestión vecinal de préstamos y devoluciones de la **Barrioteca Acalencá** en Salobreña.

> **Acceso universal**: esta app web se mantiene como canal principal para quienes **no usan
> smartphone** (desde cualquier navegador de ordenador o tablet) y como alternativa directa en
> **iOS**, además de las apps nativas de Android e iOS.

## ¿Qué es la Barrioteca Acalencá?

Somos una biblioteca vecinal autogestionada. Cualquier vecina puede asociarse, llevarse libros en préstamo y devolverlos cuando termine de leerlos. Todo el sistema funciona con software libre (SLiMS + app web) alojado en un NAS Synology de la propia barrioteca, sin depender de servicios externos ni ceder datos a terceros.

## Cómo funciona la autogestión

1. **Alta de socias**: Una administradora da de alta a las vecinas en el panel de SLiMS (backend), asignando un ID de socia único (ej. `SOCIA-001`).
2. **Identificación**: Cada socia introduce su ID en la app web desde su móvil para identificarse.
3. **Préstamo**: Escanea el código de barras (ISBN/ASIN) del libro que quiere llevarse. La app web se comunica con SLiMS y registra el préstamo.
4. **Devolución**: Escanea el mismo código al devolver el libro. SLiMS lo marca como disponible.
5. **Catálogo**: Cualquier socia puede buscar libros por título, autora o ISBN desde la app.

Todo queda registrado en la base de datos de SLiMS, permitiendo saber en todo momento qué libros están prestados y a quién.

## Características

- **Escaneo de códigos**: Usa la cámara del móvil para leer códigos de barras (ISBN/ASIN) de libros y tarjetas de socias.
- **Disponible en Google Play**: La app nativa para Android se descarga desde Google Play y se actualiza sola con cada cambio del frontend.
- **Lenguaje inclusivo**: Interfaz en femenino (socia, autora, bienvenida), coherente con el espíritu del proyecto.
- **Privacidad total**: Todo corre en el NAS de la barrioteca. No se comparten datos con terceros.
- **HTTPS automático**: Redirección forzosa de HTTP a HTTPS para una navegación segura.
- **Dos modos de backend**: Puede funcionar con Node.js (Express) o con PHP (Apache/Nginx) como proxy hacia SLiMS.

## Tecnología

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend proxy (Node.js)**: Express + Axios (sirve la app web y hace de puente con SLiMS)
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

## HTTPS (recomendado)

La app web funciona sobre HTTPS (la redirección forzosa HTTP → HTTPS ya está incluida en `index.html`). Debes configurar un certificado SSL (gratuito con Let's Encrypt desde Synology) y un proxy inverso o forzar HTTPS desde Web Station. Consulta [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) para instrucciones paso a paso.

## Archivos de configuración sensibles

Estos archivos **nunca** se suben al repositorio (están en `.gitignore`):

- `.env` — Variables de entorno del servidor Node.js (URLs, claves)
- `api-config.php` — Configuración del proxy PHP (claves, URLs)

Usa los archivos `.example` como plantilla:
- `.env.example` → copiar a `.env`
- `api-config.example.php` → copiar a `api-config.php`

## Scripts de importacion de libros

La Barrioteca incluye varios scripts PHP para añadir libros al catalogo sin pasar por el panel de administracion:

| Script | Ubicacion en repo | Funcion |
|--------|-------------------|---------|
| `importar-csv.php` | `PWA/importar-csv.php` | Importacion masiva desde archivo CSV con ISBNs, por lotes |
| `anadir-libro.php` | `SLiMS/anadir-libro.php` | Busqueda por titulo/autor en APIs o formulario manual, para libros sin ISBN |
| `importar-isbns.php` | `PWA/importar-isbns.php` | Pegar una lista de ISBNs y añadirlos uno a uno |

Los scripts se suben al NAS en `/slims/` (no en `/barrioteca/`) y se eliminan despues de usarlos. El script `anadir-libro.php` genera automaticamente una etiqueta con codigo de barras imprimible para pegar en cada libro fisico.

## Libros sin ISBN en la app web

Para libros que no tienen ISBN, la app web soporta tres metodos de prestamo/devolucion:

- **Escanear etiqueta**: La administracion imprime una etiqueta con codigo de barras `LIB-XX` desde `anadir-libro.php` y la pega en el libro. La socia escanea ese codigo.
- **Entrada manual**: En la vista de escaneo hay un campo "Entrada Manual" donde se puede escribir el codigo `LIB-XX`.
- **Boton "Pedir" en catalogo**: Al buscar un libro en el catalogo, si esta disponible aparece un boton "Pedir" que ejecuta el prestamo directamente.

## App Android (Google Play)

La Barrioteca Acalencá está disponible como **app Android nativa** en Google Play.

### Instalación

1. Abre Google Play en tu móvil Android
2. Busca "Barrioteca Acalencá"
3. Pulsa **Instalar**
4. La app aparece en tu pantalla de inicio como "Barrioteca Acalencá"

### Características de la app

| Característica | Detalle |
|---------------|---------|
| **Tipo** | App nativa (Kotlin + Jetpack Compose) |
| **API** | `https://corrientelebeche.es/barrioteca/api-proxy.php` |
| **minSdk** | 28 (Android 9 o superior) |
| **targetSdk** | 36 |
| **Package ID** | `com.lebeche.barrioteca` |
| **Pantalla completa** | ✅ Sin barra de navegación |
| **Cámara** | ✅ Escáner de códigos de barras |
| **Conexión** | Se conecta a tu NAS desde cualquier parte |

### Requisitos

- Android 9.0 o superior
- Conexión a internet

### Actualizar la app

La app Android v2 es nativa y se comunica con el NAS a través de la API (`api-proxy.php`). Cuando cambies SLiMS o la API, los cambios se reflejan sin tocar la app; para cambios de interfaz o funciones nuevas hay que publicar una versión nueva en Google Play.

Para publicar una nueva versión, consulta el `README.md` de `barrioteca-android-app-v2/`.

### Google Play

Ya disponible en Google Play Store. La documentación de publicación está en el repositorio: [acalenca-barrioteca-app-android-v2](https://github.com/jesuscastilla/acalenca-barrioteca-app-android-v2).

### App Store (iOS)

También disponible para iPhone y iPad. Consulta el repositorio: [acalenca-barrioteca-app-ios](https://github.com/jesuscastilla/acalenca-barrioteca-app-ios).

---

## Instalación en iOS como PWA

Además de la app nativa, la app web es instalable como PWA en iPhone/iPad:

1. Abre `https://corrientelebeche.es/barrioteca/` en **Safari**
2. Toca **Compartir** (flecha hacia arriba)
3. Pulsa **Añadir a pantalla de inicio**

La app web muestra un aviso automático con estas instrucciones, **solo en dispositivos iOS**. En Android la instalación se hace desde Google Play.

---

## Infraestructura

La Barrioteca Acalencá se aloja en un **NAS Synology** que funciona como nube local encriptada y autogestionada, sin dependencia de servidores externos. El acceso al panel de administración (DSM) se realiza vía `https://pelotxo.synology.me:5001`. La app web y SLiMS se sirven por HTTPS estándar (puerto 443).

- **Acceso por red local**: SSH en `192.168.50.93` (o `192.168.50.94`), puerto **22**.
- **Archivos del NAS**: disponibles en `\\192.168.50.94\` desde Windows.
- **Código local**: cada repositorio está clonado en `G:\GITHUB\`.

## Repositorios relacionados

| App | Repositorio |
|-----|------------|
| Android (.apk) | [acalenca-barrioteca-app-android](https://github.com/jesuscastilla/acalenca-barrioteca-app-android) |
| iOS (iPhone/iPad) | [acalenca-barrioteca-app-ios](https://github.com/jesuscastilla/acalenca-barrioteca-app-ios) |

---

## Creditos

Este proyecto ha sido desarrollado por Peloxi (Instagram: @Pelochochi) para la Barrioteca Acalenca, un espacio perteneciente a Lebeche, asociacion cultural y vecinal de Salobrena (Granada).

## Licencia

GNU General Public License v3.0
