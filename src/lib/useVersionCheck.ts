import { useEffect, useState, useCallback } from 'react';

// __APP_BUILD_TIME__ es inyectado por Vite durante la compilación
declare const __APP_BUILD_TIME__: number;

const currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 0;
const CHECK_INTERVAL_MS = 45000; // 45 segundos

/**
 * Hook para comprobar si hay una nueva versión desplegada en el servidor.
 * Al no usar caché, consulta ./version.json sin almacenar nada en el navegador.
 * Si el buildTime del servidor es superior al del cliente, recarga la app inmediatamente.
 */
export function useVersionCheck() {
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkForUpdates = useCallback(async (manual = false) => {
    if (checking) return;
    try {
      setChecking(true);
      const res = await fetch(`./version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.buildTime && currentBuildTime > 0 && data.buildTime > currentBuildTime) {
          console.log('[Barrioteca] ¡Nueva versión detectada en el NAS! Recargando...');
          window.location.reload();
          return;
        }
      }
      setLastCheck(new Date());
    } catch (e) {
      console.warn('[Barrioteca] No se pudo verificar la versión en el NAS:', e);
    } finally {
      setChecking(false);
    }
  }, [checking]);

  useEffect(() => {
    // 1. Comprobación periódica
    const interval = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL_MS);

    // 2. Comprobación al volver a la app (cambio de pestaña, desbloqueo de móvil)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Comprobación al recibir foco en la ventana
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  return { checkForUpdates, checking, lastCheck, currentBuildTime };
}
