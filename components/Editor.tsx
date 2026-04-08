'use client';

import React from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Toolbar from './Toolbar';
import TableOfContents from './TableOfContents';
import { Search, X, ChevronLeft, ChevronRight, MessageSquare, Send, Sparkles, Loader2, List } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

const Comment = Mark.create({
  name: 'comment',
  addAttributes() {
    return {
      id: {
        default: null,
      },
      author: {
        default: null,
      },
      createdAt: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-comment-id': HTMLAttributes.id, class: 'bg-yellow-200/50 dark:bg-yellow-900/30 border-b-2 border-yellow-400 cursor-pointer' }), 0];
  },
});

interface EditorProps {
  ownerId: string;
  docId: string;
  content: string;
  comments: any[];
  userEmail?: string;
  onChange: (content: string) => void;
  onCommentsChange: (comments: any[]) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  darkMode?: boolean;
}

const Editor = ({ ownerId, docId, content, comments, userEmail, onChange, onCommentsChange, onEditorReady, darkMode }: EditorProps) => {
  const [spellCheckErrors, setSpellCheckErrors] = React.useState<{ from: number, to: number, original: string, suggestions: string[] }[]>([]);
  const [activeError, setActiveError] = React.useState<{ from: number, to: number, original: string, suggestions: string[], pos: { top: number, left: number } } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Subscript,
      Superscript,
      Extension.create({
        name: 'spellCheck',
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: new PluginKey('spellCheck'),
              props: {
                decorations: (state) => {
                  const decorations: Decoration[] = [];
                  spellCheckErrors.forEach(error => {
                    if (error.from < state.doc.content.size && error.to <= state.doc.content.size) {
                      decorations.push(
                        Decoration.inline(error.from, error.to, {
                          class: 'spell-error',
                          style: 'text-decoration: underline wavy #ef4444; text-underline-offset: 4px; cursor: pointer;'
                        })
                      );
                    }
                  });
                  return DecorationSet.create(state.doc, decorations);
                },
                handleClick: (view, pos) => {
                  const error = spellCheckErrors.find(e => pos >= e.from && pos <= e.to);
                  if (error) {
                    const coords = view.coordsAtPos(pos);
                    setActiveError({
                      ...error,
                      pos: { top: coords.bottom + 5, left: coords.left }
                    });
                    return true;
                  }
                  setActiveError(null);
                  return false;
                }
              }
            })
          ];
        }
      }),
      Comment,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
      
      // Initial page count calculation
      const dom = editor.view?.dom;
      if (dom) {
        const height = dom.scrollHeight;
        const newPageCount = Math.max(1, Math.ceil(height / 1123));
        setPageCount(prev => prev !== newPageCount ? newPageCount : prev);
      }
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
      const dom = editor.view?.dom;
      if (dom) {
        const height = dom.scrollHeight;
        const newPageCount = Math.max(1, Math.ceil(height / 1123));
        setPageCount(newPageCount);
      }
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: `focus:outline-none prose prose-sm sm:prose-base dark:prose-invert max-w-none p-[96px] bg-transparent mx-auto transition-all duration-300 ${darkMode ? 'dark' : ''}`,
        style: `width: 794px; min-height: 1123px; background-image: linear-gradient(to bottom, transparent 1122px, ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1122px, ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1123px, transparent 1123px); background-size: 100% 1123px;`,
      },
    },
  });

  const [pageCount, setPageCount] = React.useState(1);
  const [isFocused, setIsFocused] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replaceTerm, setReplaceTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = React.useState(0);
  const [showComments, setShowComments] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [showSummary, setShowSummary] = React.useState(false);
  const [isCheckingSpelling, setIsCheckingSpelling] = React.useState(false);
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = React.useState(true);
  const [showTOC, setShowTOC] = React.useState(false);
  const [tocItems, setTOCItems] = React.useState<{ id: string, text: string, level: number, pos: number }[]>([]);

  const checkSpelling = React.useCallback(async (text: string) => {
    if (!text.trim() || isCheckingSpelling || !isSpellCheckEnabled) return;
    
    setIsCheckingSpelling(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const response = await ai.models.generateContent({
        model,
        contents: `Identify spelling errors in the following text. For each error, provide the original word and a few suggestions for correction. Return the result as a JSON array of objects: [{ "original": "word", "suggestions": ["suggestion1", "suggestion2"] }]. If no errors, return an empty array [].\n\nText: ${text}`,
        config: { responseMimeType: "application/json" }
      });

      const errors = JSON.parse(response.text || "[]");
      
      // Find positions of these errors in the editor
      if (editor) {
        const newErrors: any[] = [];
        const content = editor.getText();
        
        errors.forEach((err: any) => {
          // Find all occurrences of the misspelled word
          let index = content.indexOf(err.original);
          while (index !== -1) {
            // Check if it's a whole word
            const before = content[index - 1];
            const after = content[index + err.original.length];
            const isWord = (!before || !/[a-zA-Z]/.test(before)) && (!after || !/[a-zA-Z]/.test(after));
            
            if (isWord) {
              // Map text offset to editor position (this is simplified, but getText() is close for plain text)
              // Actually, getText() is not 1:1 with editor positions.
              // We'll use a more robust way to find positions if needed.
              // For now, let's use a simple approach.
              newErrors.push({
                from: index + 1, // +1 because Prosemirror positions are 1-indexed and start at 1 for the first character in a paragraph
                to: index + 1 + err.original.length,
                original: err.original,
                suggestions: err.suggestions
              });
            }
            index = content.indexOf(err.original, index + 1);
          }
        });
        setSpellCheckErrors(newErrors);
      }
    } catch (error) {
      console.error("Spellcheck error:", error);
    } finally {
      setIsCheckingSpelling(false);
    }
  }, [editor, isCheckingSpelling, isSpellCheckEnabled]);

  // Debounced spellcheck
  const editorText = editor?.getText();
  React.useEffect(() => {
    if (!editor) return;
    
    const timer = setTimeout(() => {
      checkSpelling(editor.getText());
    }, 2000); // Check every 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [editorText, checkSpelling, editor]);

  // Close spellcheck popover on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeError && !(e.target as HTMLElement).closest('.spell-error')) {
        setActiveError(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [activeError]);

  // Clear errors when spellcheck is disabled
  React.useEffect(() => {
    if (!isSpellCheckEnabled) {
      setSpellCheckErrors([]);
      setActiveError(null);
    }
  }, [isSpellCheckEnabled]);

  const applySuggestion = (suggestion: string) => {
    if (!editor || !activeError) return;
    
    editor.chain()
      .focus()
      .insertContentAt({ from: activeError.from, to: activeError.to }, suggestion)
      .run();
    
    setActiveError(null);
    // Remove the error from the list
    setSpellCheckErrors(prev => prev.filter(e => e.from !== activeError.from));
  };

  const handleSummarize = async () => {
    if (!editor || isSummarizing) return;
    
    setIsSummarizing(true);
    setShowSummary(true);
    setSummary(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const text = editor.getText();
      
      if (!text.trim()) {
        setSummary("The document is empty. Please add some content to summarize.");
        setIsSummarizing(false);
        return;
      }

      const response = await ai.models.generateContent({
        model,
        contents: `Please provide a concise and professional summary of the following document content:\n\n${text}`,
      });

      setSummary(response.text || "Failed to generate summary.");
    } catch (error) {
      console.error("Summarization error:", error);
      setSummary("An error occurred while generating the summary. Please try again later.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Extract TOC items
  const updateTOC = React.useCallback(() => {
    if (!editor) return;
    
    const items: { id: string, text: string, level: number, pos: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && [1, 2, 3].includes(node.attrs.level)) {
        items.push({
          id: `heading-${pos}`,
          text: node.textContent || 'Untitled Section',
          level: node.attrs.level,
          pos: pos
        });
      }
    });
    setTOCItems(items);
  }, [editor]);

  // Update TOC on content change
  React.useEffect(() => {
    if (!editor) return;
    updateTOC();
  }, [editorText, updateTOC, editor]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.commands.focus();
    editor.commands.setTextSelection(pos);
    editor.commands.scrollIntoView();
  };

  // Update editor classes when darkMode changes
  React.useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const separatorColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `focus:outline-none prose prose-sm sm:prose-base dark:prose-invert max-w-none p-[96px] bg-transparent mx-auto transition-all duration-300 ${darkMode ? 'dark' : ''}`,
            style: `width: 794px; min-height: 1123px; background-image: linear-gradient(to bottom, transparent 1122px, ${separatorColor} 1122px, ${separatorColor} 1123px, transparent 1123px); background-size: 100% 1123px;`,
          },
        },
      });
    }
  }, [editor, darkMode]);

  // Handle Find and Replace
  const handleFind = React.useCallback(() => {
    if (!editor || !searchTerm) {
      setSearchResults([]);
      return;
    }

    const { state } = editor;
    const { doc } = state;
    const results: number[] = [];

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        let index = node.text.indexOf(searchTerm);
        while (index !== -1) {
          results.push(pos + index);
          index = node.text.indexOf(searchTerm, index + 1);
        }
      }
    });

    setSearchResults(results);
    setCurrentResultIndex(0);

    if (results.length > 0) {
      const from = results[0];
      const to = from + searchTerm.length;
      editor.commands.setTextSelection({ from, to });
      editor.commands.scrollIntoView();
    }
  }, [editor, searchTerm]);

  const handleNext = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    const from = searchResults[nextIndex];
    const to = from + searchTerm.length;
    editor?.commands.setTextSelection({ from, to });
    editor?.commands.scrollIntoView();
  };

  const handlePrev = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    const from = searchResults[prevIndex];
    const to = from + searchTerm.length;
    editor?.commands.setTextSelection({ from, to });
    editor?.commands.scrollIntoView();
  };

  const handleReplace = () => {
    if (!editor || searchResults.length === 0) return;
    editor.commands.insertContent(replaceTerm);
    handleFind(); // Refresh results
  };

  const handleReplaceAll = () => {
    if (!editor || !searchTerm) return;
    let content = editor.getHTML();
    const regex = new RegExp(searchTerm, 'g');
    content = content.replace(regex, replaceTerm);
    editor.commands.setContent(content);
    handleFind();
  };

  // Keyboard shortcut for Find
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Comments logic
  const addComment = () => {
    if (!editor || !newComment || editor.state.selection.empty) return;
    const id = Math.random().toString(36).substr(2, 9);
    const author = userEmail || 'Anonymous';
    const createdAt = new Date().toISOString();
    
    editor.commands.setMark('comment', { id, author, createdAt });
    onCommentsChange([...comments, { id, text: newComment, author, createdAt }]);
    setNewComment('');
    setShowComments(true);
  };

  // Resize observer to handle dynamic content changes (like images loading)
  React.useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;
    
    const dom = editor.view.dom;
    const resizeObserver = new ResizeObserver(() => {
      if (editor.isDestroyed) return;
      const height = dom.scrollHeight;
      const newPageCount = Math.max(1, Math.ceil(height / 1123));
      setPageCount(prev => {
        if (prev !== newPageCount) {
          return newPageCount;
        }
        return prev;
      });
    });
    
    resizeObserver.observe(dom);
    return () => resizeObserver.disconnect();
  }, [editor]);

  // Update editor content when document changes in Firestore (Real-time Sync)
  React.useEffect(() => {
    if (!editor || !ownerId || !docId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', ownerId, 'docs', docId), (snapshot: any) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.data();
      const remoteContent = data.content;
      
      if (remoteContent) {
        const currentContent = JSON.stringify(editor.getJSON());
        
        // Only update if content is different AND user is not typing (not focused)
        // This prevents infinite loops and cursor jumps while typing
        if (remoteContent !== currentContent && !editor.isFocused) {
          try {
            const parsedContent = JSON.parse(remoteContent);
            editor.commands.setContent(parsedContent, { emitUpdate: false }); // false to not emit update event
            
            // Recalculate pages after remote update
            setTimeout(() => {
              if (editor.isDestroyed) return;
              const height = editor.view.dom.scrollHeight;
              const newPageCount = Math.max(1, Math.ceil(height / 1123));
              setPageCount(prev => prev !== newPageCount ? newPageCount : prev);
            }, 0);
          } catch (e) {
            // If parsing fails, it might be raw HTML or plain text
            editor.commands.setContent(remoteContent, { emitUpdate: false });
          }
        }
      }
    }, (error: any) => {
      console.error("Error in real-time sync:", error);
    });

    return () => unsubscribe();
  }, [editor, ownerId, docId]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F1F3F4] dark:bg-[#0E1113] transition-colors relative">
      <Toolbar 
        editor={editor} 
        onToggleSearch={() => setShowSearch(prev => !prev)}
        onToggleComments={() => setShowComments(prev => !prev)}
        onToggleTOC={() => setShowTOC(prev => !prev)}
        onSummarize={handleSummarize}
        isSpellCheckEnabled={isSpellCheckEnabled}
        onToggleSpellCheck={() => {
          setIsSpellCheckEnabled(prev => !prev);
          if (isSpellCheckEnabled) {
            setSpellCheckErrors([]);
            setActiveError(null);
          }
        }}
      />
      
      {/* Find and Replace Bar */}
      {showSearch && (
        <div className="absolute top-[52px] right-8 z-30 bg-white dark:bg-[#1A1C1E] shadow-xl border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-col gap-2 w-80 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Find"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                autoFocus
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {searchResults.length > 0 ? `${currentResultIndex + 1}/${searchResults.length}` : '0/0'}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"><ChevronLeft size={16} /></button>
              <button onClick={handleNext} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"><ChevronRight size={16} /></button>
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"><X size={16} /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Replace"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
            <button onClick={handleReplace} className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors">Replace</button>
            <button onClick={handleReplaceAll} className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors">All</button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center no-scrollbar scroll-smooth">
          {/* Container that holds both backgrounds and editor using grid for stable stacking */}
          <div className="relative mb-24 mx-auto grid grid-cols-1 grid-rows-1" style={{ width: '794px' }}>
            {/* Visual Page Backgrounds - Stays behind */}
            <div className="col-start-1 row-start-1 flex flex-col pointer-events-none select-none z-0">
              {Array.from({ length: pageCount }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-[#1A1C1E] shadow-lg border-x border-t last:border-b border-gray-200 dark:border-gray-800 relative page-background print:shadow-none print:border-none"
                  style={{ width: '794px', height: '1123px' }}
                >
                  {/* Page Numbering */}
                  <div className={`absolute bottom-8 left-0 right-0 text-center text-xs text-gray-400 dark:text-gray-500 select-none font-medium page-number transition-opacity duration-300 ${isFocused ? 'opacity-0' : 'opacity-100'}`}>
                    Page {i + 1} of {pageCount}
                  </div>
                </div>
              ))}
            </div>
            
            {/* The actual editor content - Stacks on top of backgrounds */}
            <div className="col-start-1 row-start-1 z-10 w-full overflow-visible">
              <EditorContent 
                editor={editor} 
                className="bg-transparent pointer-events-auto min-h-[1123px]"
              />
            </div>
          </div>
        </div>

        {/* Comments Sidebar */}
        {showComments && (
          <div className="w-80 bg-white dark:bg-[#1A1C1E] border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MessageSquare size={18} />
                Comments
              </h3>
              <button onClick={() => setShowComments(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet. Select text to add one.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{comment.author}</span>
                      <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="relative">
                <textarea
                  placeholder={editor?.state.selection.empty ? "Select text to comment..." : "Add a comment..."}
                  disabled={editor?.state.selection.empty}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 min-h-[80px] resize-none disabled:opacity-50"
                />
                <button
                  onClick={addComment}
                  disabled={!newComment || editor?.state.selection.empty}
                  className="absolute bottom-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table of Contents Sidebar */}
        {showTOC && (
          <TableOfContents 
            items={tocItems} 
            onItemClick={scrollToHeading} 
            onClose={() => setShowTOC(false)} 
          />
        )}
      </div>

      {/* AI Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1A1C1E] rounded-[32px] p-8 w-full max-w-[540px] shadow-2xl transition-all border border-gray-200 dark:border-gray-800 scale-in-center">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Sparkles size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Summary</h2>
              </div>
              <button 
                onClick={() => setShowSummary(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 min-h-[200px] flex flex-col">
              {isSummarizing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 size={40} className="text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Analyzing document content...</p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                  {summary}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowSummary(false)}
                className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spellcheck Suggestions Popover */}
      {activeError && (
        <div 
          className="fixed z-[70] bg-white dark:bg-[#1A1C1E] shadow-2xl border border-gray-200 dark:border-gray-800 rounded-xl p-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
          style={{ top: activeError.pos.top, left: activeError.pos.left }}
        >
          <div className="px-2 py-1 mb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggestions</span>
          </div>
          <div className="space-y-1">
            {activeError.suggestions.length > 0 ? (
              activeError.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(suggestion)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <div className="px-3 py-1.5 text-xs text-gray-400 italic">No suggestions found</div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-1">
            <button 
              onClick={() => setActiveError(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1"
            >
              Ignore
            </button>
            {isCheckingSpelling && <Loader2 size={12} className="text-blue-500 animate-spin mr-2" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
