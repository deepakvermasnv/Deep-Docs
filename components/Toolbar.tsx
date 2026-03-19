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

const ToolbarDropdown = ({ 
  value, 
  options, 
  onChange, 
  width = 'w-32',
  prefix = ''
}: { 
  value: string; 
  options: { label: string; value: string }[]; 
  onChange: (val: string) => void;
  width?: string;
  prefix?: string;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className={`relative ${width}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
      >
        <span className="truncate">{prefix}{selectedOption.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#2D2F31] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto no-scrollbar">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value === opt.value 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
    { label: '50%', value: '50%' },
    { label: '75%', value: '75%' },
    { label: '90%', value: '90%' },
    { label: '100%', value: '100%' },
    { label: '125%', value: '125%' },
    { label: '150%', value: '150%' },
    { label: '200%', value: '200%' },
  ];

  const fontSizes = [
    '8', '9', '10', '11', '12', '14', '18', '24', '30', '36', '48', '60', '72', '96'
  ].map(size => ({ label: size, value: size }));

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
        <ToolbarDropdown
          value="100%"
          options={zoomLevels}
          width="w-24"
          onChange={(val) => {
            const zoom = val.replace('%', '');
            const editorArea = document.querySelector('.ProseMirror') as HTMLElement;
            if (editorArea) {
              editorArea.style.zoom = `${parseInt(zoom) / 100}`;
            }
          }}
        />
      ),
    },
    { type: 'divider' },
    {
      type: 'custom',
      component: (
        <ToolbarDropdown
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          options={fonts}
          width="w-36"
          onChange={(val) => editor.chain().focus().setFontFamily(val).run()}
        />
      ),
    },
    {
      type: 'custom',
      component: (
        <ToolbarDropdown
          value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
          options={fontSizes}
          width="w-20"
          onChange={(val) => (editor.chain().focus() as any).setFontSize(`${val}px`).run()}
        />
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
    <div className="sticky top-0 z-20 bg-white dark:bg-[#1A1C1E] border-b border-gray-200 dark:border-gray-800 px-4 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar transition-colors">
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={i} className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1.5 flex-shrink-0" />;
        }
        if (btn.type === 'custom') {
          return <React.Fragment key={i}>{btn.component}</React.Fragment>;
        }
        return (
          <button
            key={i}
            onClick={btn.onClick}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 group relative ${
              btn.isActive 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={btn.label}
          >
            <div className="group-hover:scale-110 transition-transform">
              {btn.icon}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Toolbar;
