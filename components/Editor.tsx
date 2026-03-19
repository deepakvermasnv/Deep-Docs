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
import { Extension } from '@tiptap/core';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Toolbar from './Toolbar';

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

interface EditorProps {
  ownerId: string;
  docId: string;
  content: string;
  onChange: (content: string) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  darkMode?: boolean;
}

const Editor = ({ ownerId, docId, content, onChange, onEditorReady, darkMode }: EditorProps) => {
  const [pageCount, setPageCount] = React.useState(1);
  const [isFocused, setIsFocused] = React.useState(false);
  
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
        setPageCount(prev => prev !== newPageCount ? newPageCount : prev);
      }
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onDestroy: () => {
      onEditorReady?.(null);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm sm:prose-base dark:prose-invert max-w-none p-[96px] bg-transparent mx-auto transition-all duration-300',
        style: 'width: 794px; min-height: 1123px; background-image: linear-gradient(to bottom, transparent 1122px, rgba(0,0,0,0.05) 1122px, rgba(0,0,0,0.05) 1123px, transparent 1123px); background-size: 100% 1123px;',
      },
    },
  });

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
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F1F3F4] dark:bg-[#0E1113] transition-colors">
      <Toolbar editor={editor} />
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
    </div>
  );
};

export default Editor;
