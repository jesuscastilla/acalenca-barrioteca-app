import React from 'react';
import { BookOpen, Calendar, User, Hash } from 'lucide-react';
import { motion } from 'motion/react';

interface Book {
  id: string;
  title: string;
  author: string;
  dueDate: string;
  isbn: string;
}

interface BorrowedBooksProps {
  books: Book[];
}

export const BorrowedBooks: React.FC<BorrowedBooksProps> = ({ books }) => {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <BookOpen size={64} className="opacity-10 mb-4" />
        <p className="text-gray-400 font-serif italic">No tienes libros prestados actualmente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif italic mb-6 border-b border-gray-200 pb-2">Libros en préstamo</h2>
      <div className="grid gap-4">
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-[#FDFDFB] border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
            id={`book-${book.id}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg leading-tight group-hover:text-amber-900 transition-colors">{book.title}</h3>
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                <Calendar size={12} />
                <span>Expira: {book.dueDate}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1.5 font-medium">
                <User size={14} />
                <span>{book.author}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] opacity-70">
                <Hash size={12} />
                <span>{book.isbn}</span>
              </div>
            </div>

            {/* Aesthetic detail: vertical line */}
            <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-amber-200 rounded-r-full group-hover:bg-amber-400 transition-all"></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
