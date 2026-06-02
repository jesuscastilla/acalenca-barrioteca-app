# Guía de Despliegue Final: Barrioteca Acalencá

Este proyecto ha sido optimizado y limpiado para su despliegue inmediato en tu NAS Synology. Se ha feminizado todo el lenguaje del frontend para una experiencia más inclusiva y cercana.

## Cambios Realizados

1.  **Limpieza de Código**: Se ha eliminado el archivo `api.php` legacy. Ahora todo el tráfico fluye a través de la API moderna en `api/v1/`.
2.  **Lenguaje Feminizado**: Se han actualizado todos los componentes de la PWA (`App.tsx`, `CatalogSearch.tsx`, `Scanner.tsx`) para usar términos como **"Socia"**, **"Autora"**, **"Bienvenida"**, etc.
3.  **Unificación de API**: La PWA utiliza un proxy interno (`/api`) que se comunica con SLiMS de forma segura.
4.  **Optimización para NAS**: El `docker-compose.yml` está listo para levantar ambos servicios en la misma red interna.

## Instrucciones de Despliegue en Synology NAS

### 1. Preparación de Archivos
Asegúrate de que las carpetas `acalenca-barrioteca` y `acalenca-barrioteca-app` estén en el mismo nivel de directorio en tu servidor.

### 2. Ejecución con Docker Compose
Desde la carpeta `acalenca-barrioteca`, ejecuta:

```bash
docker-compose up -d --build
```

Esto creará tres contenedores:
- `db`: Base de datos MariaDB.
- `slims`: El backend de la biblioteca.
- `barrioteca-pwa`: El frontend moderno (puerto 3000).

### 3. Configuración del Reverse Proxy (Opcional pero recomendado)
Para que la PWA sea instalable (HTTPS), ve a:
**Panel de Control > Portal de Inicio de Sesión > Avanzado > Proxy Inverso**
- Crea una regla que apunte tu dominio (ej: `https://biblioteca.tu-nas.me`) al puerto `3000` del NAS.

## Notas de Uso
- **Identificación**: La primera vez, introduce tu código de socia para activar la sesión.
- **Escáner**: Puedes usar la cámara en vivo o tomar una foto del código de barras si el navegador restringe el acceso a la cámara.
- **Catálogo**: Busca libros por título o autora directamente desde la app.

---
*Proyecto preparado por Manus AI para la Barrioteca de Acalencá.*
