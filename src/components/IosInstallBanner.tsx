import { useEffect, useState } from 'react';
import { Plus, Share, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  dismissInstall,
  isIOS,
  isInAppBrowser,
  isInstallDismissed,
  isStandalone,
} from '../lib/platform';

const SHOW_DELAY_MS = 4000;

/**
 * Banner de instalación exclusivo para iOS.
 *
 * iOS Safari no soporta `beforeinstallprompt`, así que en lugar de un diálogo
 * de instalación se muestra una instrucción: Compartir → Añadir a pantalla de
 * inicio. No se muestra en Android, escritorio ni en navegadores embebidos.
 */
export function IosInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone() || isInstallDismissed()) return;
    setInApp(isInAppBrowser());
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Si el dispositivo pasa a modo standalone mientras el banner está visible,
  // se oculta automáticamente (acaba de instalarse).
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (!mq) return;
    const onChange = () => {
      if (mq.matches) setVisible(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const close = () => {
    dismissInstall();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Instalar la Barrioteca"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-md z-[65] bg-surface border border-outline/30 rounded-md shadow-lg p-4"
        >
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-primary-container text-on-primary-container shrink-0">
              <Share size={18} />
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">Instala la Barrioteca</p>
              {inApp ? (
                <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                  Ábrela en <strong>Safari</strong> y toca Compartir → “Añadir a
                  pantalla de inicio”.
                </p>
              ) : (
                <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                  Toca{' '}
                  <Share size={12} className="inline -mt-0.5" aria-hidden="true" />{' '}
                  <strong>Compartir</strong> y después{' '}
                  <Plus size={12} className="inline -mt-0.5" aria-hidden="true" />{' '}
                  <strong>Añadir a pantalla de inicio</strong>.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="p-1 text-on-surface-variant hover:bg-surface-variant rounded-sm shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
