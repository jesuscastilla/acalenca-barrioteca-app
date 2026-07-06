import React, { useState, useEffect } from 'react';
import { Book, User, Hash, Loader2, ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  image?: string;
  notes?: string;
  item_code?: string;
}

interface CatalogListProps {
  onBack: () => void;
  endpoint: string;
  isLoggedIn: boolean;
  onBorrow: (isbn: string) => void;
}

export const CatalogList: React.FC<CatalogListProps> = ({ onBack, endpoint, isLoggedIn, onBorrow }) => {
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<CatalogBook | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${endpoint}?action=catalog-list`);
      setResults(response.data || []);
    } catch (error) {
      console.error("Error al cargar el catalogo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif italic mb-6 border-b border-gray-200 pb-2">Catalogo de la Biblioteca</h2>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : results.length > 0 ? (
          results.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedBook(book)}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              {book.image && (
                <div className="w-20 h-28 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-base leading-tight">{book.title}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${
                    book.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {book.status === 'disponible' ? 'Disponible' : 'Prestada'}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span>{book.author}</span>
                  </div>
                  {book.isbn ? (
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <Hash size={10} />
                      <span>ISBN: {book.isbn}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-[10px] opacity-60">
                      <Hash size={10} />
                      <span>Ejemplar: {book.item_code || book.id}</span>
                    </div>
                  )}
                </div>

                {book.notes && (
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-1 line-clamp-2 italic">
                    {book.notes.substring(0, 120)}{book.notes.length > 120 ? '...' : ''}
                  </p>
                )}
              </div>

              {book.status === 'disponible' && isLoggedIn && (book.item_code || book.isbn) && (
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); onBorrow(book.item_code || book.isbn); }}
                    className="flex items-center gap-1.5 bg-ink text-bg text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl hover:bg-black transition-all active:scale-95"
                  >
                    <ShoppingCart size={12} />
                    Pedir
                  </button>
                </div>
              )}

              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                book.status === 'disponible' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-10 opacity-30">
            <Book size={48} className="mx-auto mb-3" />
            <p className="font-serif italic text-sm">El catalogo esta vacio.</p>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBook(null)}
          >
            <motion.div
              className="relative bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors z-10"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>

              {selectedBook.image && (
                <div className="w-full h-56 bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-3xl">
                  <img src={selectedBook.image} alt={selectedBook.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                    selectedBook.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {selectedBook.status === 'disponible' ? 'Disponible' : 'Prestada'}
                  </span>
                </div>

                <h2 className="text-xl font-bold leading-tight">{selectedBook.title}</h2>

                <div className="flex flex-col gap-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User size={14} />
                    <span>{selectedBook.author}</span>
                  </div>
                  {selectedBook.isbn ? (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Hash size={12} />
                      <span>ISBN: {selectedBook.isbn}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] opacity-60">
                      <Hash size={12} />
                      <span>Ejemplar: {selectedBook.item_code || selectedBook.id}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Sinopsis</h3>
                  {selectedBook.notes ? (
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedBook.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sinopsis no disponible para este libro.</p>
                  )}
                </div>

                {selectedBook.status === 'disponible' && isLoggedIn && (selectedBook.item_code || selectedBook.isbn) && (
                  <button
                    onClick={() => { onBorrow(selectedBook.item_code || selectedBook.isbn); setSelectedBook(null); }}
                    className="w-full flex items-center justify-center gap-2 bg-ink text-bg text-sm font-bold uppercase tracking-widest py-3 rounded-xl hover:bg-black transition-all active:scale-95"
                  >
                    <ShoppingCart size={16} />
                    Pedir este libro
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};