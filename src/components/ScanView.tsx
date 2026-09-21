import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, Scan } from 'lucide-react';
import type { ActionType, TransactionLog } from '../types';
const Scanner = lazy(() => import('./Scanner'));

interface Props {
  action: ActionType;
  onSelectAction: (a: ActionType) => void;
  logs: TransactionLog[];
  onClearLogs: () => void;
  onResult: (code: string) => void;
  syncing: boolean;
}

export function ScanView({ action, onSelectAction, logs, onClearLogs, onResult, syncing }: Props) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');

  if (scanning) {
    return (
      <div className="flex flex-col">
        <div className="p-3">
          <button
            onClick={() => setScanning(false)}
            className="p-2 hover:bg-surface-variant rounded-md"
            aria-label="Volver"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <Suspense fallback={<div className="p-6 text-center text-on-surface-variant">Cargando escáner…</div>}>
          <Scanner
            onResult={(code) => {
              setScanning(false);
              onResult(code);
            }}
          />
        </Suspense>
      </div>
    );
  }

  const applyManual = () => {
    const c = manualCode.trim();
    if (c) {
      onResult(c);
      setManualCode('');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl italic font-bold">Préstamo / Devolución</h2>

      <div className="flex gap-2">
        <ActionToggle
          label="Préstamo"
          active={action === 'prestamo'}
          onClick={() => onSelectAction('prestamo')}
        />
        <ActionToggle
          label="Devolución"
          active={action === 'devolucion'}
          onClick={() => onSelectAction('devolucion')}
        />
      </div>

      <button
        onClick={() => setScanning(true)}
        disabled={syncing}
        className="w-full bg-primary text-on-primary py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Scan size={18} />
        Escanear libro
      </button>

      <input
        type="text"
        value={manualCode}
        onChange={(e) => setManualCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && applyManual()}
        placeholder="Código de barras / ISBN"
        className="w-full bg-surface border border-outline rounded-md px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
      />

      <button
        onClick={applyManual}
        disabled={syncing || !manualCode.trim()}
        className="w-full bg-primary text-on-primary py-3 rounded-md font-semibold disabled:opacity-50"
      >
        Aplicar código
      </button>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Historial</h3>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-xs border border-outline text-on-surface-variant px-3 py-1 rounded-sm font-semibold"
            >
              Borrar
            </button>
          )}
        </div>

        <div className="mt-2 space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sin operaciones todavía.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-1">
                <p className="text-sm font-bold">
                  {log.timestamp} · {log.accion === 'prestamo' ? 'Préstamo' : 'Devolución'}
                </p>
                <p
                  className={`text-sm ${
                    log.status === 'error' ? 'text-error' : 'text-on-surface-variant'
                  }`}
                >
                  {log.asin}
                  {log.bookTitle ? ` · ${log.bookTitle}` : ''}
                  {log.status === 'error' && log.errorMessage ? ` · ${log.errorMessage}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ActionToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-md font-semibold ${
        active ? 'bg-primary text-on-primary' : 'border border-outline text-primary'
      }`}
    >
      {label}
    </button>
  );
}
