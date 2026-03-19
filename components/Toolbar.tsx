'use client';

import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Palette,
  ChevronDown,
  Undo,
  Redo,
  Printer,
  Indent,
  Outdent,
} from 'lucide-react';
import { Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
}

const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.onerror = (err) => {
          console.error("FileReader error:", err);
          alert("Failed to read image file.");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const fonts = [
    { label: 'Arial', value: 'Arial' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Inter', value: 'Inter' },
  ];

  const zoomLevels = [
    '50%', '75%', '90%', '100%', '125%', '150%', '200%'
  ];

  const fontSizes = [
    '8', '9', '10', '11', '12', '14', '18', '24', '30', '36', '48', '60', '72', '96'
  ];

  const buttons = [
    {
      icon: <Undo size={18} />,
      onClick: () => editor.chain().focus().undo().run(),
      isActive: false,
      label: 'Undo',
    },
    {
      icon: <Redo size={18} />,
      onClick: () => editor.chain().focus().redo().run(),
      isActive: false,
      label: 'Redo',
    },
    {
      icon: <Printer size={18} />,
      onClick: () => window.print(),
      isActive: false,
      label: 'Print',
    },
    { type: 'divider' },
    {
      type: 'custom',
      component: (
        <select
          className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none cursor-pointer"
          defaultValue="100%"
          onChange={(e) => {
            const zoom = e.target.value.replace('%', '');
            const editorArea = document.querySelector('.ProseMirror') as HTMLElement;
            if (editorArea) {
              editorArea.style.zoom = `${parseInt(zoom) / 100}`;
            }
          }}
        >
          {zoomLevels.map((level) => (
            <option key={level} value={level} className="bg-white dark:bg-[#1A1C1E]">
              {level}
            </option>
          ))}
        </select>
      ),
    },
    { type: 'divider' },
    {
      type: 'custom',
      component: (
        <select
          className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none cursor-pointer"
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
        >
          {fonts.map((font) => (
            <option key={font.value} value={font.value} className="bg-white dark:bg-[#1A1C1E]">
              {font.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      type: 'custom',
      component: (
        <select
          className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none cursor-pointer"
          onChange={(e) => (editor.chain().focus() as any).setFontSize(`${e.target.value}px`).run()}
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
        >
          {fontSizes.map((size) => (
            <option key={size} value={size} className="bg-white dark:bg-[#1A1C1E]">
              {size}
            </option>
          ))}
        </select>
      ),
    },
    { type: 'divider' },
    {
      icon: <Bold size={18} />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      label: 'Bold',
    },
    {
      icon: <Italic size={18} />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      label: 'Italic',
    },
    {
      icon: <UnderlineIcon size={18} />,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
      label: 'Underline',
    },
    {
      icon: <Palette size={18} />,
      onClick: () => {
        const color = window.prompt('Color (hex or name)', '#000000');
        if (color) editor.chain().focus().setColor(color).run();
      },
      isActive: false,
      label: 'Text Color',
    },
    {
      icon: <Highlighter size={18} />,
      onClick: () => {
        const color = window.prompt('Highlight Color (hex or name)', '#ffff00');
        if (color) editor.chain().focus().toggleHighlight({ color }).run();
      },
      isActive: editor.isActive('highlight'),
      label: 'Highlight',
    },
    { type: 'divider' },
    {
      icon: <Heading1 size={18} />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
      label: 'Heading 1',
    },
    {
      icon: <Heading2 size={18} />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
      label: 'Heading 2',
    },
    {
      icon: <Heading3 size={18} />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
      label: 'Heading 3',
    },
    {
      icon: <Type size={18} />,
      onClick: () => editor.chain().focus().setParagraph().run(),
      isActive: editor.isActive('paragraph'),
      label: 'Normal text',
    },
    { type: 'divider' },
    {
      icon: <LinkIcon size={18} />,
      onClick: setLink,
      isActive: editor.isActive('link'),
      label: 'Link',
    },
    {
      icon: <ImageIcon size={18} />,
      onClick: addImage,
      isActive: false,
      label: 'Image',
    },
    { type: 'divider' },
    {
      icon: <List size={18} />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      label: 'Bullet List',
    },
    {
      icon: <ListOrdered size={18} />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      label: 'Numbered List',
    },
    {
      icon: <CheckSquare size={18} />,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive('taskList'),
      label: 'Task List',
    },
    { type: 'divider' },
    {
      icon: <AlignLeft size={18} />,
      onClick: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: editor.isActive({ textAlign: 'left' }),
      label: 'Align Left',
    },
    {
      icon: <AlignCenter size={18} />,
      onClick: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: editor.isActive({ textAlign: 'center' }),
      label: 'Align Center',
    },
    {
      icon: <AlignRight size={18} />,
      onClick: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: editor.isActive({ textAlign: 'right' }),
      label: 'Align Right',
    },
    {
      icon: <AlignJustify size={18} />,
      onClick: () => editor.chain().focus().setTextAlign('justify').run(),
      isActive: editor.isActive({ textAlign: 'justify' }),
      label: 'Align Justify',
    },
    { type: 'divider' },
    {
      icon: <Outdent size={18} />,
      onClick: () => editor.chain().focus().liftListItem('listItem').run(),
      isActive: false,
      label: 'Decrease Indent',
    },
    {
      icon: <Indent size={18} />,
      onClick: () => editor.chain().focus().sinkListItem('listItem').run(),
      isActive: false,
      label: 'Increase Indent',
    },
    { type: 'divider' },
  ];

  return (
    <div className="flex items-center flex-wrap gap-1 p-1 bg-[#EDF2FA] dark:bg-[#2D2F31] rounded-full mx-auto max-w-fit shadow-sm border border-gray-200 dark:border-gray-700 mt-2 sticky top-0 z-10 transition-colors">
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={i} className="w-[1px] h-6 bg-gray-300 dark:bg-gray-600 mx-1" />;
        }
        if (btn.type === 'custom') {
          return <React.Fragment key={i}>{btn.component}</React.Fragment>;
        }
        return (
          <button
            key={i}
            onClick={btn.onClick}
            className={`p-1.5 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
              btn.isActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            title={btn.label}
          >
            {btn.icon}
          </button>
        );
      })}
    </div>
  );
};

export default Toolbar;
