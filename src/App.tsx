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
  HelpCircle
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

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [settingsSubView, setSettingsSubView] = useState<'socia' | 'help'>('socia');
  const [copiedType, setCopiedType] = useState<'retrofit' | 'okhttp' | null>(null);
  const endpoint = 'https://pelotxo.synology.me/slims/api.php';
  const [selectedAction, setSelectedAction] = useState<ActionType>('prestamo');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Users state with default testing options
  const [users, setUsers] = useState<LibraryUser[]>(() => {
    const saved = localStorage.getItem('barrioteca_users');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', nombre: 'Carmen Maura (Socia Pruebas)', barcode: 'SOCIA-001' },
      { id: '2', nombre: 'Penélope Cruz (Socia Pruebas)', barcode: 'SOCIA-002' },
      { id: '3', nombre: 'Antonio Banderas (Socia Pruebas)', barcode: 'SOCIA-003' }
    ];
  });
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem('barrioteca_active_user_id') || '';
  });

  const [prestamoMemberId, setPrestamoMemberId] = useState<string>(() => {
    return localStorage.getItem('barrioteca_prestamo_member_id') || '';
  });
  const [isScanningMemberId, setIsScanningMemberId] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserBarcode, setNewUserBarcode] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [userSyncing, setUserSyncing] = useState(false);
  const [userSyncMessage, setUserSyncMessage] = useState<string | null>(null);
  const [userSyncError, setUserSyncError] = useState<string | null>(null);

  // Simplified login states
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showQrLogin, setShowQrLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [logs, setLogs] = useState<TransactionLog[]>(() => {
    const saved = localStorage.getItem('barrioteca_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [apiResponse, setApiResponse] = useState<{ status: string; message?: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };
  const activeUser = users.find(u => u.id === activeUserId);

  const handleLogin = async (term: string, password?: string, isQr: boolean = false) => {
    setLoginError(null);
    setLoginSuccess(null);
    if (!term) return;

    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/verify-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: term })
      });

      const serverData = await response.json();
      
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
        setLoginSuccess(`¡Bienvenido/a de nuevo, ${nombreDevuelto}!`);
        setLoginInput('');
        setLoginPassword('');
        setShowQrLogin(false);
        
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

  // Save users & logs to localStorage
  useEffect(() => {
    localStorage.setItem('barrioteca_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('barrioteca_active_user_id', activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem('barrioteca_prestamo_member_id', prestamoMemberId);
  }, [prestamoMemberId]);

  // Save logs to localStorage
  useEffect(() => {
    localStorage.setItem('barrioteca_logs', JSON.stringify(logs));
  }, [logs]);

  // Function to execute REST action to API (via safe Node server-side proxy)
  const executeRestAction = async (codeValue: string, actionType: ActionType) => {
    if (!codeValue.trim()) return;
    
    setSyncing(true);
    setApiError(null);
    setApiResponse(null);

    // Intentar obtener el título y el autor del libro con el ISBN
    let bookTitle: string | undefined = undefined;
    let bookAuthor: string | undefined = undefined;
    try {
      const cleanCode = codeValue.replace(/[-\s]/g, '').trim();
      if (cleanCode.length >= 8) { // Solo consultar si parece un código ISBN/EAN
        const bookResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`, { timeout: 4000 });
        if (bookResponse.data && bookResponse.data.items && bookResponse.data.items.length > 0) {
          const info = bookResponse.data.items[0].volumeInfo;
          bookTitle = info.title;
          bookAuthor = info.authors ? info.authors.join(', ') : 'Autor Desconocido';
        } else {
          // Intentar fallback con Open Library API
          const olResponse = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&format=json&jscmd=data`, { timeout: 2500 });
          const key = `ISBN:${cleanCode}`;
          if (olResponse.data && olResponse.data[key]) {
            const info = olResponse.data[key];
            bookTitle = info.title;
            bookAuthor = info.authors ? info.authors.map((a: any) => a.name).join(', ') : 'Autor Desconocido';
          }
        }
      }
    } catch (bookErr) {
      console.warn("Fallo al consultar metadatos del libro por ISBN:", bookErr);
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const serverData = await response.json();
      
      // The user expects a JSON response containing {"status": "success"} or similar
      if (serverData && serverData.status === 'success') {
        setApiResponse({
          status: 'success',
          message: serverData.message || `Operación de ${actionType === 'prestamo' ? 'préstamo' : 'devolución'} completada para ${activeUser ? activeUser.nombre : 'socia'}.`
        });

        // Save to audit logs
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
        // Handle server mismatch / custom failure response e.g. status: "error"
        const failMessage = serverData?.error || serverData?.message || "Respuesta de servidor fallida (status !== success)";
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

      const newLog: TransactionLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        accion: actionType,
        asin: codeValue,
        status: 'error',
        errorMessage: detailError,
        usuario: activeUser ? activeUser.nombre : undefined,
        bookTitle,
        bookAuthor
      };
      setLogs(prev => [newLog, ...prev]);
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
      // It scanned the Member ID! Set it.
      setPrestamoMemberId(scannedCode);
      setApiResponse({
        status: 'success',
        message: `Tarjeta de socia identificada: "${scannedCode}". Ahora, escanea el código de barras (ISBN/EAN) del libro para registrar el préstamo.`
      });
    } else {
      // It scanned the Book ISBN! Perform action.
      executeRestAction(scannedCode, selectedAction);
    }
  };

  const clearLogs = () => {
    if (window.confirm("¿Seguro que deseas borrar el historial de operaciones?")) {
      setLogs([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F5F5F0]/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-ink p-2 rounded-xl text-bg shadow-lg">
            <Library size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif italic font-bold tracking-tight">Barrioteca Acalencá</h1>
            <p className="text-[10px] font-mono tracking-wider opacity-60">SLIMS REST Link (por Pelotxo)</p>
          </div>
        </div>
        
        {syncing ? (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 animate-pulse">
            <Loader2 className="animate-spin" size={14} />
            REST Calling...
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-80 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-900">
            <Globe size={11} />
            <span>pelotxo.synology.me</span>
          </div>
        )}
      </header>

      {/* Main Content Areas */}
      <main className="container mx-auto max-w-2xl px-6 py-6 pb-32">
        {/* App Install Banner */}
        <AnimatePresence>
          {isInstallable && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="mb-6 bg-gradient-to-r from-amber-500 to-amber-600 text-black p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-black/10 p-2.5 rounded-xl shrink-0">
                  <Smartphone size={24} className="text-amber-950" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-amber-950 truncate">Instalar Barrioteca</h4>
                  <p className="text-[11px] text-amber-900/80 font-medium leading-tight mt-0.5">
                    Instala esta app en tu pantalla de inicio del móvil para acceso rápido y experiencia nativa.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end w-full sm:w-auto gap-2 shrink-0 border-t border-amber-400/30 sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                <button 
                  onClick={() => setIsInstallable(false)}
                  className="p-2 text-amber-900/60 hover:bg-black/10 rounded-full transition-colors flex items-center justify-center"
                >
                  <XCircle size={20} />
                </button>
                <button 
                  onClick={handleInstallClick}
                  className="bg-black text-amber-500 hover:bg-gray-900 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex-1 sm:flex-none text-center"
                >
                  Instalar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Dashboard View */}
            {view === 'dashboard' && (
              <div className="space-y-6">
                {activeUser ? (
                  <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 p-1.5 rounded-lg text-amber-900">
                        <User size={14} />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-amber-950">Socia activa: </span>
                        <span className="font-serif italic font-semibold text-gray-900">{activeUser.nombre}</span>
                        <span className="font-mono ml-2 opacity-60">({activeUser.barcode})</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setView('settings')}
                      className="text-[10px] uppercase font-bold tracking-wider text-amber-900 hover:underline shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : null}

                {!activeUser ? (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200/60 flex flex-col items-center text-center space-y-4">
                    <div className="bg-amber-100/50 p-4 rounded-full text-amber-800 ring-8 ring-amber-50">
                      <Users size={32} />
                    </div>
                    <div>
                      <h3 className="font-serif italic text-lg font-bold">Identificación Requerida</h3>
                      <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
                        Para poder gestionar préstamos y devoluciones con el servidor de la Barrioteca, es obligatorio identificarte con tu nombre de socia o número de lectora primero.
                      </p>
                    </div>
                    <button
                      onClick={() => setView('settings')}
                      className="w-full max-w-xs py-3.5 bg-[#141414] text-[#F5F5F0] rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all"
                    >
                      <User size={14} />
                      <span>Iniciar Sesión de Socia</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200/60 flex flex-col items-center text-center">
                    <div className="bg-amber-100/50 p-4 rounded-full text-amber-800 mb-4 ring-8 ring-amber-50">
                      <Scan size={32} />
                    </div>
                    <h3 className="font-serif italic text-lg font-bold">Escáner de Códigos Barrioteca</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">
                      Abre la cámara para escanear el ISBN del libro y sincronizarlo instantáneamente con tu servidor SLIMS de Pelotxo.
                    </p>
                    
                    {/* Big Button Hub */}
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => { setSelectedAction('prestamo'); setView('scan'); }}
                        className="flex-1 py-4 bg-[#141414] text-[#F5F5F0] rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-90"
                      >
                        <span>📥 Solicitar Préstamo</span>
                      </button>
                      <button
                        onClick={() => { setSelectedAction('devolucion'); setView('scan'); }}
                        className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-amber-700"
                      >
                        <span>📤 Devolver Libro</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Immediate Response Alert */}
                {(apiResponse || apiError) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    {apiResponse && (
                      <div className="p-4 bg-green-50 border border-green-300 rounded-2xl flex items-start gap-2.5 text-green-900 text-xs shadow-sm">
                        <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={16} />
                        <div>
                          <span className="font-bold block">Conexión Exitosa con api.php</span>
                          <span className="opacity-80 font-mono">Status: success</span>
                          <span className="block mt-1">{apiResponse.message}</span>
                        </div>
                      </div>
                    )}
                    {apiError && (
                      <div className="p-4 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-2.5 text-red-900 text-xs shadow-sm">
                        <XCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                        <div>
                          <span className="font-bold block">Fallo en la Sincronización</span>
                          <span className="block">{apiError}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Activity Logs (Audit Trail) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#141414]/50">Historial de Operaciones locales</h3>
                    {logs.length > 0 && (
                      <button 
                        onClick={clearLogs}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs"
                      >
                        <Trash2 size={13} />
                        <span>Borrar</span>
                      </button>
                    )}
                  </div>

                  {logs.length === 0 ? (
                    <div className="bg-white/40 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-400 text-xs">
                      <FileText className="mx-auto mb-2 opacity-30" size={32} />
                      <p className="font-serif italic">No has realizado ninguna transacción todavía en esta sesión.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div 
                          key={log.id} 
                          className="bg-white px-5 py-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`p-2 rounded-xl text-xs font-bold leading-none ${
                              log.accion === 'prestamo' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {log.accion === 'prestamo' ? 'PRÉSTAMO' : 'DEVOLUCIÓN'}
                            </span>
                             <div>
                              {log.bookTitle ? (
                                <p className="text-xs font-bold text-gray-900 leading-snug">{log.bookTitle}</p>
                              ) : (
                                <p className="text-xs font-mono font-bold text-gray-700">{log.asin}</p>
                              )}
                              {log.bookAuthor && (
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">por {log.bookAuthor}</p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                                {log.bookTitle && (
                                  <span className="text-[9px] font-mono bg-gray-50 text-gray-400 px-1.5 py-0.2 rounded border border-gray-100">
                                    ISBN: {log.asin}
                                  </span>
                                )}
                                {log.usuario && (
                                  <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                    👤 {log.usuario}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {log.status === 'success' ? (
                              <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase tracking-wider">
                                <CheckCircle size={14} />
                                <span>Success</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase tracking-wider" title={log.errorMessage}>
                                <XCircle size={14} />
                                <span>Fallo</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Catalog View */}
            {view === 'search' && <CatalogSearch />}

            {/* Scanner View */}
            {view === 'scan' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif italic text-lg font-bold">Escáner en Acción</h3>
                    <button 
                      onClick={() => setView('dashboard')}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full font-bold uppercase"
                    >
                      Volver
                    </button>
                  </div>

                  {/* Action Selector during scanning */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setSelectedAction('prestamo')}
                      className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        selectedAction === 'prestamo' ? 'bg-ink text-bg shadow-sm' : 'text-gray-500 hover:text-ink'
                      }`}
                    >
                      📥 Préstamo
                    </button>
                    <button 
                      onClick={() => setSelectedAction('devolucion')}
                      className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        selectedAction === 'devolucion' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
                      }`}
                    >
                      📤 Devolución
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    La acción seleccionada se enviará en campo <code className="font-mono bg-amber-50 px-1 py-0.5 rounded text-amber-800">"accion"</code> de su JSON.
                  </p>

                  {selectedAction === 'prestamo' && (
                    <div className={`p-4 rounded-2xl border text-left transition-all ${
                      prestamoMemberId 
                        ? 'bg-green-50/60 border-green-200 text-green-950'
                        : 'bg-amber-50 border-amber-200/80 text-amber-950'
                    }`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Socio Préstamo Activo</p>
                          {prestamoMemberId ? (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded border border-green-200">
                                {prestamoMemberId}
                              </span>
                              <span className="text-xs font-semibold">
                                {users.find(u => u.barcode === prestamoMemberId || u.id === prestamoMemberId)?.nombre || "Lectora Sincronizada (NAS)"}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-serif italic mt-0.5 font-bold text-amber-900">
                                ⚠️ Préstamo Bloqueado: Falta Identificar Socia
                              </p>
                              <p className="text-[11px] text-amber-850 opacity-90 leading-relaxed">
                                Escanea el código de barras de cualquier tarjeta de socia con la cámara de abajo, o introduce su código a mano:
                              </p>
                            </div>
                          )}
                        </div>
                        {prestamoMemberId && (
                          <button
                            onClick={() => setPrestamoMemberId('')}
                            className="text-[10px] bg-white border border-green-200 hover:bg-green-100 text-green-800 font-bold px-2 py-1 rounded-lg uppercase transition-all whitespace-nowrap shrink-0"
                          >
                            Cambiar
                          </button>
                        )}
                      </div>
                      
                      {!prestamoMemberId && (
                        <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Ej: JCL327"
                              id="prestamo-member-input-field"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                                  if (val) {
                                    setPrestamoMemberId(val);
                                    setApiResponse({
                                      status: 'success',
                                      message: `Socia identified: "${val}". Ahora escanea el código de barras del libro.`
                                    });
                                  }
                                }
                              }}
                              className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 font-mono uppercase"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById('prestamo-member-input-field') as HTMLInputElement;
                                const val = el?.value.trim();
                                if (val) {
                                  setPrestamoMemberId(val);
                                  setApiResponse({
                                    status: 'success',
                                    message: `Socia identificada: "${val}". Ahora escanea el código de barras del libro.`
                                  });
                                }
                              }}
                              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs uppercase px-4 rounded-xl transition-all"
                            >
                              Fijar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
                      selectedAction === 'prestamo' && !prestamoMemberId ? "bg-amber-500" : "bg-green-600"
                    }`}></span>
                    <span className="font-bold uppercase tracking-wider text-gray-500">
                      {selectedAction === 'prestamo' && !prestamoMemberId ? "Modo: Escanear Tarjeta de Socia" : "Modo: Escanear Código de Libro"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                    {selectedAction === 'prestamo' && !prestamoMemberId ? "ID Socia" : "ISBN / EAN"}
                  </span>
                </div>

                <Scanner onScanSuccess={handleScanSuccess} />
              </div>
            )}

            {view === 'settings' && (
              <div className="space-y-6 py-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-3 gap-3">
                  <div>
                    <h2 className="text-xl font-serif italic text-[#141414] font-bold">Ajustes e Integración</h2>
                    <p className="text-xs text-gray-500">
                      Gestiona tu sesión o consulta el código de integración de red para tu móvil Android.
                    </p>
                  </div>
                  
                  {/* Selector de subpestañas */}
                  <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setSettingsSubView('socia')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        settingsSubView === 'socia' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'
                      }`}
                    >
                      <User size={13} />
                      <span>Sesión / Socias</span>
                    </button>
                    <button
                      onClick={() => setSettingsSubView('help')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        settingsSubView === 'help' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'
                      }`}
                    >
                      <HelpCircle size={13} className="text-amber-700" />
                      <span>Ayuda</span>
                    </button>
                  </div>
                </div>

                {settingsSubView === 'socia' ? (
                  <div className="space-y-6">
                    {/* Current Active Session Status */}
                    {activeUser ? (
                      <div className="bg-green-50 border border-green-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2.5 rounded-2xl text-green-800">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block font-sans">Sesión Activa</span>
                            <h4 className="text-sm font-bold font-serif italic text-gray-900">{activeUser.nombre}</h4>
                            <p className="text-xs font-mono text-gray-500">Código de Tarjeta: {activeUser.barcode}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveUserId('');
                            setLoginSuccess(null);
                            setLoginError(null);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider shrink-0"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50/40 border border-dashed border-amber-200 rounded-3xl p-5 flex items-start gap-3">
                        <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed text-amber-900/80">
                          <p className="font-bold">No has iniciado sesión</p>
                          <p className="text-[11px] opacity-85">
                            El acceso anónimo está deshabilitado. Debes identificarte con una socia registrada o darte de alta abajo para operar el escáner.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Login Lookup Form */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                        <User size={14} className="text-amber-800" />
                        <span>Iniciar Sesión de Socia por Servidor</span>
                      </h3>
                      
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin(loginInput.trim(), loginPassword);
                      }} className="space-y-3">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Código de Socia (Member ID)</label>
                            <input 
                              type="text" 
                              placeholder="E.g. JCL327 o SOCIA-001" 
                              value={loginInput}
                              onChange={(e) => setLoginInput(e.target.value)}
                              disabled={isLoggingIn || showQrLogin}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-ink focus:outline-none focus:bg-white transition-colors disabled:opacity-50"
                              required={!showQrLogin}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                            <div className="flex gap-2">
                              <input 
                                type="password" 
                                placeholder="Tu contraseña" 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                disabled={isLoggingIn || showQrLogin}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-ink focus:outline-none focus:bg-white transition-colors disabled:opacity-50"
                                required={!showQrLogin}
                              />
                              <button
                                type="submit"
                                disabled={isLoggingIn || showQrLogin}
                                className="bg-[#141414] text-[#F5F5F0] hover:bg-opacity-90 disabled:opacity-40 px-5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center justify-center gap-1.5"
                              >
                                {isLoggingIn ? (
                                  <>
                                    <Loader2 className="animate-spin" size={13} />
                                    <span>Entrando...</span>
                                  </>
                                ) : (
                                  <span>Entrar</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">- O -</span>
                          <button
                            type="button"
                            onClick={() => setShowQrLogin(!showQrLogin)}
                            className="w-full py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors"
                          >
                            {showQrLogin ? 'Cerrar Escáner QR' : 'Escanear Código QR'}
                          </button>
                        </div>

                        {showQrLogin && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-2xl">
                            <Scanner onScanSuccess={(code) => handleLogin(code, undefined, true)} />
                          </div>
                        )}

                        {loginError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px] leading-relaxed">
                            {loginError}
                          </div>
                        )}

                        {loginSuccess && (
                          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-[11px]">
                            {loginSuccess}
                          </div>
                        )}
                      </form>
                    </div>



                    {/* Registered users list in this device */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-sm space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#141414]/50 flex items-center gap-1.5">
                        <Users size={14} className="text-amber-800" />
                        <span>Socias Registradas Locales</span>
                      </h3>
                      
                      {users.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {users.map((user) => {
                            const isActive = user.id === activeUserId;
                            return (
                              <div 
                                key={user.id}
                                className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-all ${
                                  isActive 
                                    ? 'bg-amber-50/50 border-amber-300 text-amber-900 font-medium' 
                                    : 'bg-transparent border-gray-100 hover:border-gray-200 text-gray-600'
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    setActiveUserId(user.id);
                                    setLoginSuccess(null);
                                    setLoginError(null);
                                  }}
                                  className="flex-1 flex items-center gap-3 text-left"
                                >
                                  <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'}`}>
                                    <User size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-left truncate">{user.nombre}</p>
                                    <p className="text-[10px] opacity-70 font-mono text-left">Código: {user.barcode}</p>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isActive && (
                                    <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider flex items-center gap-0.5 whitespace-nowrap">
                                      <Check size={9} /> Sesión Activa
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                                    title="Eliminar socia"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                          <p className="font-serif italic">No hay socias guardadas localmente.</p>
                          <p className="text-[11px] opacity-80 mt-1">
                            Utiliza el formulario de alta arriba para registrar tu primera socia.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl flex flex-col items-center text-center space-y-4">
                      <HelpCircle size={48} className="text-amber-800 opacity-80" />
                      <h4 className="font-serif italic text-xl font-bold text-amber-950">
                        Ayuda y Soporte
                      </h4>
                      <p className="text-sm text-amber-900 leading-relaxed max-w-sm">
                        Esta app ha sido creada por Pelotxo. Para cualquier duda, error o sugerencia, escríbeme al <b className="font-mono">687407347</b> o a <b className="font-mono">jesuscastillalacal@gmail.com</b>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md bg-ink/90 backdrop-blur-xl rounded-full p-1.5 flex items-center justify-between shadow-2xl border border-white/10 ring-4 ring-black/5 overflow-x-auto">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Home />} label="Inicio" />
        <NavButton active={view === 'search'} onClick={() => setView('search')} icon={<Search />} label="Catálogo" />
        <NavButton active={view === 'scan'} onClick={() => setView('scan')} icon={<Scan />} label="Escaneo" />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon />} label="Ajustes" />
      </nav>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${active ? 'bg-bg text-ink' : 'text-bg/60 hover:text-bg'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      {active && (
        <motion.span 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          className="text-xs font-bold uppercase tracking-wide overflow-hidden whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}
