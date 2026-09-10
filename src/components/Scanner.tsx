import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, Radio, X } from 'lucide-react';

interface ScannerProps {
  onResult: (isbn: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onResult }) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [photoScanning, setPhotoScanning] = useState(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const rearCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('environment'),
          );
          setSelectedCameraId(rearCam ? rearCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron detectar cámaras:', err);
      });

    return () => {
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          qrCodeInstanceRef.current
            .stop()
            .catch((err) => console.error('Error al detener cámara:', err));
        }
      }
    };
  }, []);

  const startScanning = async (cameraId: string) => {
    setScannerError(null);
    setSuccess(null);

    const container = document.getElementById('reader-container');
    if (!container) {
      setScannerError('Error visual: contenedor no encontrado.');
      return;
    }

    try {
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          await qrCodeInstanceRef.current.stop();
        }
        qrCodeInstanceRef.current = null;
      }

      const instance = new Html5Qrcode('reader-container');
      qrCodeInstanceRef.current = instance;

      setIsScanning(true);

      const targetCamera = cameraId || { facingMode: 'environment' };

      await instance.start(
        targetCamera,
        {
          fps: 15,
          qrbox: (videoWidth, videoHeight) => {
            const boxWidth = Math.min(videoWidth * 0.85, 340);
            const boxHeight = Math.min(videoHeight * 0.45, 140);
            return { width: Math.round(boxWidth), height: Math.round(boxHeight) };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          setSuccess(decodedText);
          onResult(decodedText);

          if (navigator.vibrate) {
            try {
              navigator.vibrate(120);
            } catch (e) {
              /* noop */
            }
          }

          handleStop();
        },
        () => {
          // Callback de error de frame: se ignora
        },
      );
    } catch (err: any) {
      console.error('Fallo al iniciar escáner:', err);
      setIsScanning(false);
      setScannerError(err.message || 'No se pudo acceder a la cámara.');
    }
  };

  const handleStop = async () => {
    if (qrCodeInstanceRef.current) {
      if (qrCodeInstanceRef.current.isScanning) {
        try {
          await qrCodeInstanceRef.current.stop();
        } catch (e) {
          console.error('Error al parar cámara:', e);
        }
      }
      qrCodeInstanceRef.current = null;
    }
    setIsScanning(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerError(null);
    setSuccess(null);
    setIsScanning(false);
    setPhotoScanning(true);

    try {
      let tempDiv = document.getElementById('temp-html5-qrcode-container');
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = 'temp-html5-qrcode-container';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
      }

      const html5QrCode = new Html5Qrcode('temp-html5-qrcode-container');
      const decodedText = await html5QrCode.scanFile(file, true);
      await html5QrCode.clear();

      setSuccess(decodedText);
      onResult(decodedText);

      if (navigator.vibrate) {
        try {
          navigator.vibrate(120);
        } catch (e) {
          /* noop */
        }
      }
    } catch (err: any) {
      setScannerError('No se detectó código en la foto. Intenta de nuevo.');
    } finally {
      setPhotoScanning(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="bg-surface rounded-lg border border-outline/40 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-outline/20 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-md ${
                isScanning
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-variant text-on-surface-variant'
              }`}
            >
              <Camera size={18} />
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Escáner Óptico
              </h4>
              <p className="text-sm font-bold">
                {isScanning ? 'Cámara Activa' : 'Cámara en Espera'}
              </p>
            </div>
          </div>

          {isScanning ? (
            <button
              onClick={handleStop}
              className="p-2 text-error hover:bg-error/10 rounded-md"
              aria-label="Detener"
            >
              <X size={18} />
            </button>
          ) : (
            cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="text-[10px] font-bold bg-surface-variant border border-outline rounded-sm px-2 py-1"
              >
                {cameras.map((c, i) => (
                  <option key={i} value={c.deviceId}>
                    {c.label || `Cámara ${i + 1}`}
                  </option>
                ))}
              </select>
            )
          )}
        </div>

        <div className="relative w-full aspect-video rounded-md bg-black overflow-hidden flex items-center justify-center">
          <div id="reader-container" className="absolute inset-0 w-full h-full object-cover"></div>

          {!isScanning && !success && !photoScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-10 space-y-4">
              <p className="text-xs text-gray-400">
                Usa tu cámara o sube una foto del código de barras.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => startScanning(selectedCameraId)}
                  className="flex-1 py-3 bg-primary text-on-primary font-bold text-[10px] uppercase rounded-md flex items-center justify-center gap-2"
                >
                  <Radio size={14} />
                  En Vivo
                </button>
                <label className="flex-1 py-3 bg-surface-variant text-ink font-bold text-[10px] uppercase rounded-md flex items-center justify-center gap-2 cursor-pointer">
                  <Camera size={14} />
                  Foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none z-20">
              <div className="w-full h-full border-2 border-accent/50 rounded-sm relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent/80 animate-pulse"></div>
              </div>
            </div>
          )}

          {photoScanning && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30">
              <RefreshCw className="animate-spin text-accent mb-2" size={32} />
              <p className="text-xs text-white">Analizando imagen...</p>
            </div>
          )}
        </div>

        {scannerError && (
          <p className="text-[10px] text-error bg-error/10 p-2 rounded-sm font-bold">
            {scannerError}
          </p>
        )}
      </div>
    </div>
  );
};
