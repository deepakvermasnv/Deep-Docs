'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  FileText, 
  Star, 
  Share2, 
  MessageSquare, 
  Video, 
  Lock, 
  Moon, 
  Sun, 
  LogOut, 
  User as UserIcon,
  Download,
  Printer,
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import { User } from 'firebase/auth';

interface NavbarProps {
  title: string;
  isStarred: boolean;
  onTitleChange: (title: string) => void;
  onToggleStar: () => void;
  onShare: () => void;
  onNewDoc: () => void;
  onDownload: () => void;
  saveStatus: 'Saving...' | 'Saved';
  editor: Editor | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: User;
  onLogout: () => void;
}

const Navbar = ({ 
  title, 
  isStarred, 
  onTitleChange, 
  onToggleStar, 
  onShare, 
  onNewDoc, 
  onDownload, 
  saveStatus, 
  editor, 
  darkMode, 
  onToggleDarkMode,
  user,
  onLogout
}: NavbarProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'New', icon: <FileText size={16} />, onClick: onNewDoc },
        { label: 'Download as HTML', icon: <Download size={16} />, onClick: onDownload },
        { label: 'Download as PDF', icon: <Download size={16} />, onClick: () => window.dispatchEvent(new CustomEvent('download-pdf')) },
        { label: 'Print', icon: <Printer size={16} />, onClick: () => window.print() },
        { label: 'Trash', icon: <Trash2 size={16} />, onClick: () => {} },
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', icon: <Undo2 size={16} />, onClick: () => editor?.chain().focus().undo().run() },
        { label: 'Redo', icon: <Redo2 size={16} />, onClick: () => editor?.chain().focus().redo().run() },
      ]
    },
    {
      label: 'View',
      items: [
        { label: darkMode ? 'Light Mode' : 'Dark Mode', icon: darkMode ? <Sun size={16} /> : <Moon size={16} />, onClick: onToggleDarkMode },
      ]
    }
  ];

  return (
    <nav className="flex flex-col bg-white dark:bg-[#1A1C1E] border-b border-gray-200 dark:border-gray-800 px-4 py-1.5 transition-colors sticky top-0 z-30">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="p-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" onClick={onNewDoc}>
            <FileText size={36} className="text-blue-600" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-lg font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent px-2 py-0.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-transparent min-w-[100px] max-w-[400px]"
                placeholder="Untitled document"
              />
              <button 
                onClick={onToggleStar}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Star 
                  size={16} 
                  className={`transition-all ${isStarred ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400'}`} 
                />
              </button>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 ml-1">
                <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'Saving...' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{saveStatus}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 -ml-1">
              {menus.map((menu) => (
                <div 
                  key={menu.label} 
                  className="relative"
                >
                  <button 
                    onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                    className={`px-2.5 py-1 rounded-md transition-colors text-sm font-medium ${activeMenu === menu.label ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    {menu.label}
                  </button>
                  {activeMenu === menu.label && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                      <div 
                        className="absolute top-full left-0 mt-0.5 w-56 bg-white dark:bg-[#2D2F31] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {menu.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => {
                              item.onClick();
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                          >
                            <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 mr-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400" title="Comments">
              <MessageSquare size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400" title="Join call">
              <Video size={20} />
            </button>
          </div>

          <button 
            onClick={onShare}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
          
          <div className="relative group ml-1">
            <button className="flex items-center gap-2 p-0.5 rounded-full hover:ring-4 hover:ring-gray-100 dark:hover:ring-gray-800 transition-all">
              {user.photoURL ? (
                <Image 
                  src={user.photoURL} 
                  alt={user.displayName || ''} 
                  width={36} 
                  height={36} 
                  className="rounded-full border border-gray-200 dark:border-gray-700 object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-inner">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </button>
            
            <div className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-[#2D2F31] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 py-5 hidden group-hover:block animate-in fade-in slide-in-from-top-3 duration-200 origin-top-right">
              <div className="px-6 pb-5 border-b border-gray-100 dark:border-gray-800 text-center">
                {user.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt={user.displayName || ''} 
                    width={80} 
                    height={80} 
                    className="rounded-full mx-auto mb-3 border-4 border-blue-50 dark:border-blue-900/30 object-cover shadow-sm" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-lg">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-tight">{user.displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
              </div>
              <div className="px-2 pt-3">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <LogOut size={18} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
