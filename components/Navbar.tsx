'use client';

import React, { useState } from 'react';
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
    <nav className="flex flex-col bg-white dark:bg-[#202124] border-b border-gray-200 dark:border-gray-700 px-4 py-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1">
            <FileText size={32} className="text-blue-600" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-lg font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border border-transparent px-1 rounded focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                placeholder="Untitled document"
              />
              <button onClick={onToggleStar}>
                <Star 
                  size={16} 
                  className={`transition-colors ${isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400'}`} 
                />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{saveStatus}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {menus.map((menu) => (
                <div key={menu.label} className="relative group">
                  <button 
                    onMouseEnter={() => setActiveMenu(menu.label)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-0.5 rounded transition-colors"
                  >
                    {menu.label}
                  </button>
                  {activeMenu === menu.label && (
                    <div 
                      onMouseLeave={() => setActiveMenu(null)}
                      className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#2D2F31] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      {menu.items.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            item.onClick();
                            setActiveMenu(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-full cursor-pointer transition-colors">
            <MessageSquare size={18} className="text-blue-700 dark:text-blue-400" />
          </div>
          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-full cursor-pointer transition-colors">
            <Video size={18} className="text-blue-700 dark:text-blue-400" />
          </div>
          <button 
            onClick={onShare}
            className="flex items-center gap-2 bg-[#C2E7FF] dark:bg-[#004A77] hover:bg-[#B3D7EF] dark:hover:bg-[#005A8F] text-[#001D35] dark:text-[#C2E7FF] px-6 py-2 rounded-full font-medium text-sm transition-colors"
          >
            <Lock size={16} />
            Share
          </button>
          
          <div className="relative group">
            <button className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </button>
            
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#2D2F31] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 py-4 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 pb-4 border-b border-gray-100 dark:border-gray-800 text-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-blue-100 dark:border-blue-900" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <p className="font-medium text-gray-900 dark:text-gray-100">{user.displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
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
