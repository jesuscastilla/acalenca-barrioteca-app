export type View = 'dashboard' | 'catalog' | 'scan' | 'settings';
export type ActionType = 'prestamo' | 'devolucion';

export interface LibraryUser {
  id: string;
  nombre: string;
  barcode: string;
  expireDate?: string | null;
  isExpired?: boolean;
}

export interface TransactionLog {
  id: string;
  timestamp: string;
  accion: ActionType;
  asin: string;
  status: 'success' | 'error';
  errorMessage?: string;
  usuario?: string;
  bookTitle?: string;
}

export interface Loan {
  loan_id: string;
  item_code: string;
  loan_date: string;
  due_date: string;
  title: string;
  isbn: string;
  image: string;
}

export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  image?: string;
  notes?: string;
  item_code?: string;
}

export interface Toast {
  kind: 'success' | 'error';
  text: string;
}
