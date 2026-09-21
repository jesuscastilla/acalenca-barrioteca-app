import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Search, X } from 'lucide-react';
import type { CatalogBook } from '../types';

interface Props {
  endpoint: string;
  isLoggedIn: boolean;
  onBorrow: (code: string) => Promise<void>;
}

export function CatalogList({ endpoint, isLoggedIn, onBorrow }: Props) {
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogBook | null>(null);
  const [detail, setDetail] = useState<{ notes?: string; image?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${endpoint}?action=catalog-list`);
        if (active) setBooks(r.data || []);
      } catch (e) {
        console.error('Error al cargar el catálogo:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [endpoint]);

  useEffect(() => {
    setVisibleCount(50);
  }, [query]);

  const filtered = query.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.author.toLowerCase().includes(query.toLowerCase()) ||
          (b.isbn || '').includes(query.trim()) ||
          (b.item_code || '').includes(query.trim()),
      )
    : books;

  const shown = filtered.slice(0, visibleCount);

  const doBorrow = async () => {
    if (!selected) return;
    const code = selected.item_code || selected.isbn;
    if (!code) return;
    setBorrowing(true);
    await onBorrow(code);
    setBorrowing(false);
    setSelected(null);
  };

  const openDetail = async (book: CatalogBook) => {
    setSelected(book);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await axios.get(
        `${endpoint}?action=book-detail&id=${encodeURIComponent(book.id)}`,
      );
      setDetail(r.data?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl italic font-bold">Catálogo de la Biblioteca</h2>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por título, autora o ISBN"
          className="w-full pl-10 pr-4 py-3 text-base bg-surface border border-outline rounded-md outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-on-surface-variant">
        {filtered.length} de {books.length}
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-on-surface-variant">El catálogo está vacío.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((book) => (
            <button
              key={book.id || `${book.title}-${book.item_code}`}
              onClick={() => openDetail(book)}
              className="w-full bg-surface rounded-lg p-3 flex gap-3 text-left"
            >
              {book.image && (
                <img
                  src={book.image}
                  alt={book.title}
                  loading="lazy"
                  decoding="async"
                  width={56}
                  height={80}
                  className="w-14 h-20 shrink-0 object-cover rounded-sm bg-surface-variant"
                />
              )}
              <div className="flex-1">
                <p className="text-base font-bold leading-tight">{book.title}</p>
                <p className="text-sm text-on-surface-variant">{book.author}</p>
                <p
                  className={`text-xs font-bold mt-1 ${
                    book.status === 'disponible' ? 'text-success' : 'text-error'
                  }`}
                >
                  {book.status === 'disponible' ? 'Disponible' : 'Prestada'}
                </p>
              </div>
            </button>
          ))}
          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((v) => v + 100)}
              className="w-full py-3 text-sm font-semibold text-primary hover:bg-primary-container/40 rounded-md"
            >
              Cargar más ({filtered.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-surface rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <p
                className={`text-sm font-bold ${
                  selected.status === 'disponible' ? 'text-success' : 'text-error'
                }`}
              >
                {selected.status === 'disponible' ? 'Disponible' : 'Prestada'}
              </p>
              <button
                onClick={() => setSelected(null)}
                className="p-1 hover:bg-surface-variant rounded-sm"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {(detail?.image || selected.image) && (
              <img
                src={detail?.image || selected.image}
                alt={selected.title}
                loading="lazy"
                decoding="async"
                width={96}
                height={128}
                className="mt-3 w-24 h-32 object-cover rounded-sm bg-surface-variant"
              />
            )}

            <h3 className="mt-3 text-xl font-bold">{selected.title}</h3>
            <p className="text-sm text-on-surface-variant">{selected.author}</p>

            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              {detailLoading
                ? 'Cargando sinopsis…'
                : detail?.notes?.trim() ||
                  selected.notes?.trim() ||
                  'Sinopsis no disponible para este libro.'}
            </p>

            {selected.status === 'disponible' &&
              isLoggedIn &&
              (selected.item_code || selected.isbn) && (
                <button
                  onClick={doBorrow}
                  disabled={borrowing}
                  className="mt-4 w-full bg-primary text-on-primary py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {borrowing ? <Loader2 className="animate-spin" size={18} /> : 'Pedir este libro'}
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
