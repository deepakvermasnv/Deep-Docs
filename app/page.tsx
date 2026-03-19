'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Link as LinkIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import Login from '@/components/Login';
import AutoSave from '@/components/AutoSave';
import { Editor as TiptapEditor } from '@tiptap/react';
import { auth, db } from '@/lib/firebase';
import { fetchDocument } from '@/lib/docService';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc,
  addDoc
} from 'firebase/firestore';

interface Document {
  id: string;
  title: string;
  content: string;
  lastOpened: string;
  isStarred: boolean;
  isTrashed: boolean;
  updatedAt?: any;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [view, setView] = useState<'recent' | 'starred' | 'trash'>('recent');
  const [saveStatus, setSaveStatus] = useState<'Saving...' | 'Saved'>('Saved');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Check for docId and ownerId in URL
        const params = new URLSearchParams(window.location.search);
        const urlDocId = params.get('docId');
        const urlOwnerId = params.get('ownerId');
        
        if (urlDocId && urlOwnerId) {
          setCurrentDocId(urlDocId);
          setCurrentOwnerId(urlOwnerId);
        } else {
          setCurrentOwnerId(user.uid);
        }

        // Save user profile to Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error saving user profile", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    // throw new Error(JSON.stringify(errInfo)); // We'll just log it for now to avoid crashing the whole app UI
  };

  // Firestore listener for documents
  useEffect(() => {
    if (!user) {
      setDocuments([]);
      return;
    }

    // Listener for the user's own documents
    const q = query(
      collection(db, 'users', user.uid, 'docs'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastOpened: doc.data().updatedAt ? `Updated ${new Date(doc.data().updatedAt.seconds * 1000).toLocaleDateString()}` : 'Just now'
      })) as Document[];
      
      setDocuments(docs);
      
      // If no doc selected and we have docs, select the first one
      // Only do this if we're not loading a specific doc from URL
      const params = new URLSearchParams(window.location.search);
      if (!currentDocId && docs.length > 0 && !params.get('docId')) {
        setCurrentDocId(docs[0].id);
        setCurrentOwnerId(user.uid);
      }
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/docs`);
    });

    return () => unsubscribe();
  }, [user, currentDocId]);

  // Listener for the current document (especially if it's shared)
  useEffect(() => {
    if (!user || !currentDocId || !currentOwnerId) return;
    
    // If it's our own doc, the collection listener already handles it
    if (currentOwnerId === user.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', currentOwnerId, 'docs', currentDocId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const sharedDoc = {
          id: snapshot.id,
          ...data,
          lastOpened: data.updatedAt ? `Updated ${new Date(data.updatedAt.seconds * 1000).toLocaleDateString()}` : 'Just now'
        } as Document;
        
        // Add or update the shared doc in the documents list
        setDocuments(prev => {
          const exists = prev.find(d => d.id === sharedDoc.id);
          if (exists) {
            return prev.map(d => d.id === sharedDoc.id ? sharedDoc : d);
          }
          return [sharedDoc, ...prev];
        });
      }
    }, (error) => {
      handleFirestoreError(error, 'get', `users/${currentOwnerId}/docs/${currentDocId}`);
    });

    return () => unsubscribe();
  }, [user, currentDocId, currentOwnerId]);

  const currentDoc = documents.find((doc) => doc.id === currentDocId) || (documents.length > 0 && !currentDocId ? documents[0] : null);

  const filteredDocuments = documents.filter((doc) => {
    if (view === 'trash') return doc.isTrashed;
    if (doc.isTrashed) return false;
    if (view === 'starred') return doc.isStarred;
    return true;
  });

  const handleContentChange = useCallback((newContent: string) => {
    if (!currentDocId || !user) return;
    
    // Update local state for immediate feedback
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === currentDocId ? { ...doc, content: newContent } : doc
      )
    );
  }, [currentDocId, user]);

  const handleTitleChange = (newTitle: string) => {
    if (!currentDocId || !user) return;
    
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === currentDocId ? { ...doc, title: newTitle } : doc
      )
    );
  };

  const handleNewDoc = useCallback(async () => {
    if (!user) return;
    
    try {
      const newDocData = {
        title: 'Untitled document',
        content: '',
        isStarred: false,
        isTrashed: false,
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'docs'), newDocData);
      setCurrentDocId(docRef.id);
      setCurrentOwnerId(user.uid);
      setView('recent');
      
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('docId', docRef.id);
      url.searchParams.set('ownerId', user.uid);
      window.history.pushState({}, '', url);
    } catch (error) {
      console.error("Error creating new document", error);
    }
  }, [user]);

  const handleDocSelect = (id: string) => {
    setCurrentDocId(id);
    setCurrentOwnerId(user?.uid || null);
    // Update URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('docId', id);
    url.searchParams.set('ownerId', user?.uid || '');
    window.history.pushState({}, '', url);
  };

  const handleDocDelete = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'docs', id), {
        isTrashed: true,
        updatedAt: serverTimestamp()
      });

      if (id === currentDocId) {
        const remainingInView = filteredDocuments.filter(d => d.id !== id);
        if (remainingInView.length > 0) {
          setCurrentDocId(remainingInView[0].id);
        } else {
          setCurrentDocId(null);
        }
      }
    } catch (error) {
      console.error("Error trashing document", error);
    }
  };

  const handleDocRestore = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'docs', id), {
        isTrashed: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error restoring document", error);
    }
  };

  const handleDocPermanentDelete = (id: string) => {
    if (!user) return;
    const docToDelete = documents.find(d => d.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Delete permanently?',
      message: `"${docToDelete?.title || 'Untitled document'}" will be deleted forever. You can't undo this action.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'docs', id));
          if (id === currentDocId) {
            const newDocs = documents.filter((doc) => doc.id !== id);
            if (newDocs.length > 0) {
              setCurrentDocId(newDocs[0].id);
            } else {
              setCurrentDocId(null);
            }
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Error deleting document", error);
        }
      }
    });
  };

  const handleEmptyTrash = () => {
    if (!user) return;
    const trashedDocs = documents.filter(d => d.isTrashed);
    if (trashedDocs.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Empty trash?',
      message: `All ${trashedDocs.length} items in the trash will be permanently deleted. You can't undo this action.`,
      onConfirm: async () => {
        try {
          const deletePromises = trashedDocs.map(d => deleteDoc(doc(db, 'users', user.uid, 'docs', d.id)));
          await Promise.all(deletePromises);
          
          if (currentDoc?.isTrashed) {
            const newDocs = documents.filter((doc) => !doc.isTrashed);
            if (newDocs.length > 0) {
              setCurrentDocId(newDocs[0].id);
            } else {
              setCurrentDocId(null);
            }
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Error emptying trash", error);
        }
      }
    });
  };

  const handleToggleStar = async (id: string) => {
    if (!user) return;
    const docToStar = documents.find(d => d.id === id);
    if (!docToStar) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid, 'docs', id), {
        isStarred: !docToStar.isStarred,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error toggling star", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleDownload = () => {
    if (!currentDoc) return;
    const blob = new Blob([currentDoc.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveStatus('Saved');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewDoc();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setDarkMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewDoc]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleDownloadPdf = async () => {
      if (!currentDoc) return;
      
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        
        const element = document.querySelector('.ProseMirror');
        if (element) {
          const opt = {
            margin: 0.5,
            filename: `${currentDoc.title || 'document'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
              scale: 2,
              useCORS: true,
              logging: false
            },
            jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
          };
          
          const clone = element.cloneNode(true) as HTMLElement;
          clone.style.padding = '40px';
          clone.style.background = 'white';
          clone.style.width = '816px';
          clone.style.minHeight = '1056px';
          
          document.body.appendChild(clone);
          clone.style.position = 'absolute';
          clone.style.left = '-9999px';
          clone.style.top = '-9999px';
          
          await html2pdf().set(opt).from(clone).save();
          
          document.body.removeChild(clone);
        }
      } catch (error) {
        console.error('PDF generation failed:', error);
      }
    };

    window.addEventListener('download-pdf', handleDownloadPdf);
    return () => window.removeEventListener('download-pdf', handleDownloadPdf);
  }, [currentDoc]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0E1113]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        documents={filteredDocuments}
        currentDocId={currentDocId || ''}
        currentView={view}
        onDocSelect={handleDocSelect}
        onDocDelete={handleDocDelete}
        onDocRestore={handleDocRestore}
        onDocPermanentDelete={handleDocPermanentDelete}
        onEmptyTrash={handleEmptyTrash}
        onNewDoc={handleNewDoc}
        onViewChange={setView}
      />
      <div className={`flex flex-col flex-1 min-w-0 ${darkMode ? 'dark' : ''}`}>
        <Navbar
          title={currentDoc?.title || 'Untitled document'}
          isStarred={currentDoc?.isStarred || false}
          onTitleChange={handleTitleChange}
          onToggleStar={() => currentDoc && handleToggleStar(currentDoc.id)}
          onShare={() => setIsShareModalOpen(true)}
          onNewDoc={handleNewDoc}
          onDownload={handleDownload}
          saveStatus={saveStatus}
          editor={editor}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          user={user}
          onLogout={handleLogout}
        />
        {user && currentDocId && currentOwnerId && (
          <AutoSave
            userId={currentOwnerId}
            docId={currentDocId}
            content={currentDoc?.content || ''}
            title={currentDoc?.title || ''}
            onStatusChange={setSaveStatus}
          />
        )}
        {currentDoc && currentOwnerId && currentDocId ? (
          <Editor
            ownerId={currentOwnerId}
            docId={currentDocId}
            content={currentDoc.content}
            onChange={handleContentChange}
            onEditorReady={setEditor}
            darkMode={darkMode}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0F1012] text-gray-500 p-8 transition-colors">
            <div className="w-24 h-24 bg-white dark:bg-[#1A1C1E] rounded-3xl shadow-sm flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-800">
              <Plus size={40} className="text-blue-600 opacity-40" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No document selected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-xs">Select a document from the sidebar or create a new one to start writing.</p>
            <button 
              onClick={handleNewDoc}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              New Document
            </button>
          </div>
        )}
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1A1C1E] rounded-[32px] p-8 w-full max-w-[540px] shadow-2xl transition-all border border-gray-200 dark:border-gray-800 scale-in-center">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Share document</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[400px]">{currentDoc?.title}</p>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Plus size={24} className="rotate-45 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="relative">
                  {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName || ''} width={48} height={48} className="rounded-full ring-2 ring-white dark:ring-gray-800" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold ring-2 ring-white dark:ring-gray-800">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.displayName} (you)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full">Owner</span>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add people and groups</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Enter email address..."
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button 
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?docId=${currentDocId}&ownerId=${currentOwnerId}`;
                    navigator.clipboard.writeText(shareUrl);
                    setIsShareModalOpen(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all active:scale-95"
                >
                  <LinkIcon size={18} />
                  <span>Copy link</span>
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsShareModalOpen(false)}
                    className="px-8 py-2.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1A1C1E] rounded-[32px] p-8 w-full max-w-[420px] shadow-2xl transition-all border border-gray-200 dark:border-gray-800 scale-in-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{confirmModal.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-6 py-3 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
