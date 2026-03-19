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
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    onDestroy: () => {
      onEditorReady?.(null);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none min-h-[1056px] p-[96px]',
      },
    },
  });

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
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F8F9FA] dark:bg-[#0E1113] transition-colors">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center no-scrollbar">
        <div className="w-full max-w-[816px] min-h-[1056px] bg-white dark:bg-[#1A1C1E] shadow-[0_0_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] mb-20 transition-all border border-gray-200/50 dark:border-gray-800/50 rounded-sm">
          <EditorContent editor={editor} className="prose prose-sm sm:prose-base dark:prose-invert max-w-none" />
        </div>
      </div>
    </div>
  );
};

export default Editor;
