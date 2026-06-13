import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Library, 
  Scan, 
  Settings as SettingsIcon, 
  Home, 
  Loader2, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ArrowRightLeft, 
  Trash2, 
  Code, 
  Globe, 
  Smartphone,
  Info,
  User,
  UserPlus,
  Users,
  Check,
  HelpCircle,
  X,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scanner } from './components/Scanner';
import { CatalogSearch } from './components/CatalogSearch';

type View = 'dashboard' | 'search' | 'scan' | 'settings';
type ActionType = 'prestamo' | 'devolucion';

interface LibraryUser {
  id: string;
  nombre: string;
  barcode: string;
}

interface TransactionLog {
  id: string;
  timestamp: string;
  accion: ActionType;
  asin: string;
  status: 'success' | 'error';
  errorMessage?: string;
  usuario?: string;
  bookTitle?: string;
  bookAuthor?: string;
}

/**
 * Componente principal de la PWA Barrioteca Acalencá
 * Gestiona la navegación, el estado de las socias y las operaciones de préstamo/devolución
 */
export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [settingsSubView, setSettingsSubView] = useState<'socia' | 'help'>('socia');
  const endpoint = '/api';
  const [selectedAction, setSelectedAction] = useState<ActionType>('prestamo');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estado de socias (vaciado de datos de prueba)
  const [users, setUsers] = useState<LibraryUser[]>(() => {
    const saved = localStorage.getItem('barrioteca_users');
    if (saved) return JSON.parse(saved);
    return [];
  });
  
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem('barrioteca_active_user_id') || '';
  });

  const [prestamoMemberId, setPrestamoMemberId] = useState<string>(() => {
    return localStorage.getItem('barrioteca_prestamo_member_id') || '';
  });

  // Estados de inicio de sesión
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Historial de transacciones
  const [logs, setLogs] = useState<TransactionLog[]>(() => {
    const saved = localStorage.getItem('barrioteca_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [apiResponse, setApiResponse] = useState<{ status: string; message?: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Gestión de instalación PWA
  useEffect(() => {
    // Detectar si ya está instalada como app standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem('pwa_install_dismissed');

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Mostrar toast automático tras 3 segundos si el usuario no lo descartó antes
      if (!dismissed) {
        setTimeout(() => setShowInstallToast(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallToast(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallToast(false);
    } else {
      // Si rechaza, guardar en localStorage para no molestar más
      localStorage.setItem('pwa_install_dismissed', '1');
      setShowInstallToast(false);
    }
  };

  const handleDismissToast = () => {
    localStorage.setItem('pwa_install_dismissed', '1');
    setShowInstallToast(false);
  };
  
  const activeUser = users.find(u => u.id === activeUserId);

  /**
   * Verificar la identidad de una socia contra el servidor SLiMS
   */
  const handleLogin = async (term: string) => {
    setLoginError(null);
    setLoginSuccess(null);
    if (!term) return;

    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/verify-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ member_id: term })
      });

      let serverData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        serverData = await response.json();
      } else {
        if (response.status === 404) {
          throw new Error('Socia no encontrada (404)');
        }
        throw new Error(`Respuesta no válida del servidor (${response.status})`);
      }
      
      if (serverData && serverData.status === 'success' && serverData.data) {
        const nombreDevuelto = serverData.data.member_name || `Socia ${term}`;
        
        const existingUser = users.find(u => u.barcode === term || u.id === term);
        let userObjId = term;
        if (!existingUser) {
          const newUser: LibraryUser = {
            id: term,
            nombre: nombreDevuelto,
            barcode: term
          };
          setUsers(prev => [...prev, newUser]);
        } else {
          userObjId = existingUser.id;
          setUsers(prev => prev.map(u => u.id === existingUser.id ? { ...u, nombre: nombreDevuelto } : u));
        }
        
        sessionStorage.setItem('id_socia', term);
        setActiveUserId(userObjId);
        setPrestamoMemberId(term);
        setLoginSuccess(`¡Bienvenida de nuevo, ${nombreDevuelto}!`);
        setLoginInput('');
        
        setTimeout(() => {
          setView('scan');
          setLoginSuccess(null);
        }, 1200);
      } else {
        const errMsg = serverData.message || 'No se pudo verificar esta socia en el servidor.';
        setLoginError(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      const detailError = err.message || 'Error de conexión con el servidor.';
      setLoginError(`Fallo al verificar: ${detailError}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Persistencia de datos en localStorage
  useEffect(() => {
    localStorage.setItem('barrioteca_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('barrioteca_active_user_id', activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem('barrioteca_prestamo_member_id', prestamoMemberId);
  }, [prestamoMemberId]);

  useEffect(() => {
    localStorage.setItem('barrioteca_logs', JSON.stringify(logs));
  }, [logs]);

  /**
   * Ejecutar una operación de préstamo o devolución en el servidor SLiMS
   */
  const executeRestAction = async (codeValue: string, actionType: ActionType) => {
    if (!codeValue.trim()) return;
    
    setSyncing(true);
    setApiError(null);
    setApiResponse(null);

    let bookTitle: string | undefined = undefined;
    let bookAuthor: string | undefined = undefined;
    
    // Consultar metadatos del libro (opcional, para el historial)
    try {
      const cleanCode = codeValue.replace(/[-\s]/g, '').trim();
      if (cleanCode.length >= 8) {
        const bookResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`, { timeout: 4000 });
        if (bookResponse.data && bookResponse.data.items && bookResponse.data.items.length > 0) {
          const info = bookResponse.data.items[0].volumeInfo;
          bookTitle = info.title;
          bookAuthor = info.authors ? info.authors.join(', ') : 'Autora Desconocida';
        }
      }
    } catch (bookErr) {
      console.warn("Fallo al consultar metadatos del libro:", bookErr);
    }

    try {
      const payload: any = {
        accion: actionType,
        asin: codeValue.trim()
      };

      if (actionType === 'prestamo') {
        payload.id_socia = prestamoMemberId || activeUser?.barcode || sessionStorage.getItem('id_socia') || "";
      }

      const response = await fetch('/api/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let serverData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        serverData = await response.json();
      } else {
        if (response.status === 404) {
          throw new Error('Registro no encontrado (404)');
        }
        throw new Error(`Respuesta no válida del servidor (${response.status})`);
      }
      
      if (serverData && serverData.status === 'success') {
        setApiResponse({
          status: 'success',
          message: serverData.message || `Operación de ${actionType === 'prestamo' ? 'préstamo' : 'devolución'} completada para ${activeUser ? activeUser.nombre : 'socia'}.`
        });

        const newLog: TransactionLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          accion: actionType,
          asin: codeValue,
          status: 'success',
          usuario: activeUser ? activeUser.nombre : undefined,
          bookTitle,
          bookAuthor
        };
        setLogs(prev => [newLog, ...prev]);
        setManualCode('');
      } else {
        const failMessage = serverData?.error || serverData?.message || "Respuesta de servidor fallida";
        setApiError(failMessage);

        const newLog: TransactionLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          accion: actionType,
          asin: codeValue,
          status: 'error',
          errorMessage: failMessage,
          usuario: activeUser ? activeUser.nombre : undefined,
          bookTitle,
          bookAuthor
        };
        setLogs(prev => [newLog, ...prev]);
      }
    } catch (err: any) {
      console.error(err);
      const detailError = err.message || "Error desconocido de red";
      setApiError(`Fallo al Conectar: ${detailError}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar a esta socia?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
      if (activeUserId === id) {
        setActiveUserId('');
      }
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    if (selectedAction === 'prestamo' && !prestamoMemberId) {
      setPrestamoMemberId(scannedCode);
      setApiResponse({
        status: 'success',
        message: `Tarjeta de socia identificada: "${scannedCode}". Ahora, escanea el código de barras del libro.`
      });
    } else {
      executeRestAction(scannedCode, selectedAction);
    }
  };

  const clearLogs = () => {
    if (window.confirm("¿Seguro que deseas borrar el historial?")) {
      setLogs([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-amber-200">
      <header className="sticky top-0 z-50 bg-[#F5F5F0]/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-ink p-1 rounded-xl text-bg shadow-lg">
            <img src="/logo.png" alt="Logo Barrioteca" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-serif italic font-bold tracking-tight">Barrioteca Acalencá</h1>
            <p className="text-[10px] font-mono tracking-wider opacity-60">Gestión de Préstamos</p>
          </div>
        </div>
        
        {syncing ? (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 animate-pulse">
            <Loader2 className="animate-spin" size={14} />
            Sincronizando...
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-80 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-900">
            <Globe size={11} />
            <span>Producción</span>
          </div>
        )}
      </header>

      {/* ── Toast de instalación PWA ── */}
      <AnimatePresence>
        {showInstallToast && isInstallable && (
          <motion.div
            id="pwa-install-toast"
            initial={{ opacity: 0, y: 80, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-24 left-4 right-4 z-[200] max-w-sm mx-auto"
          >
            <div className="relative bg-[#141414] text-white rounded-[2rem] shadow-2xl overflow-hidden">
              {/* Gradiente decorativo superior */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent pointer-events-none" />

              <div className="relative p-5">
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-400 text-black p-2.5 rounded-2xl shadow-lg">
                      <Download size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Acceso rápido</p>
                      <h4 className="font-bold text-base leading-tight">Instalar Barrioteca</h4>
                    </div>
                  </div>
                  <button
                    id="pwa-toast-close"
                    onClick={handleDismissToast}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0"
                    aria-label="Cerrar notificación"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Descripción */}
                <p className="text-xs text-white/70 leading-relaxed mb-4">
                  Añade la app a tu pantalla de inicio para gestionar préstamos aunque no tengas conexión a internet.
                </p>

                {/* Beneficios */}
                <div className="flex gap-2 mb-4">
                  {['Sin navegador', 'Acceso offline', 'Notificaciones'].map(tag => (
                    <span key={tag} className="text-[10px] font-bold bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    id="pwa-install-btn"
                    onClick={handleInstallClick}
                    className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Download size={16} />
                    Instalar ahora
                  </button>
                  <button
                    onClick={handleDismissToast}
                    className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white/70 text-sm font-medium rounded-2xl transition-all"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container mx-auto max-w-2xl px-6 py-6 pb-32">
        <div>

        {view === 'dashboard' && (
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-serif italic font-bold">Bienvenida</h2>
                <div className="bg-amber-100 p-2 rounded-full text-amber-700">
                  <User size={20} />
                </div>
              </div>
              
              {!activeUser ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Identifícate para empezar a gestionar tus préstamos.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ID de Socia..."
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin(loginInput)}
                    />
                    <button 
                      onClick={() => handleLogin(loginInput)}
                      disabled={isLoggingIn || !loginInput}
                      className="bg-ink text-bg px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-black active:scale-95"
                    >
                      {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
                    </button>
                  </div>
                  {loginError && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><XCircle size={12} /> {loginError}</p>}
                  {loginSuccess && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle size={12} /> {loginSuccess}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono opacity-50 mb-1 uppercase tracking-tighter">Socia Activa</p>
                    <h3 className="text-xl font-bold">{activeUser.nombre}</h3>
                    <p className="text-xs opacity-60 mt-1 flex items-center gap-1"><Code size={10} /> {activeUser.barcode}</p>
                  </div>
                  <button 
                    onClick={() => { setActiveUserId(''); setPrestamoMemberId(''); }}
                    className="text-xs font-bold uppercase text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                  >
                    Salir
                  </button>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setView('scan')}
                className="bg-ink text-bg p-6 rounded-3xl flex flex-col items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95 group"
              >
                <div className="bg-bg/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Scan size={32} />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">Escanear</span>
              </button>
              <button 
                onClick={() => setView('search')}
                className="bg-white text-ink p-6 rounded-3xl border border-gray-200 flex flex-col items-center gap-3 shadow-sm hover:border-gray-300 transition-all active:scale-95 group"
              >
                <div className="bg-gray-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Search size={32} />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">Catálogo</span>
              </button>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                  <FileText size={14} /> Historial Reciente
                </h3>
                {logs.length > 0 && (
                  <button 
                    onClick={clearLogs}
                    className="text-[10px] font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
                  >
                    Borrar Todo
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                    <p className="text-sm text-gray-400 font-serif italic">No hay actividad reciente</p>
                  </div>
                ) : (
                  logs.slice(0, 5).map(log => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={log.id} 
                      className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {log.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold capitalize">
                            {log.accion} - <span className="font-mono opacity-60">{log.asin}</span>
                          </p>
                          {log.bookTitle && <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">{log.bookTitle}</p>}
                          {log.status === 'error' && <p className="text-[10px] text-red-400 mt-0.5">{log.errorMessage}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono opacity-40">{log.timestamp}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'search' && <CatalogSearch onBack={() => setView('dashboard')} />}

        {view === 'scan' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Home size={24} />
              </button>
              <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
                <button 
                  onClick={() => setSelectedAction('prestamo')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedAction === 'prestamo' ? 'bg-ink text-bg shadow-md' : 'text-gray-400'}`}
                >
                  Préstamo
                </button>
                <button 
                  onClick={() => setSelectedAction('devolucion')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedAction === 'devolucion' ? 'bg-ink text-bg shadow-md' : 'text-gray-400'}`}
                >
                  Devolución
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[2rem] border border-gray-200 shadow-xl overflow-hidden relative">
              <Scanner 
                onResult={handleScanSuccess} 
                active={view === 'scan'} 
              />
              
              <AnimatePresence>
                {(apiResponse || apiError) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`absolute bottom-6 left-6 right-6 p-4 rounded-2xl shadow-2xl border flex items-start gap-3 z-10 ${
                      apiError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    {apiError ? <XCircle className="shrink-0" /> : <CheckCircle className="shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-bold">{apiError ? 'Error' : 'Éxito'}</p>
                      <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{apiError || apiResponse?.message}</p>
                      <button 
                        onClick={() => { setApiError(null); setApiResponse(null); }}
                        className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                      >
                        Entendido
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-60">Entrada Manual</h4>
                <div className="flex items-center gap-1 text-[10px] font-mono opacity-40">
                  <ArrowRightLeft size={10} /> {selectedAction}
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={selectedAction === 'prestamo' && !prestamoMemberId ? "ID de Socia..." : "Código del Libro..."}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
                <button 
                  onClick={() => handleScanSuccess(manualCode)}
                  disabled={syncing || !manualCode}
                  className="bg-ink text-bg px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-black active:scale-95"
                >
                  {syncing ? <Loader2 className="animate-spin" size={18} /> : 'Enviar'}
                </button>
              </div>
              {selectedAction === 'prestamo' && prestamoMemberId && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-xs font-medium text-amber-800 flex items-center gap-2">
                    <User size={14} /> Socia: <strong>{prestamoMemberId}</strong>
                  </span>
                  <button onClick={() => setPrestamoMemberId('')} className="text-[10px] font-bold text-amber-900/40 hover:text-amber-900 uppercase">Cambiar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Home size={24} />
              </button>
              <h2 className="text-xl font-serif italic font-bold">Ajustes</h2>
              <div className="w-10" />
            </div>

            {/* ── Banner instalar PWA en Ajustes ── */}
            {!isInstalled && isInstallable && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#141414] text-white rounded-3xl p-5 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="bg-amber-400 text-black p-3 rounded-2xl shrink-0">
                    <Smartphone size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Instalar como app</p>
                    <p className="text-xs text-white/60 mt-0.5 leading-tight">Acceso directo desde tu pantalla de inicio, sin navegador</p>
                  </div>
                  <button
                    id="settings-install-btn"
                    onClick={handleInstallClick}
                    className="shrink-0 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Download size={13} /> Instalar
                  </button>
                </div>
              </motion.div>
            )}
            {isInstalled && (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-4 flex items-center gap-3">
                <div className="bg-green-100 text-green-600 p-2 rounded-xl">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">App instalada</p>
                  <p className="text-xs text-green-600">Barrioteca ya está en tu pantalla de inicio</p>
                </div>
              </div>
            )}

            <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm mb-6">
              <button 
                onClick={() => setSettingsSubView('socia')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${settingsSubView === 'socia' ? 'bg-ink text-bg shadow-md' : 'text-gray-400'}`}
              >
                <Users size={14} /> Gestión Socias
              </button>
              <button 
                onClick={() => setSettingsSubView('help')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${settingsSubView === 'help' ? 'bg-ink text-bg shadow-md' : 'text-gray-400'}`}
              >
                <HelpCircle size={14} /> Ayuda
              </button>
            </div>

            {settingsSubView === 'socia' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Socias Guardadas</h3>
                  <p className="text-[10px] opacity-40">Local Storage</p>
                </div>
                
                <div className="grid gap-3">
                  {users.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-serif italic ${activeUserId === user.id ? 'bg-amber-500 text-black' : 'bg-gray-100 text-gray-400'}`}>
                          {user.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{user.nombre}</p>
                          <p className="text-[10px] font-mono opacity-50">{user.barcode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setActiveUserId(user.id); setPrestamoMemberId(user.barcode); }}
                          className={`p-2 rounded-xl transition-colors ${activeUserId === user.id ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsSubView === 'help' && (
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold flex items-center gap-2 text-amber-700"><Info size={18} /> Sobre la App</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Esta PWA ha sido diseñada para la <strong>Barrioteca Acalencá</strong>. Permite gestionar préstamos y devoluciones de forma rápida desde cualquier dispositivo móvil.
                  </p>
                </div>
                
                <div className="space-y-4 border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Cómo usar</h4>
                  <ul className="space-y-3">
                    {[
                      { icon: <UserPlus size={14} />, text: "Identifícate con tu ID de socia en la pantalla principal." },
                      { icon: <Scan size={14} />, text: "Pulsa 'Escanear' y elige 'Préstamo' o 'Devolución'." },
                      { icon: <ArrowRightLeft size={14} />, text: "Escanea el código de barras del libro (ISBN o ASIN)." },
                      { icon: <Smartphone size={14} />, text: "Instala la app en tu móvil para usarla sin conexión a internet." }
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <div className="mt-0.5 text-amber-600">{item.icon}</div>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#F5F5F0]/80 backdrop-blur-xl border-t border-gray-200 px-8 py-4 flex items-center justify-between z-50">
        {[
          { id: 'dashboard', icon: <Home size={24} />, label: 'Inicio' },
          { id: 'search', icon: <Search size={24} />, label: 'Buscar' },
          { id: 'scan', icon: <Scan size={24} />, label: 'Escanear' },
          { id: 'settings', icon: <SettingsIcon size={24} />, label: 'Ajustes' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex flex-col items-center gap-1 transition-all ${view === item.id ? 'text-amber-700 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            {view === item.id && (
              <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-amber-700 rounded-full mt-1" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
