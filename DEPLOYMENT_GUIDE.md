# Guía de Despliegue Final: Barrioteca Acalencá

Este proyecto ha sido optimizado y limpiado para su despliegue inmediato en tu NAS Synology. Se ha feminizado todo el lenguaje del frontend para una experiencia más inclusiva y cercana.

## Cambios Realizados

1.  **Limpieza de Código**: Se ha eliminado el archivo `api.php` legacy. Ahora todo el tráfico fluye a través de la API moderna en `api/v1/`.
2.  **Lenguaje Feminizado**: Se han actualizado todos los componentes de la PWA (`App.tsx`, `CatalogSearch.tsx`, `Scanner.tsx`) para usar términos como **"Socia"**, **"Autora"**, **"Bienvenida"**, etc.
3.  **Unificación de API**: La PWA utiliza un proxy interno (`/api`) que se comunica con SLiMS de forma segura.
4.  **Optimización para NAS**: Configurado para funcionar con MariaDB en el puerto 3007 de tu Synology.

## Instrucciones de Despliegue en Synology NAS

### 1. Base de Datos
Asegúrate de que MariaDB esté funcionando en el puerto 3007 con el usuario `acalenca` y la base de datos `acalenca`.

### 2. Servidor Web
Sube la carpeta `acalenca-barrioteca` a tu servidor web (Apache/Nginx) en el NAS.

### 3. PWA (Frontend)
La PWA se ejecuta mediante Node.js. Asegúrate de tener Node.js instalado en tu NAS y ejecuta:
```bash
npm install
npm run build
npm start
```

### 4. Configuración del Reverse Proxy (Opcional pero recomendado)
Para que la PWA sea instalable (HTTPS), ve a:
**Panel de Control > Portal de Inicio de Sesión > Avanzado > Proxy Inverso**
- Crea una regla que apunte tu dominio (ej: `https://biblioteca.tu-nas.me`) al puerto `3000` del servidor de la PWA.

## Notas de Uso
- **Identificación**: La primera vez, introduce tu código de socia para activar la sesión.
- **Escáner**: Puedes usar la cámara en vivo o tomar una foto del código de barras si el navegador restringe el acceso a la cámara.
- **Catálogo**: Busca libros por título o autora directamente desde la app.

---
*Proyecto preparado para la Barrioteca de Acalencá.*
