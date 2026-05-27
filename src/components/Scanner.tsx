import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, Check, CheckCircle2, AlertTriangle, HelpCircle, Send, Radio, HelpCircleIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerProps {
  onScanSuccess: (isbn: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [photoScanning, setPhotoScanning] = useState(false);
  
  // Manual Input Fallback
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManual, setShowManual] = useState(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);

  // Get available devices on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Try to select rear/environment camera by default, or the first one
          const rearCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(rearCam ? rearCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("No se pudieron enumerar las cámaras:", err);
      });

    return () => {
      // Clean up instance on unmount
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          qrCodeInstanceRef.current.stop().catch(err => console.error("Error stopping on unmount:", err));
        }
      }
    };
  }, []);

  const startScanning = async (cameraId: string) => {
    setScannerError(null);
    setSuccess(null);
    
    // Ensure container exists
    const container = document.getElementById("reader-container");
    if (!container) {
      setScannerError("Contenedor de vídeo no encontrado.");
      return;
    }

    try {
      // If there's an active scanner instance, stop it first
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          await qrCodeInstanceRef.current.stop();
        }
        qrCodeInstanceRef.current = null;
      }

      const instance = new Html5Qrcode("reader-container");
      qrCodeInstanceRef.current = instance;

      setIsScanning(true);

      const targetCamera = cameraId || { facingMode: "environment" };

      await instance.start(
        targetCamera,
        {
          fps: 15,
          qrbox: (videoWidth, videoHeight) => {
            // Highly optimized horizontal rectangle for ISBN (EAN-13) barcodes
            const boxWidth = Math.min(videoWidth * 0.85, 340);
            const boxHeight = Math.min(videoHeight * 0.45, 140);
            return { width: Math.round(boxWidth), height: Math.round(boxHeight) };
          },
          aspectRatio: 1.333333
        },
        (decodedText) => {
          // Success Callback
          setSuccess(decodedText);
          onScanSuccess(decodedText);
          
          if (navigator.vibrate) {
            try { navigator.vibrate(120); } catch(e) {}
          }
          
          // Auto stop camera on success to preserve resource
          handleStop();
        },
        (errorMessage) => {
          // Continuous parsing errors can be ignored while seeking a code
        }
      ).catch((err) => {
        throw err;
      });

    } catch (err: any) {
      console.error("Fallo al iniciar el escaneo de cámara:", err);
      setIsScanning(false);
      setScannerError(
        err.message || 
        "No se pudo acceder a la cámara. Concede permisos de cámara en tu navegador o abre el App en otra pestaña si estás en el iframe de desarrollo."
      );
    }
  };

  const handleStop = async () => {
    if (qrCodeInstanceRef.current) {
      if (qrCodeInstanceRef.current.isScanning) {
        try {
          await qrCodeInstanceRef.current.stop();
        } catch (e) {
          console.error("Error al parar la cámara:", e);
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
      // Create a temporary container for scanner dynamically
      let tempDiv = document.getElementById('temp-html5-qrcode-container');
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = 'temp-html5-qrcode-container';
        // Hide container elegantly
        tempDiv.style.position = 'absolute';
        tempDiv.style.width = '1px';
        tempDiv.style.height = '1px';
        tempDiv.style.overflow = 'hidden';
        tempDiv.style.opacity = '0';
        document.body.appendChild(tempDiv);
      }

      const html5QrCode = new Html5Qrcode('temp-html5-qrcode-container');
      
      // Decodes barcode from picture file
      const decodedText = await html5QrCode.scanFile(file, true);
      
      // Clean up resources
      await html5QrCode.clear();

      setSuccess(decodedText);
      onScanSuccess(decodedText);

      if (navigator.vibrate) {
        try { navigator.vibrate(120); } catch(e) {}
      }
    } catch (err: any) {
      console.error("Error decoding barcode from image file:", err);
      setScannerError(
        "No se detectó ningún código ISBN de barras en tu foto. " +
        "Tip: Asegúrate de hacer la foto de cerca, bien iluminada, enfocada, y centrada directamente en el código de barras horizontal del libro."
      );
    } finally {
      setPhotoScanning(false);
      // Reset input element value to allow scanning same file again if they desire
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIsbn = manualIsbn.replace(/[-\s]/g, '').trim();
    if (!cleanIsbn) return;

    setSuccess(cleanIsbn);
    onScanSuccess(cleanIsbn);
    setManualIsbn('');
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto font-sans">
      
      {/* Primary Camera Scan Panel */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-4">
        
        {/* Cam controls bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl shrink-0 ${isScanning ? 'bg-amber-100 text-amber-900 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
              <Camera size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Escáner Óptico de ISBNs</h4>
              <p className="text-sm font-bold text-gray-900">
                {isScanning ? "Cámara Activa" : "Cámara en Espera"}
              </p>
            </div>
          </div>

          {/* Select Camera Dropdown */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1">
              <RefreshCw size={12} className="text-gray-400 shrink-0" />
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCameraId(newId);
                  if (isScanning) {
                    startScanning(newId);
                  }
                }}
                className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none max-w-[150px] truncate"
              >
                {cameras.map((device, idx) => (
                  <option key={device.deviceId ? `${device.deviceId}-${idx}` : `cam-fallback-${idx}`} value={device.deviceId}>
                    {device.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Viewport Box */}
        <div className="relative overflow-hidden w-full aspect-video sm:aspect-[4/3] rounded-2xl bg-black border border-gray-800 flex flex-col items-center justify-center">
          
          {/* Active Reader Target Element */}
          <div 
            id="reader-container" 
            className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover"
          ></div>

          {/* Fallback Display if Camera is stopped */}
          {!isScanning && !success && !photoScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 bg-[#141414]/95">
              <div className="bg-amber-500/10 p-4 rounded-full text-amber-500 border border-amber-500/20 shrink-0">
                <Camera size={28} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h5 className="font-serif italic text-base text-white font-bold">Lector de Códigos de Barras</h5>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Utiliza tu cámara en directo o haz una foto al código de barras ISBN:
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[340px] px-2">
                {/* Opción 1: Cámara en vivo con getUserMedia */}
                <button
                  onClick={() => startScanning(selectedCameraId)}
                  className="flex-1 py-2.5 px-3.5 bg-amber-500 hover:bg-amber-600 font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1.5 text-black transition-colors"
                >
                  <Radio size={13} className="animate-pulse shrink-0" />
                  <span>Cámara en Vivo</span>
                </button>

                {/* Opción 2: Fotos con la cámara nativa del sistema Android/iOS */}
                <label
                  htmlFor="camera-photo-capture"
                  className="flex-1 py-2.5 px-3.5 bg-gray-800 hover:bg-gray-700 font-bold uppercase tracking-wider text-[10px] text-gray-100 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 transition-colors text-center"
                >
                  <Camera size={13} className="shrink-0 text-amber-400" />
                  <span>Hacer Foto Móvil</span>
                </label>
                <input
                  type="file"
                  id="camera-photo-capture"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Photo Decoding Overlay State */}
          {photoScanning && (
            <div className="absolute inset-0 bg-[#141414]/95 flex flex-col items-center justify-center p-6 text-center z-40 space-y-4">
              <RefreshCw size={32} className="animate-spin text-amber-500" />
              <div className="space-y-1">
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded uppercase font-bold animate-pulse">Analizando Imagen</span>
                <h5 className="font-serif italic text-base text-white font-bold mt-1">Descodificando Código ISBN...</h5>
                <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed mx-auto">
                  Por favor, espera mientras la biblioteca detecta las líneas del código de barras en la foto tomada.
                </p>
              </div>
            </div>
          )}

          {/* Frame overlays when scanning is active */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-30">
              
              {/* Semi-transparent dark frame mask mimicking focus */}
              <div className="absolute inset-0 border-[30px] sm:border-[50px] border-[#141414]/75"></div>

              {/* Viewfinder Bounding Box */}
              <div className="relative w-[85%] max-w-[340px] h-[45%] max-h-[140px] border border-white/20 select-none shadow-[0_0_80px_rgba(0,0,0,0.8)]">
                
                {/* Glowing Amber Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-500 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-500 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-500 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-500 rounded-br-lg"></div>

                {/* Simulated scan laser line */}
                <div className="scrolling-laser"></div>
              </div>

              {/* Guidance Text HUD overlay */}
              <div className="absolute bottom-4 sm:bottom-8 bg-[#141414]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-700/50 text-[10px] text-gray-300 flex items-center gap-1 font-mono uppercase tracking-widest">
                <span>Centra el código de barras aquí</span>
              </div>
            </div>
          )}

          {/* Quick stop overlay button */}
          {isScanning && (
            <button
              onClick={handleStop}
              className="absolute top-4 right-4 bg-[#141414]/80 text-[#F5F5F0] hover:bg-[#141414] px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 z-40 transition-colors"
            >
              Apagar Cámara
            </button>
          )}

          {/* Success overlay state inside the viewport */}
          {success && !isScanning && (
            <div className="absolute inset-0 bg-[#141414]/90 flex flex-col items-center justify-center p-6 text-center z-40 space-y-3">
              <div className="bg-green-500/20 text-green-400 p-4 rounded-full border border-green-500/30">
                <Check size={32} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] bg-green-500/20 text-green-300 font-mono px-2 py-0.5 rounded uppercase font-bold">¡Código Escaneado!</span>
                <h5 className="font-mono text-lg text-white font-bold tracking-wider mt-1">{success}</h5>
                <p className="text-xs text-gray-400">Enviado y sincronizado exitosamente con el SLIMS de tu NAS (configurado por Pelotxo).</p>
              </div>
              <button
                onClick={() => {
                  setSuccess(null);
                  startScanning(selectedCameraId);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-mono text-[10px] uppercase font-bold tracking-wide rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={11} /> Scanear otro libro
              </button>
            </div>
          )}
        </div>

        {/* Display System warnings/help if camera failed */}
        {scannerError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>¿La cámara no inicia o no responde?</span>
            </p>
            <p className="opacity-90">
              Algunos navegadores restringen el uso de la cámara si la aplicación se ejecuta dentro de un recuadro cerrado (iFrame).
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-80 font-medium">
              <li><b>Concede Permisos</b>: Asegúrate de otorgar permisos de cámara cuando tu explorador te lo solicite.</li>
              <li><b>Nuevo Tab</b>: Haz clic en el icono de la esquina superior derecha (flecha con caja) de tu panel de vista previa para abrir la app en una pestaña independiente.</li>
              <li><b>Usa el Buscador/Entrada Manual</b>: Escribe el ISBN abajo para continuar de inmediato sin retrasos.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Manual Input Fallback & Search Widget */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-3">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-900">
              <Send size={15} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Entrada Alternativa</p>
              <h4 className="text-sm font-bold text-gray-900">Introducir ISBN Manualmente</h4>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest px-2.5 py-1 bg-amber-50 rounded-full">
            {showManual ? "Cerrar" : "Escribir ISBN"}
          </span>
        </button>

        <AnimatePresence>
          {showManual && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleManualSubmit}
              className="pt-3 border-t border-gray-100 space-y-3 overflow-hidden text-xs"
            >
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Si no tienes cámara web o no lee bien el código, teclea el ISBN de 10 o 13 dígitos directamente para solicitar préstamo o devolución en tu servidor SLIMS de Pelotxo.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 9788420633138"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono focus:ring-1 focus:ring-ink focus:outline-none focus:bg-white transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#141414] text-[#F5F5F0] hover:bg-opacity-90 px-5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1"
                >
                  <span>Procesar</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
