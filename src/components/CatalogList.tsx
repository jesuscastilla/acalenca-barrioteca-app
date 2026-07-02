import React, { useState, useEffect } from 'react';
import { Book, User, Hash, Loader2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${endpoint}?action=catalog-list`);
      setResults(response.data || []);
    } catch (error) {
      console.error("Error al cargar el catálogo:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif italic mb-6 border-b border-gray-200 pb-2">Catálogo de la Biblioteca</h2>

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
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4 relative overflow-hidden"
            >
              {/* Portada */}
              {book.image && (
                <div className="w-20 h-28 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {/* Título y estado */}
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-base leading-tight">{book.title}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${
                    book.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {book.status === 'disponible' ? 'Disponible' : 'Prestada'}
                  </span>
                </div>

                {/* Autora e ISBN / código de ejemplar */}
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

                {/* Sinopsis */}
                {book.notes && (
                  <div className="mt-1">
                    <button 
                      onClick={() => toggleNotes(book.id)}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      {expandedNotes[book.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Sinopsis
                    </button>
                    <AnimatePresence>
                      {expandedNotes[book.id] && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] text-gray-500 leading-relaxed mt-1.5 overflow-hidden"
                        >
                          {book.notes.length > 300 ? book.notes.substring(0, 300) + '...' : book.notes}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Botón de préstamo (usa item_code, que siempre existe) */}
              {book.status === 'disponible' && isLoggedIn && (book.item_code || book.isbn) && (
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={() => onBorrow(book.item_code || book.isbn)}
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
            <p className="font-serif italic text-sm">El catálogo está vacío.</p>
          </div>
        )}
      </div>
    </div>
  );
};