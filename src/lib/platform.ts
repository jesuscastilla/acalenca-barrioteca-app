const DISMISS_KEY = 'pwa_install_dismissed';

/** True si el dispositivo es un iPhone/iPad (incluye iPadOS 13+, que se identifica como Mac). */
export function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reporta plataforma "MacIntel" con pantalla táctil.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIPadOS;
}

/** True si la web ya se está ejecutando como app instalada (standalone). */
export function isStandalone(): boolean {
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(displayMode || iosStandalone);
}

/** True en navegadores embebidos (Instagram/Facebook/WhatsApp…), que no permiten instalar. */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|MicroMessenger|GSA\//i.test(
    navigator.userAgent || '',
  );
}

/** True si el usuario ya descartó el banner de instalación. */
export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Guarda el descarte del banner para no volver a mostrarlo. */
export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* almacenamiento no disponible */
  }
}
