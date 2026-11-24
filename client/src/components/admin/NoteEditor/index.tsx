import { useEffect, useRef } from 'react';
import styles from './NoteEditor.module.css';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function noteToEditorHtml(value: string): string {
  if (!value) return '';
  if (/<\/?(strong|em|p|br)\b/i.test(value)) return value;
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '').replace(/\u00a0/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const inner = Array.from(element.childNodes).map(serializeNode).join('');
  const tag = element.tagName;

  if (tag === 'BR') return '<br>';
  if (tag === 'STRONG' || tag === 'B') return `<strong>${inner}</strong>`;
  if (tag === 'EM' || tag === 'I') return `<em>${inner}</em>`;
  if (tag === 'DIV' || tag === 'P') {
    const content = inner.replace(/^(<br>)+|(<br>)+$/g, '');
    return content ? `<p>${content}</p>` : '';
  }

  return inner;
}

function serializeNote(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/^(<p><\/p>)+|(<p><\/p>)+$/g, '');
}

export interface NoteEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function NoteEditor({ id, label, value, onChange }: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastValue.current) return;
    editor.innerHTML = noteToEditorHtml(value);
    lastValue.current = value;
  }, [value]);

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = serializeNote(editor);
    lastValue.current = next;
    onChange(next);
  };

  const apply = (command: 'bold' | 'italic') => {
    editorRef.current?.focus();
    document.execCommand(command);
    emit();
  };

  return (
    <div>
      <div className={styles.header}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
          <button
            type="button"
            className={styles.tool}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply('bold')}
          >
            Bold
          </button>
          <button
            type="button"
            className={styles.tool}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply('italic')}
          >
            Italic
          </button>
        </div>
      </div>
      <div
        id={id}
        ref={editorRef}
        className={styles.editor}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        onInput={emit}
        onBlur={emit}
        data-placeholder="Line breaks, bold, and italic"
      />
    </div>
  );
}

export default NoteEditor;
