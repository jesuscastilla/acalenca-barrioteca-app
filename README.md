# Barrioteca Acalencá — PWA de Préstamos

Aplicación Web Progresiva (PWA) para la gestión vecinal de préstamos y devoluciones de la **Barrioteca Acalencá** en Salobreña.

## ¿Qué es la Barrioteca Acalencá?

Somos una biblioteca vecinal autogestionada. Cualquier vecina puede sociarse, llevarse libros en préstamo y devolverlos cuando termine de leerlos. Todo el sistema funciona con software libre (SLiMS + PWA) alojado en un NAS Synology de la propia barrioteca, sin depender de servicios externos ni ceder datos a terceros.

## Cómo funciona la autogestión

1. **Alta de socias**: Una administradora da de alta a las vecinas en el panel de SLiMS (backend), asignando un ID de socia único (ej. `SOCIA-001`).
2. **Identificación**: Cada socia introduce su ID en la PWA desde su móvil para identificarse.
3. **Préstamo**: Escanea el código de barras (ISBN/ASIN) del libro que quiere llevarse. La PWA se comunica con SLiMS y registra el préstamo.
4. **Devolución**: Escanea el mismo código al devolver el libro. SLiMS lo marca como disponible.
5. **Catálogo**: Cualquier socia puede buscar libros por título, autora o ISBN desde la app.

Todo queda registrado en la base de datos de SLiMS, permitiendo saber en todo momento qué libros están prestados y a quién.

## Características

- **Escaneo de códigos**: Usa la cámara del móvil para leer códigos de barras (ISBN/ASIN) de libros y tarjetas de socias.
- **Modo offline**: Al instalarse como app, funciona como aplicación nativa. Se puede usar sin conexión (el historial se guarda localmente).
- **Lenguaje inclusivo**: Interfaz en femenino (socia, autora, bienvenida), coherente con el espíritu del proyecto.
- **Privacidad total**: Todo corre en el NAS de la barrioteca. No se comparten datos con terceros.

## Tecnología

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend proxy**: Node.js + Express (sirve la PWA y hace de puente con SLiMS)
- **Backend real**: SLiMS 9 (PHP + MariaDB) con API REST personalizada
- **Escáner**: html5-qrcode (lectura de códigos de barras desde la cámara)

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El servidor se lanza en `http://localhost:3000` y hace de proxy hacia la API de SLiMS.

## Despliegue en producción (NAS Synology)

```bash
# Compilar la PWA
npm run build

# El contenido de dist/ se copia al NAS junto con server.ts compilado
# Se necesita Node.js en el NAS para ejecutar el servidor Express
```

Para instrucciones detalladas de instalación, consulta:
- [`MANUAL_USUARIA.md`](MANUAL_USUARIA.md) — Cómo usan la app las socias
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — Despliegue técnico en NAS Synology
- [`MANUAL_INSTALL_SYNOLOGY.md`](../SLiMS/MANUAL_INSTALL_SYNOLOGY.md) — Instalación completa del backend SLiMS

## Licencia

GNU General Public License v3.0
