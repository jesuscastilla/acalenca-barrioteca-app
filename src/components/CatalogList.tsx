import React, { useState, useEffect } from 'react';
import { Book, User, Hash, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  image?: string;
}

interface CatalogListProps {
  onBack: () => void;
  endpoint: string;
}

export const CatalogList: React.FC<CatalogListProps> = ({ onBack, endpoint }) => {
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);

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