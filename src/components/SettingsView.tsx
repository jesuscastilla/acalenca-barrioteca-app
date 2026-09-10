import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import type { LibraryUser } from '../types';

interface Props {
  user: LibraryUser;
  onSync: () => void;
  onLogout: () => void;
  syncing: boolean;
}

export function SettingsView({ user, onSync, onLogout, syncing }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl italic font-bold">Ajustes</h2>

      <div className="bg-surface rounded-lg p-4">
        <p className="text-xs text-on-surface-variant">Socia conectada</p>
        <p className="text-base font-bold">{user.nombre}</p>
        <p className="text-xs text-on-surface-variant">ID: {user.id}</p>
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        className="w-full bg-primary text-on-primary py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
        Sincronizar ahora
      </button>

      <button
        onClick={onLogout}
        className="w-full border border-primary text-primary py-3 rounded-md font-semibold flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>

      <div>
        <h3 className="text-xl font-bold">Sobre la app</h3>
        <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
          Versión de la Barrioteca Acalencá. Todos los datos se sincronizan{' '}
          <strong className="text-ink">cifrados</strong> en nuestro propio servidor
          autogestionado. Nada se sube a internet ni se comparte con terceros.
        </p>
      </div>
    </div>
  );
}
