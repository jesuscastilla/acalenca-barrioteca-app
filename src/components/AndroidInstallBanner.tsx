import { useEffect, useState } from 'react';
import { Download, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PLAY_STORE_URL, isAndroid, isStandalone } from '../lib/platform';

/**
 * Banner de instalación exclusivo para Android: enlaza a la app nativa en
 * Google Play. Se muestra de inmediato y siempre, en cualquier móvil Android
 * (no en iOS, escritorio ni dentro de la app ya instalada).
 */
export function AndroidInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAndroid() && !isStandalone()) setVisible(true);
  }, []);

  // Si la PWA pasa a modo standalone (recién instalada), se oculta.
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (!mq) return;
    const onChange = () => {
      if (mq.matches) setVisible(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const close = () => setVisible(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Instalar la Barrioteca desde Google Play"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-4 right-4 mx-auto max-w-md z-[65] bg-surface border border-outline/30 rounded-md shadow-lg p-4"
        >
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-primary-container text-on-primary-container shrink-0">
              <Play size={18} />
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">Descarga la app en Google Play</p>
              <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                Disfruta de la Barrioteca con la app nativa para Android.
              </p>

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 bg-primary text-on-primary px-3 py-2 rounded-md text-xs font-bold"
              >
                <Download size={14} />
                Instalar
              </a>
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
