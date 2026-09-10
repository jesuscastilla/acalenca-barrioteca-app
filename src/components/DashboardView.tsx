import { Loader2 } from 'lucide-react';
import type { LibraryUser, Loan } from '../types';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

interface Props {
  user: LibraryUser;
  loans: Loan[];
  loansLoading: boolean;
}

export function DashboardView({ user, loans, loansLoading }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl italic font-bold">Bienvenida</h2>

      <div className="bg-surface rounded-lg p-4">
        <p className="text-base font-bold">Hola, {user.nombre}</p>
        {user.expireDate && (
          <p className="mt-1 text-sm text-on-surface-variant">
            Carné de socia caduca el {formatDate(user.expireDate)}
          </p>
        )}
        {user.isExpired && (
          <p className="mt-1 text-sm text-error">
            Tu carné ha caducado. Pásate por la biblioteca para renovarlo.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold">Libros en préstamo</h3>
        <div className="mt-2 space-y-2">
          {loansLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : loans.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No tienes libros prestados actualmente.
            </p>
          ) : (
            loans.map((loan) => (
              <div key={loan.loan_id} className="bg-surface rounded-lg p-4">
                <p className="text-base font-bold">{loan.title}</p>
                <p className="mt-2 text-sm text-primary">Vence: {formatDate(loan.due_date)}</p>
                {loan.item_code && (
                  <p className="text-xs text-on-surface-variant">Ejemplar: {loan.item_code}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
