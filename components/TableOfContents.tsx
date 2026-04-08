'use client';

import React from 'react';
import { List, X, ChevronRight } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

interface TableOfContentsProps {
  items: TOCItem[];
  onItemClick: (pos: number) => void;
  onClose: () => void;
}

const TableOfContents = ({ items, onItemClick, onClose }: TableOfContentsProps) => {
  return (
    <div className="w-64 bg-white dark:bg-[#1A1C1E] border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-300 shadow-xl z-30 h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm uppercase tracking-wider">
          <List size={18} className="text-blue-600" />
          Outline
        </h3>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
        {items.length === 0 ? (
          <div className="text-center py-12 px-4">
            <List size={32} className="mx-auto text-gray-200 dark:text-gray-800 mb-3" />
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No headings found. Add H1, H2, or H3 to see them here.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onItemClick(item.pos)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 group flex items-start gap-2 ${
                item.level === 1 ? 'ml-0 font-bold text-gray-900 dark:text-gray-100' : 
                item.level === 2 ? 'ml-3 text-gray-700 dark:text-gray-300 font-semibold' : 
                'ml-6 text-gray-600 dark:text-gray-400 text-sm'
              }`}
            >
              <ChevronRight 
                size={14} 
                className={`mt-1 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors flex-shrink-0 ${item.level > 1 ? 'hidden' : ''}`} 
              />
              <span className="truncate">{item.text}</span>
            </button>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold text-center">
          {items.length} sections found
        </p>
      </div>
    </div>
  );
};

export default TableOfContents;
