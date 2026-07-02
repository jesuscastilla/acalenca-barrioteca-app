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
  image?: string;
}

interface CatalogSearchProps {
  onBack: () => void;
  endpoint: string;
}

export const CatalogSearch: React.FC<CatalogSearchProps> = ({ onBack, endpoint }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Implementar un pequeño retraso (debounce) para no saturar el servidor en cada pulsación
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        searchCatalog();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchCatalog = async () => {
    setLoading(true);
    try {
      // Usar el endpoint configurado (api-proxy.php en NAS/Nginx, /api en dev Node.js)
      const response = await axios.get(`${endpoint}?action=catalog-proxy&q=${encodeURIComponent(query)}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error al buscar en el catálogo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif italic mb-6 border-b border-gray-200 pb-2">Catálogo de la Biblioteca</h2>
      
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por título, autora o ISBN..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-ink/5 focus:border-ink/20 focus:outline-none transition-all shadow-sm"
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
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4 relative overflow-hidden"
            >
              {book.image && (
                <div className="w-16 h-24 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-base leading-tight">{book.title}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${
                    book.status === 'disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {book.status === 'disponible' ? 'Disponible' : 'Prestada'}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-gray-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span>{book.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Hash size={10} />
                    <span>{book.isbn}</span>
                  </div>
                </div>
              </div>

              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                book.status === 'disponible' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </motion.div>
          ))
        ) : query.trim() && !loading ? (
          <div className="text-center py-10 opacity-40">
            <AlertCircle size={48} className="mx-auto mb-3" />
            <p className="font-serif italic">No se encontraron resultados para "{query}"</p>
          </div>
        ) : (
          <div className="text-center py-10 opacity-30">
            <Book size={48} className="mx-auto mb-3" />
            <p className="font-serif italic text-sm">Escribe algo para buscar en la barrioteca.</p>
          </div>
        )}
      </div>
    </div>
  );
};
