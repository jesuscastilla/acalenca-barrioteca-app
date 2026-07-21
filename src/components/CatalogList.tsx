import React, { useState, useEffect } from 'react';
import { Book, User, Hash, Loader2, ShoppingCart, X, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredResults = searchQuery.trim()
    ? results.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.isbn || '').includes(searchQuery.trim()) ||
        (b.item_code || '').includes(searchQuery.trim())
      )
    : results;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-serif italic mb-4 sm:mb-6 border-b border-gray-200 pb-2">Catalogo de la Biblioteca</h2>

      {/* Busqueda */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca por titulo, autora o ISBN..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-300 outline-none transition-all"
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {filteredResults.length} de {results.length}
          </span>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : filteredResults.length > 0 ? (
          filteredResults.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => setSelectedBook(book)}
              className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-3 sm:gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              {book.image && (
                <div className="w-16 h-22 sm:w-20 sm:h-28 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 flex flex-col gap-1 sm:gap-2 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm sm:text-base leading-tight">{book.title}</h3>
                  <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg shrink-0 ${
                    book.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {book.status === 'disponible' ? 'Disp.' : 'Prest.'}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 text-[10px] sm:text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="sm:w-3 sm:h-3" />
                    <span className="truncate">{book.author}</span>
                  </div>
                  {book.isbn ? (
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] opacity-70">
                      <Hash size={9} className="sm:w-2.5 sm:h-2.5" />
                      <span className="truncate">ISBN: {book.isbn}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] opacity-50">
                      <Hash size={9} />
                      <span className="truncate">Ej: {book.item_code || book.id}</span>
                    </div>
                  )}
                </div>

                {book.notes && (
                  <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed mt-0.5 sm:mt-1 line-clamp-2 italic hidden sm:block">
                    {book.notes.substring(0, 100)}{book.notes.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>

              {book.status === 'disponible' && isLoggedIn && (book.item_code || book.isbn) && (
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); onBorrow(book.item_code || book.isbn); }}
                    className="flex items-center gap-1 bg-ink text-bg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-black transition-all active:scale-95"
                  >
                    <ShoppingCart size={11} />
                    Pedir
                  </button>
                </div>
              )}

              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                book.status === 'disponible' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </motion.div>
          ))
        ) : searchQuery ? (
          <div className="text-center py-10 opacity-40">
            <Search size={40} className="mx-auto mb-3" />
            <p className="text-sm font-serif italic">Sin resultados para "{searchQuery}"</p>
          </div>
        ) : (
          <div className="text-center py-10 opacity-30">
            <Book size={40} className="mx-auto mb-3" />
            <p className="text-sm font-serif italic">El catalogo esta vacio.</p>
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
              className="relative bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl mx-2"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-3 right-3 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors z-10"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                    selectedBook.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {selectedBook.status === 'disponible' ? 'Disponible' : 'Prestada'}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold leading-tight">{selectedBook.title}</h2>

                <div className="flex flex-col gap-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User size={13} />
                    <span>{selectedBook.author}</span>
                  </div>
                  {selectedBook.isbn ? (
                    <div className="text-[11px] opacity-70">ISBN: {selectedBook.isbn}</div>
                  ) : (
                    <div className="text-[11px] opacity-50">Ejemplar: {selectedBook.item_code || selectedBook.id}</div>
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