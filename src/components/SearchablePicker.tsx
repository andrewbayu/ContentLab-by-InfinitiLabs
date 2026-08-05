import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

export interface PickerOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

interface SearchablePickerProps {
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  addLabel?: string;
  onAdd?: () => void;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SearchablePicker: React.FC<SearchablePickerProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options...',
  emptyLabel = 'No matching options',
  addLabel,
  onAdd,
  allowClear = true,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) selectValue(option.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`searchable-picker ${className}`.trim()}>
      <button
        type="button"
        className={`searchable-picker-trigger ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled) setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        {selected?.color && <span className="searchable-picker-color" style={{ backgroundColor: selected.color }} aria-hidden="true" />}
        <span className={`searchable-picker-value ${selected ? '' : 'placeholder'}`}>{selected?.label || placeholder}</span>
        <ChevronDown size={15} className="searchable-picker-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="searchable-picker-menu" role="dialog" aria-label={searchPlaceholder}>
          <div className="searchable-picker-search-wrap">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              className="searchable-picker-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {query && <button type="button" className="searchable-picker-clear-query" onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}
          </div>

          <div className="searchable-picker-options" role="listbox" aria-label={placeholder}>
            {allowClear && value && (
              <button type="button" className="searchable-picker-option muted" role="option" onClick={() => selectValue('')}>
                <span>{placeholder}</span>
                <X size={14} />
              </button>
            )}
            {filteredOptions.map((option, index) => (
              <button
                type="button"
                key={option.value}
                className={`searchable-picker-option ${option.value === value ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectValue(option.value)}
              >
                {option.color && <span className="searchable-picker-color" style={{ backgroundColor: option.color }} aria-hidden="true" />}
                <span className="searchable-picker-option-copy">
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                {option.value === value && <Check size={14} className="searchable-picker-check" />}
              </button>
            ))}
            {filteredOptions.length === 0 && <div className="searchable-picker-empty">{emptyLabel}</div>}
          </div>

          {addLabel && onAdd && (
            <button type="button" className="searchable-picker-add" onClick={() => { onAdd(); setOpen(false); }}>
              <Plus size={14} /> {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
