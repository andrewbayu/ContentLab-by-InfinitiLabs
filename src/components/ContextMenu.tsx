import React, { useEffect, useRef } from 'react';
import { Copy, Pencil, Trash2, Link2, X } from 'lucide-react';
import type { ContentItem } from '../services/sheets';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  divider?: boolean;
  action: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  item: ContentItem;
  onClose: () => void;
  onEdit: (item: ContentItem) => void;
  onDuplicate: (item: ContentItem) => void;
  onDelete: (id: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (rect.right > vw) {
      adjustedX = vw - rect.width - 8;
    }
    if (rect.bottom > vh) {
      adjustedY = vh - rect.height - 8;
    }
    if (adjustedX < 0) adjustedX = 8;
    if (adjustedY < 0) adjustedY = 8;

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [x, y]);

  const actions: ContextMenuAction[] = [
    {
      id: 'edit',
      label: 'Edit Task',
      icon: <Pencil size={14} />,
      shortcut: '⌘E',
      action: () => {
        onEdit(item);
        onClose();
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate Task',
      icon: <Copy size={14} />,
      shortcut: '⌘D',
      action: () => {
        onDuplicate(item);
        onClose();
      },
    },
    {
      id: 'copy-link',
      label: 'Copy Task Link',
      icon: <Link2 size={14} />,
      action: () => {
        const url = `${window.location.origin}${window.location.pathname}?task=${item.id}`;
        navigator.clipboard.writeText(url).then(() => {
          // Optional: show toast notification handled by parent
        }).catch(() => {
          // Fallback for older browsers
          const input = document.createElement('input');
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
        });
        onClose();
      },
    },
    {
      id: 'delete',
      label: 'Delete Task',
      icon: <Trash2 size={14} />,
      shortcut: '⌫',
      danger: true,
      action: () => {
        onDelete(item.id);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
      role="menu"
      aria-label="Task context menu"
    >
      <div className="context-menu-header">
        <span className="context-menu-title">{item.title.slice(0, 40)}{item.title.length > 40 ? '…' : ''}</span>
        <button
          type="button"
          className="context-menu-close"
          onClick={onClose}
          aria-label="Close context menu"
        >
          <X size={14} />
        </button>
      </div>
      <div className="context-menu-divider" />
      {actions.map((action) => (
        <React.Fragment key={action.id}>
          {action.divider && <div className="context-menu-divider" />}
          <button
            type="button"
            className={`context-menu-item${action.danger ? ' context-menu-item-danger' : ''}`}
            onClick={action.action}
            role="menuitem"
          >
            <span className="context-menu-item-icon">{action.icon}</span>
            <span className="context-menu-item-label">{action.label}</span>
            {action.shortcut && (
              <span className="context-menu-item-shortcut">{action.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};