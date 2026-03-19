'use client';

import React from 'react';
import { Plus, FileText, Search, Clock, Star, Trash2, Settings, RotateCcw, X } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  lastOpened: string;
  isStarred: boolean;
  isTrashed: boolean;
}

interface SidebarProps {
  documents: Document[];
  currentDocId: string;
  currentView: 'recent' | 'starred' | 'trash';
  onDocSelect: (id: string) => void;
  onDocDelete: (id: string) => void;
  onDocRestore: (id: string) => void;
  onDocPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onNewDoc: () => void;
  onViewChange: (view: 'recent' | 'starred' | 'trash') => void;
}

const Sidebar = ({ 
  documents, 
  currentDocId, 
  currentView,
  onDocSelect, 
  onDocDelete, 
  onDocRestore,
  onDocPermanentDelete,
  onEmptyTrash,
  onNewDoc,
  onViewChange
}: SidebarProps) => {
  return (
    <aside className="w-72 bg-[#F8F9FA] dark:bg-[#1A1C1E] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-colors">
      <div className="p-4">
        <button
          onClick={onNewDoc}
          className="flex items-center gap-3 bg-white dark:bg-[#2D2F31] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm px-5 py-3.5 rounded-2xl w-fit transition-all hover:shadow-md text-gray-700 dark:text-gray-200"
        >
          <Plus size={24} className="text-blue-600" />
          <span className="font-medium">New</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-4">
          <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span>{currentView === 'recent' ? 'Recent' : currentView === 'starred' ? 'Starred' : 'Trash'}</span>
            {currentView === 'trash' && documents.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEmptyTrash();
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 normal-case font-medium hover:underline"
              >
                Empty Trash
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {documents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                No documents found
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group flex items-center justify-between w-full px-4 py-2.5 rounded-r-full text-sm transition-colors cursor-pointer ${
                    currentDocId === doc.id
                      ? 'bg-[#E3E3E3] dark:bg-[#3C4043] text-[#1F1F1F] dark:text-[#E8EAED]'
                      : 'text-[#444746] dark:text-[#9AA0A6] hover:bg-[#EAEAEA] dark:hover:bg-[#2D2F31]'
                  }`}
                  onClick={() => onDocSelect(doc.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={18} className="text-blue-600 flex-shrink-0" />
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="truncate w-full text-left font-medium">{doc.title || 'Untitled document'}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{doc.lastOpened}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentView === 'trash' ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocRestore(doc.id);
                          }}
                          className="p-1.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Restore"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocPermanentDelete(doc.id);
                          }}
                          className="p-1.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete permanently"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDocDelete(doc.id);
                        }}
                        className="p-1.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Move to trash"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
          <button 
            onClick={() => onViewChange('recent')}
            className={`flex items-center gap-3 w-full px-4 py-2 text-sm rounded-lg transition-colors ${
              currentView === 'recent' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Clock size={18} />
            <span>Recent</span>
          </button>
          <button 
            onClick={() => onViewChange('starred')}
            className={`flex items-center gap-3 w-full px-4 py-2 text-sm rounded-lg transition-colors ${
              currentView === 'starred' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Star size={18} className={currentView === 'starred' ? 'fill-blue-700 dark:fill-blue-400' : ''} />
            <span>Starred</span>
          </button>
          <button 
            onClick={() => onViewChange('trash')}
            className={`flex items-center gap-3 w-full px-4 py-2 text-sm rounded-lg transition-colors ${
              currentView === 'trash' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Trash2 size={18} />
            <span>Trash</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
