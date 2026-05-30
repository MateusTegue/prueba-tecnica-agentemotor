import React from 'react';
import { LayoutDashboard, ClipboardList } from 'lucide-react';

const Sidebar = ({ activeSection, onSectionChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Agentemotor</div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSectionChange('dashboard')}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>

        <button
          type="button"
          className={`sidebar-item ${activeSection === 'operations' ? 'active' : ''}`}
          onClick={() => onSectionChange('operations')}
        >
          <ClipboardList size={16} />
          Operaciones
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
