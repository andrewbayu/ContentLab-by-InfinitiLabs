import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ClientBrand } from '../services/sheets';
import { ChevronDown, Globe, Building2, Check, Search, Layers, CornerDownRight } from 'lucide-react';

interface ScopeDropdownProps {
  clients: ClientBrand[];
  scopeKey: string;
  onScopeChange: (scopeKey: string) => void;
}

export const ScopeDropdown: React.FC<ScopeDropdownProps> = ({ clients, scopeKey, onScopeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group active clients by client name
  const clientsByName = useMemo(() => {
    return clients
      .filter((entry) => entry.active)
      .reduce<Record<string, ClientBrand[]>>((groups, entry) => {
        groups[entry.client] = [...(groups[entry.client] || []), entry];
        return groups;
      }, {});
  }, [clients]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute selected option metadata
  const selectedInfo = useMemo(() => {
    if (scopeKey === 'all' || !scopeKey) {
      return { label: 'InfinitiLabs · All Clients', sublabel: 'All Workspaces', color: '#2563eb', icon: Globe };
    }
    if (scopeKey.startsWith('client:')) {
      const clientName = scopeKey.slice(7);
      const brands = clientsByName[clientName] || [];
      const primaryColor = brands[0]?.color || '#3b82f6';
      return { label: `All ${clientName}`, sublabel: 'Client Group', color: primaryColor, icon: Building2 };
    }
    if (scopeKey.startsWith('brand:')) {
      const brandId = scopeKey.slice(6);
      const matched = clients.find((entry) => entry.id === brandId);
      if (matched) {
        return { label: matched.brand, sublabel: matched.client, color: matched.color || '#2563eb', icon: Layers };
      }
    }
    return { label: 'Workspace Scope', sublabel: '', color: '#2563eb', icon: Globe };
  }, [scopeKey, clients, clientsByName]);

  const handleSelect = (key: string) => {
    onScopeChange(key);
    setIsOpen(false);
    setSearch('');
  };

  const SelectedIcon = selectedInfo.icon;

  // Filter options based on search query
  const query = search.trim().toLowerCase();
  const filteredClientsByName = useMemo(() => {
    if (!query) return clientsByName;
    const result: Record<string, ClientBrand[]> = {};
    Object.entries(clientsByName).forEach(([client, brands]) => {
      const clientMatches = client.toLowerCase().includes(query);
      const matchingBrands = brands.filter((b) => b.brand.toLowerCase().includes(query));
      if (clientMatches || matchingBrands.length > 0) {
        result[client] = clientMatches ? brands : matchingBrands;
      }
    });
    return result;
  }, [clientsByName, query]);

  return (
    <div className="custom-scope-switcher" ref={dropdownRef}>
      <label className="scope-switcher-label">Workspace scope</label>
      <button
        type="button"
        className={`scope-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="scope-trigger-left">
          <span className="scope-badge-dot" style={{ backgroundColor: selectedInfo.color }}>
            <SelectedIcon size={12} style={{ color: '#ffffff' }} />
          </span>
          <div className="scope-trigger-text">
            <span className="scope-trigger-title">{selectedInfo.label}</span>
            {selectedInfo.sublabel && <span className="scope-trigger-sub">{selectedInfo.sublabel}</span>}
          </div>
        </div>
        <ChevronDown size={14} className={`scope-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="scope-dropdown-menu" role="listbox">
          {Object.keys(clientsByName).length > 3 && (
            <div className="scope-search-box">
              <Search size={13} className="scope-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client or brand..."
                autoFocus
              />
            </div>
          )}

          <div className="scope-options-scroll">
            {/* All Clients Option */}
            {(!query || 'infinitilabs all clients'.includes(query)) && (
              <button
                type="button"
                className={`scope-option-item ${scopeKey === 'all' ? 'selected' : ''}`}
                onClick={() => handleSelect('all')}
              >
                <div className="scope-option-content">
                  <span className="scope-option-dot" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                    <Globe size={11} style={{ color: '#fff' }} />
                  </span>
                  <div className="scope-option-info">
                    <span className="scope-option-name">InfinitiLabs · All Clients</span>
                    <span className="scope-option-desc">Overview across all workspaces</span>
                  </div>
                </div>
                {scopeKey === 'all' && <Check size={14} className="scope-check-icon" />}
              </button>
            )}

            {/* Client Groups & Brands */}
            {Object.entries(filteredClientsByName).map(([client, brands]) => {
              const clientKey = `client:${client}`;
              const isClientSelected = scopeKey === clientKey;
              const clientColor = brands[0]?.color || '#3b82f6';

              return (
                <div key={client} className="scope-group">
                  <div className="scope-group-header">
                    <span className="scope-group-indicator" style={{ backgroundColor: clientColor }} />
                    <span className="scope-group-title">{client}</span>
                  </div>

                  {/* All Client Workspace item */}
                  <button
                    type="button"
                    className={`scope-option-item scope-option-client-all ${isClientSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(clientKey)}
                  >
                    <div className="scope-option-content">
                      <span className="scope-option-dot" style={{ backgroundColor: `${clientColor}20`, color: clientColor }}>
                        <Building2 size={11} />
                      </span>
                      <span className="scope-option-name">All {client}</span>
                    </div>
                    {isClientSelected && <Check size={14} className="scope-check-icon" />}
                  </button>

                  {/* Individual Brands */}
                  {brands.map((brand) => {
                    const brandKey = `brand:${brand.id}`;
                    const isBrandSelected = scopeKey === brandKey;
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        className={`scope-option-item scope-option-brand ${isBrandSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(brandKey)}
                      >
                        <div className="scope-option-content">
                          <CornerDownRight size={12} className="scope-branch-icon" />
                          <span className="scope-option-dot brand-dot" style={{ backgroundColor: brand.color || clientColor }}>
                            <Layers size={10} style={{ color: '#fff' }} />
                          </span>
                          <span className="scope-option-name">{brand.brand}</span>
                        </div>
                        {isBrandSelected && <Check size={14} className="scope-check-icon" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
