import React from 'react';
import { ShieldCheck, AlertCircle, Clock, Trash2, Layers } from 'lucide-react';

const Header = ({ policies = [], overrides = {} }) => {
  const stats = policies.reduce(
    (acc, policy) => {
      const status = (policy.temporal_status || '').toLowerCase();
      if (status === 'expired_recoverable') acc.recoverable++;
      else if (status === 'expiring_soon') acc.expiring++;
      else if (status === 'active') acc.active++;
      else if (status === 'lost') acc.lost++;
      return acc;
    },
    { recoverable: 0, expiring: 0, active: 0, lost: 0 }
  );

  const total = policies.length;

  // Allow optional override values for display (useful for demos or manual counts)
  const displayTotal = typeof overrides.total === 'number' ? overrides.total : total;
  const displayRecoverable = typeof overrides.recoverable === 'number' ? overrides.recoverable : stats.recoverable;
  const displayExpiring = typeof overrides.expiring === 'number' ? overrides.expiring : stats.expiring;
  const displayLost = typeof overrides.lost === 'number' ? overrides.lost : stats.lost;

  return (
    <header className="header-section">
      <div className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="brand-title">
            <h1>Agentemotor</h1>
            <p>Panel de Gestión y Renovación de Pólizas</p>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card all">
          <div className="metric-icon">
            <Layers size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{displayTotal}</span>
            <span className="metric-label">Total Pólizas</span>
          </div>
        </div>

        <div className="metric-card recoverable">
          <div className="metric-icon">
            <AlertCircle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{displayRecoverable}</span>
            <span className="metric-label">Recuperables (Ventana 30d)</span>
          </div>
        </div>

        <div className="metric-card expiring">
          <div className="metric-icon">
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{displayExpiring}</span>
            <span className="metric-label">Próximas a Vencer</span>
          </div>
        </div>

        <div className="metric-card lost">
          <div className="metric-icon">
            <Trash2 size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{displayLost}</span>
            <span className="metric-label">Pólizas Perdidas</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
