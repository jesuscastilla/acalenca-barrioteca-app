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
  const endpoint = '/api';
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

  const [newUserName, setNewUserName] = useState('');
  const [newUserBarcode, setNewUserBarcode] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  // Simplified login states
  const [loginInput, setLoginInput] = useState('');
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

  const handleLogin = async (term: string) => {
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

    let bookTitle: string | undefined = undefined;
    let bookAuthor: string | undefined = undefined;
    try {
      const cleanCode = codeValue.replace(/[-\s]/g, '').trim();
      if (cleanCode.length >= 8) {
        const bookResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`, { timeout: 4000 });
        if (bookResponse.data && bookResponse.data.items && bookResponse.data.items.length > 0) {
          const info = bookResponse.data.items[0].volumeInfo;
          bookTitle = info.title;
          bookAuthor = info.authors ? info.authors.join(', ') : 'Autor Desconocido';
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
        <div className="flex items-center gap-2">
          <div className="bg-ink p-2 rounded-xl text-bg shadow-lg">
            <Library size={24} />
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

      <main className="container mx-auto max-w-2xl px-6 py-6 pb-32">
        <AnimatePresence>
          {isInstallable && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-amber-500 text-black p-4 rounded-3xl shadow-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Smartphone size={24} />
                <div>
                  <h4 className="font-bold text-sm">Instalar Barrioteca</h4>
                  <p className="text-xs opacity-80">Añade la app a tu pantalla de inicio</p>
                </div>
              </div>
              <button 
                onClick={handleInstallClick}
                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase"
              >
                Instalar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="Código de socia..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button 
                      onClick={() => handleLogin(loginInput)}
                      disabled={isLoggingIn}
                      className="bg-ink text-bg px-6 py-3 rounded-xl text-sm font-bold uppercase disabled:opacity-50"
                    >
                      {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
                    </button>
                  </div>
                  {loginError && <p className="text-xs text-red-500 font-bold">{loginError}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Sesión activa como:</p>
                    <p className="text-lg font-bold">{activeUser.nombre}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveUserId('');
                      sessionStorage.removeItem('id_socia');
                    }}
                    className="text-xs text-red-500 font-bold uppercase"
                  >
                    Salir
                  </button>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setView('scan')}
                className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center gap-3 hover:border-amber-500 transition-all"
              >
                <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                  <Scan size={32} />
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Escanear</span>
              </button>
              <button 
                onClick={() => setView('search')}
                className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center gap-3 hover:border-amber-500 transition-all"
              >
                <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
                  <Search size={32} />
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Catálogo</span>
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Actividad Reciente</h3>
              {logs.length === 0 ? (
                <div className="bg-white/40 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-400 text-xs italic">
                  No hay operaciones recientes.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-xs font-bold">{log.bookTitle || log.asin}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{log.accion} • {log.timestamp}</p>
                      </div>
                      <div className={log.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {log.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'search' && <CatalogSearch />}

        {view === 'scan' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif italic text-lg font-bold">Escáner</h3>
                <button onClick={() => setView('dashboard')} className="text-xs font-bold uppercase text-gray-400">Cerrar</button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-4">
                <button 
                  onClick={() => setSelectedAction('prestamo')}
                  className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedAction === 'prestamo' ? 'bg-ink text-bg shadow-sm' : 'text-gray-500'
                  }`}
                >
                  📥 Préstamo
                </button>
                <button 
                  onClick={() => setSelectedAction('devolucion')}
                  className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedAction === 'devolucion' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  📤 Devolución
                </button>
              </div>

              {selectedAction === 'prestamo' && (
                <div className={`p-4 rounded-2xl border text-sm ${prestamoMemberId ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-[10px] font-bold uppercase opacity-60">Socia para préstamo</p>
                  {prestamoMemberId ? (
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-bold">{prestamoMemberId}</span>
                      <button onClick={() => setPrestamoMemberId('')} className="text-[10px] font-bold uppercase text-amber-700">Cambiar</button>
                    </div>
                  ) : (
                    <p className="text-xs italic mt-1 text-amber-900">Escanea la tarjeta de socia o introduce su código.</p>
                  )}
                </div>
              )}
            </div>

            <Scanner onScanSuccess={handleScanSuccess} />
            
            {apiResponse && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-900 text-xs">
                <p className="font-bold">¡Éxito!</p>
                <p>{apiResponse.message}</p>
              </div>
            )}
            {apiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs">
                <p className="font-bold">Error</p>
                <p>{apiError}</p>
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-serif italic font-bold">Ajustes</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-sm font-bold">Historial Local</p>
                  <p className="text-xs text-gray-500">{logs.length} operaciones guardadas</p>
                </div>
                <button onClick={clearLogs} className="text-red-500 text-xs font-bold uppercase">Borrar todo</button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Versión de la App</p>
                  <p className="text-xs text-gray-500">1.2.0-produccion</p>
                </div>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full font-mono">STABLE</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#F5F5F0]/90 backdrop-blur-lg border-t border-gray-200 px-6 py-4 z-50">
        <div className="container mx-auto max-w-2xl flex justify-around items-center">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-amber-600' : 'text-gray-400'}`}>
            <Home size={24} />
            <span className="text-[10px] font-bold uppercase">Inicio</span>
          </button>
          <button onClick={() => setView('scan')} className={`flex flex-col items-center gap-1 ${view === 'scan' ? 'text-amber-600' : 'text-gray-400'}`}>
            <Scan size={24} />
            <span className="text-[10px] font-bold uppercase">Escanear</span>
          </button>
          <button onClick={() => setView('search')} className={`flex flex-col items-center gap-1 ${view === 'search' ? 'text-amber-600' : 'text-gray-400'}`}>
            <Search size={24} />
            <span className="text-[10px] font-bold uppercase">Catálogo</span>
          </button>
          <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 ${view === 'settings' ? 'text-amber-600' : 'text-gray-400'}`}>
            <SettingsIcon size={24} />
            <span className="text-[10px] font-bold uppercase">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
