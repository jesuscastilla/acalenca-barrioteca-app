# 📚 Manual de Usuaria — Barrioteca Acalencá

Este manual detalla cómo utilizar el sistema de gestión de la **Barrioteca Acalencá**, desde la creación de socias en el panel de administración (SLiMS) hasta el uso cotidiano de la aplicación móvil (PWA) para préstamos y devoluciones.

---

## 1. Gestión de Socias (Panel SLiMS)

Para que una vecina pueda utilizar la PWA, primero debe estar registrada en la base de datos de SLiMS.

### Cómo crear una nueva socia:
1.  **Accede al panel de administración**: Entra en tu instancia de SLiMS (ej. `https://tu-dominio/slims/admin`).
2.  **Módulo de Membresía**: En el menú lateral, haz clic en **Membresía** (o *Membership*).
3.  **Añadir Socia**: Haz clic en el botón **Añadir Nueva Socia**.
4.  **Datos Obligatorios**:
    *   **ID de Socia**: Asigna un código único (ej. `SOCIA-001`). Este es el código que se usará para entrar en la PWA.
    *   **Nombre de la Socia**: Nombre completo.
    *   **Fecha de Nacimiento**: Requerido por el sistema.
    *   **Tipo de Membresía**: Selecciona el perfil correspondiente (ej. Estándar).
5.  **Fecha de Registro y Expiración**: Asegúrate de que la fecha de expiración sea futura; de lo contrario, la PWA no permitirá realizar préstamos.
6.  **Guardar**: Haz clic en **Guardar**.

---

## 2. Uso de la Aplicación Móvil (PWA)

La PWA está diseñada para ser rápida y sencilla, ideal para usar con la cámara del móvil.

### Acceso e Identificación:
1.  **Entrar**: Abre la URL de la PWA en tu navegador móvil.
2.  **Identificación**: En la pantalla de inicio, introduce tu **ID de Socia** (el que creamos en el paso anterior) y pulsa **Entrar**.
3.  **Bienvenida**: Si el ID es correcto, verás un mensaje de bienvenida y tu nombre aparecerá como "Socia Activa".

### Cómo realizar un Préstamo:
1.  **Escanear**: Pulsa el botón grande de **Escanear** en el menú principal, o toca el icono del escáner en la barra inferior.
2.  **Seleccionar Modo**: Asegúrate de que el interruptor superior esté en **Préstamo**.
3.  **Identificar Libro**: 
    *   Apunta con la cámara al código de barras del libro (ISBN o ASIN).
    *   Si la cámara no lo lee bien, puedes escribir el código manualmente en la sección **Entrada Manual**, o tomar una foto del código pulsando **Foto**.
4.  **Confirmación**: La app mostrará un mensaje de éxito si el libro está disponible y se ha registrado correctamente a tu nombre.

### Cómo realizar una Devolución:
1.  **Escanear**: Pulsa el botón de **Escanear** o el icono en la barra inferior.
2.  **Seleccionar Modo**: Cambia el interruptor superior a **Devolución**.
3.  **Identificar Libro**: Escanea el código de barras del libro que quieres devolver.
4.  **Confirmación**: El sistema liberará el libro y lo marcará como disponible para la siguiente socia.

---

## 3. Instalación en el Móvil

Para que la aplicación funcione como una app nativa (sin barras de navegador):

*   **En Android (Chrome)**: Cuando aparezca el banner de instalación, pulsa **Instalar**. También puedes ir a los tres puntos de la esquina superior derecha y seleccionar **Instalar aplicación** o **Añadir a pantalla de inicio**.
*   **En iOS (Safari)**: Pulsa el botón de **Compartir** (cuadrado con flecha hacia arriba) y selecciona **Añadir a pantalla de inicio**.

Una vez instalada, podrás abrir Barrioteca directamente desde el icono en tu pantalla de inicio, como cualquier otra app.

---

## 4. Consultar el Catálogo

Para ver todos los libros disponibles en la barrioteca:
1.  Ve a la sección **Catálogo** (icono de lupa en la barra inferior).
2.  El sistema cargará automáticamente la lista completa de libros.
3.  Cada libro muestra su título, autora, ISBN y si está disponible o prestado.

---

## 5. Solución de Problemas

### No puedo iniciar sesión (ID de socia no reconocida)
- Verifica que el ID esté escrito exactamente como aparece en SLiMS (distingue mayúsculas/minúsculas).
- Asegúrate de que la socia esté activa y con fecha de expiración futura en SLiMS.
- Comprueba que el servidor está funcionando e intenta más tarde.

### La cámara no funciona
- Asegúrate de haber concedido permisos de cámara al navegador.
- Si el escáner en vivo no funciona, pulsa **Foto** y selecciona una foto del código de barras desde tu galería.
- Como alternativa, introduce el código manualmente en el campo de entrada y pulsa **Enviar**.

### Error al hacer un préstamo o devolución
- Verifica que la socia activa es la correcta (aparece en la parte superior).
- Comprueba que el libro existe en el catálogo de SLiMS y no está ya prestado.
- Si el error persiste, comprueba la conexión al servidor o contacta con la administración.

### La app va lenta
- Cierra otras aplicaciones en segundo plano.
- Recarga la página o vuelve a abrir la app desde el icono.
- Si el problema persiste, limpia la caché del navegador.

---

> **Nota sobre Privacidad**: Todos los datos se almacenan en tu servidor NAS. La aplicación no comparte información con terceros, salvo la consulta básica a Google Books para mostrar la portada y el título del libro durante el escaneo.

> **Consejo**: Si gestionas varios préstamos seguidos, mantén pulsado el botón **Enviar** tras escribir el código manual para agilizar el proceso.