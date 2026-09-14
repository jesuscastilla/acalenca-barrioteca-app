import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  CheckCircle,
  Home,
  Library,
  Scan,
  Settings as SettingsIcon,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CatalogList } from './components/CatalogList';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { ScanView } from './components/ScanView';
import { SettingsView } from './components/SettingsView';
import { IosInstallBanner } from './components/IosInstallBanner';
import { useVersionCheck } from './lib/useVersionCheck';
import type {
  ActionType,
  LibraryUser,
  Loan,
  Toast,
  TransactionLog,
  View,
} from './types';

function getEndpoint(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_API_ENDPOINT || './api-proxy.php';
}

export default function App() {
  useVersionCheck();
  const [view, setView] = useState<View>('dashboard');
  const [endpoint] = useState<string>(() => getEndpoint());

  const [selectedAction, setSelectedAction] = useState<ActionType>('prestamo');
  const [syncing, setSyncing] = useState(false);

  const [users, setUsers] = useState<LibraryUser[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('barrioteca_users') || '[]');
    } catch {
      return [];
    }
  });
  const [activeUserId, setActiveUserId] = useState<string>(
    () => localStorage.getItem('barrioteca_active_user_id') || '',
  );

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [logs, setLogs] = useState<TransactionLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('barrioteca_logs') || '[]');
    } catch {
      return [];
    }
  });

  const [memberLoans, setMemberLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const activeUser = users.find((u) => u.id === activeUserId) || null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('barrioteca_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem('barrioteca_active_user_id', activeUserId);
  }, [activeUserId]);
  useEffect(() => {
    localStorage.setItem('barrioteca_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (!activeUser) {
      setMemberLoans([]);
      return;
    }
    setLoansLoading(true);
    axios
      .get(
        `${endpoint}?action=member-loans&member_id=${encodeURIComponent(
          activeUser.barcode || activeUser.id,
        )}`,
      )
      .then((res) => setMemberLoans(res.data?.data || []))
      .catch(() => setMemberLoans([]))
      .finally(() => setLoansLoading(false));
  }, [activeUser?.id, endpoint, logs.length]);

  const showToast = (kind: 'success' | 'error', text: string) =>
    setToast({ kind, text });

  const handleLogin = async (term: string) => {
    const id = term.trim();
    if (!id) return;
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${endpoint}?action=verify-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ member_id: id }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.status === 'success' && data.data) {
        const nombre = data.data.member_name || `Socia ${id}`;
        const expireDate = data.data.expire_date ?? null;
        const isExpired = !!data.data.is_expired;
        setUsers((prev) => {
          const existing = prev.find((u) => u.id === id || u.barcode === id);
          if (existing) {
            return prev.map((u) =>
              u.id === existing.id ? { ...u, nombre, expireDate, isExpired } : u,
            );
          }
          return [...prev, { id, nombre, barcode: id, expireDate, isExpired }];
        });
        setActiveUserId(id);
        setView('dashboard');
      } else {
        setLoginError(data?.message || 'No se pudo verificar esta socia.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de conexión';
      setLoginError(`Fallo al verificar: ${msg}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setActiveUserId('');
    setMemberLoans([]);
    setView('dashboard');
  };

  const runAction = async (code: string, action: ActionType) => {
    const c = code.trim();
    if (!c || !activeUser) return;
    setSyncing(true);
    try {
      const payload: Record<string, string> = { accion: action, code: c };
      if (action === 'prestamo') {
        payload.member_id = activeUser.barcode || activeUser.id;
      }
      const res = await fetch(`${endpoint}?action=perform-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      const ok = !!(data && data.status === 'success');
      const bookTitle = data?.data?.item_title || undefined;
      const message =
        data?.message ||
        (ok
          ? action === 'prestamo'
            ? 'Préstamo realizado'
            : 'Devolución realizada'
          : 'Operación fallida');
      setLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          accion: action,
          asin: c,
          status: ok ? 'success' : 'error',
          errorMessage: ok ? undefined : message,
          usuario: activeUser.nombre,
          bookTitle,
        },
        ...prev,
      ]);
      showToast(ok ? 'success' : 'error', message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de red';
      showToast('error', `Fallo al conectar: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const clearLogs = () => setLogs([]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await axios.get(`${endpoint}?action=catalog-list`);
      if (activeUser) {
        const res = await axios.get(
          `${endpoint}?action=member-loans&member_id=${encodeURIComponent(
            activeUser.barcode || activeUser.id,
          )}`,
        );
        setMemberLoans(res.data?.data || []);
      }
      showToast('success', 'Sincronización completada');
    } catch {
      showToast('error', 'No se pudo sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-cream text-ink font-sans">
        <LoginView onLogin={handleLogin} loginError={loginError} isLoggingIn={isLoggingIn} />
        <IosInstallBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 pb-32">
        {view === 'dashboard' && (
          <DashboardView user={activeUser} loans={memberLoans} loansLoading={loansLoading} />
        )}
        {view === 'catalog' && (
          <CatalogList
            endpoint={endpoint}
            isLoggedIn={!!activeUser}
            onBorrow={(code) => runAction(code, 'prestamo')}
          />
        )}
        {view === 'scan' && (
          <ScanView
            action={selectedAction}
            onSelectAction={setSelectedAction}
            logs={logs}
            onClearLogs={clearLogs}
            onResult={(code) => runAction(code, selectedAction)}
            syncing={syncing}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            user={activeUser}
            onSync={syncNow}
            onLogout={handleLogout}
            syncing={syncing}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-cream/95 border-t border-outline/30 px-4 sm:px-8 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-between z-50">
        {[
          { id: 'dashboard', icon: <Home size={24} />, label: 'Inicio' },
          { id: 'catalog', icon: <Library size={24} />, label: 'Catálogo' },
          { id: 'scan', icon: <Scan size={24} />, label: 'Escanear' },
          { id: 'settings', icon: <SettingsIcon size={24} />, label: 'Ajustes' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex flex-col items-center gap-1 transition-all ${
              view === item.id ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span
              className={`p-1.5 rounded-full ${view === item.id ? 'bg-primary-container' : ''}`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-4 right-4 mx-auto max-w-md flex items-center gap-2 px-4 py-3 rounded-md shadow-lg border z-[60] ${
              toast.kind === 'success'
                ? 'bg-surface border-success/40 text-success'
                : 'bg-surface border-error/40 text-error'
            }`}
          >
            {toast.kind === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <IosInstallBanner />
    </div>
  );
}
