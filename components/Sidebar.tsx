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
      <div className="p-5">
        <button
          onClick={onNewDoc}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 px-6 py-3.5 rounded-2xl w-full transition-all active:scale-95 group"
        >
          <div className="bg-white/20 p-1 rounded-lg group-hover:scale-110 transition-transform">
            <Plus size={20} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">New Document</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        <div>
          <div className="space-y-1">
            <button 
              onClick={() => onViewChange('recent')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                currentView === 'recent' ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Clock size={20} />
              <span>Recent</span>
            </button>
            <button 
              onClick={() => onViewChange('starred')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                currentView === 'starred' ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Star size={20} className={currentView === 'starred' ? 'fill-blue-700 dark:fill-blue-400' : ''} />
              <span>Starred</span>
            </button>
            <button 
              onClick={() => onViewChange('trash')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                currentView === 'trash' ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Trash2 size={20} />
              <span>Trash</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">
            <span>{currentView === 'recent' ? 'Recent Documents' : currentView === 'starred' ? 'Starred Documents' : 'Trash Items'}</span>
            {currentView === 'trash' && documents.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEmptyTrash();
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 normal-case font-semibold hover:underline"
              >
                Empty
              </button>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {documents.length === 0 ? (
              <div className="px-4 py-10 text-center flex flex-col items-center gap-2">
                <FileText size={32} className="text-gray-200 dark:text-gray-800" />
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No documents here</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer border border-transparent ${
                    currentDocId === doc.id
                      ? 'bg-white dark:bg-[#2D2F31] text-gray-900 dark:text-gray-100 shadow-sm border-gray-200 dark:border-gray-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/30'
                  }`}
                  onClick={() => onDocSelect(doc.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-1.5 rounded-lg ${currentDocId === doc.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <FileText size={16} className="text-blue-600 flex-shrink-0" />
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="truncate w-full text-left font-bold text-gray-800 dark:text-gray-200 leading-tight">{doc.title || 'Untitled document'}</span>
                      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{doc.lastOpened}</span>
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
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                          title="Restore"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDocPermanentDelete(doc.id);
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
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
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
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
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
        <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
