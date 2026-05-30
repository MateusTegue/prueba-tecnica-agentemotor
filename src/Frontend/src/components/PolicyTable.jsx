import React from 'react';
import { MessageSquare, Info } from 'lucide-react';
import ActionsCell from './ActionsCell';
import { getPolicyTypeLabel } from '../utils/policyDisplay';

const PolicyTable = ({ policies, onContact, onRenew, getTemporalBadge, getManagementBadge, formatDays }) => {
  if (!policies || policies.length === 0) {
    return (
      <div className="empty-state">
        <Info size={40} className="empty-state-icon" />
        <h3>No se encontraron pólizas</h3>
        <p>Prueba ajustando los filtros de búsqueda o el estado temporal.</p>
      </div>
    );
  }

  return (
    <table className="policy-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Póliza</th>
          <th>Vencimiento</th>
          <th>Estado</th>
          <th>Gestión</th>
          <th>Intentos</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {policies.map((policy) => {
          return (
            <tr key={policy.id}>
              <td>
                <div className="customer-info">
                  <span className="customer-name">{policy.client?.name}</span>
                  <span className="customer-phone">{policy.client?.phone}</span>
                </div>
              </td>
              <td>
                <div className="customer-info">
                  <span className="customer-name" style={{ fontSize: '0.875rem' }}>{policy.policy_number}</span>
                  <span className="customer-phone">{getPolicyTypeLabel(policy.type)} • {policy.insurer}</span>
                </div>
              </td>
              <td>
                <div className="exp-info">
                  <span className="exp-date">{policy.expiration_date}</span>
                  {formatDays(policy.days_until_expiration, policy.temporal_status)}
                </div>
              </td>
              <td>{getTemporalBadge(policy.temporal_status)}</td>
              <td>{getManagementBadge(policy.management_status)}</td>
              <td>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MessageSquare size={14} style={{ color: 'var(--text-muted)' }} />
                  {policy.contact_attempts_count || 0}
                </span>
              </td>
              <td>
                <ActionsCell policy={policy} onContact={onContact} onRenew={onRenew} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default PolicyTable;
