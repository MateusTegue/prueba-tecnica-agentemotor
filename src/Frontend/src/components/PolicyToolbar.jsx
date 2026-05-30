import React, { useState } from 'react';
import { Search } from 'lucide-react';

const PolicyToolbar = ({
  search,
  onSearchChange,
  temporalStatus,
  onTemporalStatusChange,
  sortBy,
  onSortChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectSort = (value) => {
    onSortChange(value);
    setDropdownOpen(false);
  };

  return (
    <div className="toolbar">
      <div className="search-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por cliente o número de póliza..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-actions">
        <button
          className={`btn-filter ${temporalStatus === '' ? 'active' : ''}`}
          onClick={() => onTemporalStatusChange('')}
        >
          Todas
        </button>
        <button
          className={`btn-filter ${temporalStatus === 'expired_recoverable' ? 'active' : ''}`}
          onClick={() => onTemporalStatusChange('expired_recoverable')}
        >
          Recoverable
        </button>
        <button
          className={`btn-filter ${temporalStatus === 'expiring_soon' ? 'active' : ''}`}
          onClick={() => onTemporalStatusChange('expiring_soon')}
        >
          Expiring soon
        </button>
        <button
          className={`btn-filter ${temporalStatus === 'lost' ? 'active' : ''}`}
          onClick={() => onTemporalStatusChange('lost')}
        >
          Lost
        </button>
      </div>

      <div className="sort-wrapper">
        <span className="sort-label">Ordenar por:</span>
        <div className="custom-dropdown">
          <button
            type="button"
            className="dropdown-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          >
            {sortBy === 'priority' && 'Prioridad de Negocio'}
            {sortBy === 'expiration_date' && 'Fecha de Vencimiento'}
            {sortBy === 'client_name' && 'Nombre del Cliente'}
            <span className="dropdown-arrow"></span>
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <div
                className={`dropdown-item ${sortBy === 'priority' ? 'selected' : ''}`}
                onClick={() => selectSort('priority')}
              >
                Prioridad de Negocio
              </div>
              <div
                className={`dropdown-item ${sortBy === 'expiration_date' ? 'selected' : ''}`}
                onClick={() => selectSort('expiration_date')}
              >
                Fecha de Vencimiento
              </div>
              <div
                className={`dropdown-item ${sortBy === 'client_name' ? 'selected' : ''}`}
                onClick={() => selectSort('client_name')}
              >
                Nombre del Cliente
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyToolbar;
