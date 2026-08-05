import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Pilcrow, Strikethrough, Underline, Undo2, Redo2, RemoveFormatting } from 'lucide-react';
import { richTextToPlainText, sanitizeRichText, toEditorHtml } from '../utils/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, onClick, children }) => (
  <button
    type="button"
    className="rich-text-toolbar-button"
    aria-label={label}
    title={label}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write a brief, outline, or description...',
  minHeight = 150,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isFocused) return;
    const nextHtml = toEditorHtml(value);
    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
  }, [value, isFocused]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeRichText(editor.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const addLink = () => {
    const url = window.prompt('Paste a URL (https://...)');
    if (!url?.trim() || !/^https?:\/\//i.test(url.trim())) return;
    runCommand('createLink', url.trim());
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const safeHtml = html ? sanitizeRichText(html) : toEditorHtml(text);
    document.execCommand('insertHTML', false, safeHtml);
    emitChange();
  };

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Brief formatting">
        <ToolbarButton label="Bold" onClick={() => runCommand('bold')}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => runCommand('italic')}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => runCommand('underline')}><Underline size={15} /></ToolbarButton>
        <ToolbarButton label="Strikethrough" onClick={() => runCommand('strikeThrough')}><Strikethrough size={15} /></ToolbarButton>
        <span className="rich-text-toolbar-divider" aria-hidden="true" />
        <ToolbarButton label="Paragraph" onClick={() => runCommand('formatBlock', 'p')}><Pilcrow size={15} /></ToolbarButton>
        <ToolbarButton label="Heading" onClick={() => runCommand('formatBlock', 'h3')}><span className="rich-text-toolbar-letter">H</span></ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => runCommand('insertUnorderedList')}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => runCommand('insertOrderedList')}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="Add link" onClick={addLink}><LinkIcon size={15} /></ToolbarButton>
        <span className="rich-text-toolbar-spacer" />
        <ToolbarButton label="Undo" onClick={() => runCommand('undo')}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => runCommand('redo')}><Redo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => runCommand('removeFormat')}><RemoveFormatting size={15} /></ToolbarButton>
      </div>
      <div
        ref={editorRef}
        className="rich-text-content rich-text-editor-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          emitChange();
        }}
        onInput={emitChange}
        onPaste={handlePaste}
      />
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
