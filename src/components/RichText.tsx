import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Pilcrow, Strikethrough, Underline as UnderlineIcon, Undo2, Redo2, RemoveFormatting } from 'lucide-react';
import { richTextToPlainText, sanitizeRichText, toEditorHtml } from '../utils/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, active = false, disabled = false, onClick, children }) => (
  <button
    type="button"
    className={`rich-text-toolbar-button${active ? ' is-active' : ''}`}
    aria-label={label}
    aria-pressed={active}
    title={label}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
);

/**
 * Shared editor for task briefs and notes. Values remain sanitized HTML strings,
 * preserving existing Supabase records and legacy plain-text values.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write a brief, outline, or description...',
  minHeight = 150,
}) => {
  const lastEmittedValue = useRef('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' },
        validate: (href) => /^(https?:|mailto:)/i.test(href.trim()),
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: 'rich-text-content rich-text-editor-input',
        'aria-label': placeholder,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const nextValue = sanitizeRichText(instance.getHTML());
      lastEmittedValue.current = nextValue;
      onChange(nextValue);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = sanitizeRichText(toEditorHtml(value));
    if (nextValue === lastEmittedValue.current || nextValue === sanitizeRichText(editor.getHTML())) return;
    editor.commands.setContent(nextValue, { emitUpdate: false });
  }, [editor, value]);

  const addLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Paste a URL (https://...)', previousUrl || '');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^(https?:|mailto:)/i.test(url.trim())) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  if (!editor) return null;

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarButton>
        <span className="rich-text-toolbar-divider" aria-hidden="true" />
        <ToolbarButton label="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={15} /></ToolbarButton>
        <ToolbarButton label="Heading" active={editor.isActive('heading')} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><span className="rich-text-toolbar-letter">H</span></ToolbarButton>
        <ToolbarButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="Add or edit link" active={editor.isActive('link')} onClick={addLink}><LinkIcon size={15} /></ToolbarButton>
        <span className="rich-text-toolbar-spacer" />
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={15} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
};

interface RichTextContentProps {
  value: string;
  className?: string;
}

export const RichTextContent: React.FC<RichTextContentProps> = ({ value, className = '' }) => {
  const safeHtml = sanitizeRichText(toEditorHtml(value));
  if (!safeHtml) return null;
  return <div className={`rich-text-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

interface RichTextPreviewProps {
  value: string;
  className?: string;
}

export const RichTextPreview: React.FC<RichTextPreviewProps> = ({ value, className = '' }) => (
  <span className={`rich-text-preview ${className}`.trim()}>{richTextToPlainText(value)}</span>
);
