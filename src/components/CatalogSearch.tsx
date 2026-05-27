import React, { useState, useEffect } from 'react';
import { Search, Book, User, Hash, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
}

export const CatalogSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchCatalog();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchCatalog = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/catalog-proxy?q=${query}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error searching catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif italic mb-6 border-b border-gray-200 pb-2">Catálogo de la Biblioteca</h2>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, autor o ISBN..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-ink/5 focus:border-ink/20 focus:outline-none transition-all shadow-sm"
          id="catalog-search-input"
        />
      </div>

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
              transition={{ delay: index * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden"
              id={`catalog-book-${book.id}`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg leading-tight">{book.title}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                  book.status === 'Disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {book.status}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>{book.author}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Hash size={12} />
                  <span>{book.isbn}</span>
                </div>
              </div>

              {/* Decorative side bar based on status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                book.status === 'Disponible' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-10 opacity-40">
            <AlertCircle size={48} className="mx-auto mb-3" />
            <p className="font-serif italic">No se encontraron resultados para "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
