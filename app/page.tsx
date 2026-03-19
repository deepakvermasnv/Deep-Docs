'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
      if (!currentDocId && docs.length > 0) {
        setCurrentDocId(docs[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/docs`);
    });

    return () => unsubscribe();
  }, [user, currentDocId]);

  const currentDoc = documents.find((doc) => doc.id === currentDocId) || (documents.length > 0 ? documents[0] : null);

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
      setView('recent');
    } catch (error) {
      console.error("Error creating new document", error);
    }
  }, [user]);

  const handleDocSelect = (id: string) => {
    setCurrentDocId(id);
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
        {user && currentDocId && (
          <AutoSave
            userId={user.uid}
            docId={currentDocId}
            content={currentDoc?.content || ''}
            title={currentDoc?.title || ''}
            onStatusChange={setSaveStatus}
          />
        )}
        {currentDoc ? (
          <Editor
            content={currentDoc.content}
            onChange={handleContentChange}
            onEditorReady={setEditor}
            darkMode={darkMode}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F8F9FA] dark:bg-[#0E1113] text-gray-500">
            <Plus size={48} className="mb-4 opacity-20" />
            <p>Select a document or create a new one</p>
            <button 
              onClick={handleNewDoc}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors"
            >
              New Document
            </button>
          </div>
        )}
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D2F31] rounded-3xl p-8 w-[500px] shadow-2xl transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-normal text-gray-800 dark:text-gray-100">Share &quot;{currentDoc?.title}&quot;</h2>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Plus size={24} className="rotate-45 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName} (you)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Owner</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add people and groups</label>
                <input 
                  type="text" 
                  placeholder="Add emails..."
                  className="w-full p-3 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                >
                  Copy link
                </button>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#2D2F31] rounded-2xl p-6 w-[400px] shadow-2xl transition-colors">
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">{confirmModal.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
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
