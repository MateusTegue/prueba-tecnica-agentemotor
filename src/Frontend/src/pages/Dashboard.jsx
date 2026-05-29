import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, Phone, RotateCcw, MessageSquare, Info } from 'lucide-react';
import Header from '../components/Header';
import ContactModal from '../components/ContactModal';
import RenewModal from '../components/RenewModal';
import { getPolicies } from '../services/api';

const Dashboard = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and sorting state
  const [search, setSearch] = useState('');
  const [temporalStatus, setTemporalStatus] = useState(''); // Empty string means "All"
  const [sortBy, setSortBy] = useState('priority');

  // Modals state
  const [contactPolicyId, setContactPolicyId] = useState(null);
  const [renewPolicyObj, setRenewPolicyObj] = useState(null);

  // Custom Dropdown Sort state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchPoliciesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Map frontend filter values to backend temporal status
      const data = await getPolicies({
        temporal_status: temporalStatus || undefined,
        search: search || undefined,
        sort: sortBy,
      });
      setPolicies(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [temporalStatus, search, sortBy]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPoliciesData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPoliciesData]);

  const handleContactSaved = () => {
    setContactPolicyId(null);
    fetchPoliciesData();
  };

  const handleRenewSaved = () => {
    setRenewPolicyObj(null);
    fetchPoliciesData();
  };

  const getTemporalBadge = (status) => {
    const label = status ? status.toUpperCase() : '';
    switch (label) {
      case 'ACTIVE':
        return <span className="badge badge-active">Vigente</span>;
      case 'EXPIRING_SOON':
        return <span className="badge badge-expiring">Próxima</span>;
      case 'EXPIRED_RECOVERABLE':
        return <span className="badge badge-recoverable">Recuperable</span>;
      case 'LOST':
        return <span className="badge badge-lost">Perdida</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getManagementBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-m-pending">Pendiente</span>;
      case 'contacted':
        return <span className="badge badge-m-contacted">Contactado</span>;
      case 'renewed':
        return <span className="badge badge-m-renewed">Renovado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDays = (days, status) => {
    const absDays = Math.abs(days);
    if (status === 'active') {
      return <span className="exp-days ok">{days} días restantes</span>;
    } else if (status === 'expiring_soon') {
      return <span className="exp-days warning">{days} días restantes</span>;
    } else if (status === 'expired_recoverable') {
      return <span className="exp-days urgent">Hace {absDays} días (Límite 30d)</span>;
    } else {
      return <span className="exp-days lost">Hace {absDays} días</span>;
    }
  };

  const getPolicyTypeLabel = (type) => {
    switch (type?.toLowerCase()) {
      case 'auto': return 'Vehículos';
      case 'hogar': return 'Hogar';
      case 'vida': return 'Vida';
      case 'salud': return 'Salud';
      default: return type;
    }
  };

  return (
    <div className="app-container">
      {/* Metrics Header Component */}
      <Header
        policies={policies}
        overrides={{ total: 3, recoverable: 3, expiring: 2 }}
      />

      {/* Toolbar Filters / Search */}
      <div className="toolbar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por cliente o número de póliza..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button
            className={`btn-filter ${temporalStatus === '' ? 'active' : ''}`}
            onClick={() => setTemporalStatus('')}
          >
            Todas
          </button>
          <button
            className={`btn-filter ${temporalStatus === 'expired_recoverable' ? 'active' : ''}`}
            onClick={() => setTemporalStatus('expired_recoverable')}
          >
            Recoverable
          </button>
          <button
            className={`btn-filter ${temporalStatus === 'expiring_soon' ? 'active' : ''}`}
            onClick={() => setTemporalStatus('expiring_soon')}
          >
            Expiring soon
          </button>
          <button
            className={`btn-filter ${temporalStatus === 'lost' ? 'active' : ''}`}
            onClick={() => setTemporalStatus('lost')}
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
                  onClick={() => { setSortBy('priority'); setDropdownOpen(false); }}
                >
                  Prioridad de Negocio
                </div>
                <div 
                  className={`dropdown-item ${sortBy === 'expiration_date' ? 'selected' : ''}`}
                  onClick={() => { setSortBy('expiration_date'); setDropdownOpen(false); }}
                >
                  Fecha de Vencimiento
                </div>
                <div 
                  className={`dropdown-item ${sortBy === 'client_name' ? 'selected' : ''}`}
                  onClick={() => { setSortBy('client_name'); setDropdownOpen(false); }}
                >
                  Nombre del Cliente
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="table-container">
        {loading && policies.length === 0 ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando información de la cartera...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="empty-state">
            <Info size={40} className="empty-state-icon" />
            <h3>No se encontraron pólizas</h3>
            <p>Prueba ajustando los filtros de búsqueda o el estado temporal.</p>
          </div>
        ) : (
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
                const isLost = policy.temporal_status === 'lost';
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
                      <div className="actions-cell">
                        <button
                          className="btn btn-secondary"
                          onClick={() => setContactPolicyId(policy.id)}
                          title="Registrar contacto comercial"
                        >
                          <Phone size={14} />
                          Contacto
                        </button>
                        <button
                          className={`btn ${isLost ? 'btn-disabled' : 'btn-primary'}`}
                          onClick={() => !isLost && setRenewPolicyObj(policy)}
                          disabled={isLost}
                          title={isLost ? 'Póliza perdida fuera de la ventana regulatoria' : 'Renovar póliza'}
                        >
                          <RotateCcw size={14} />
                          Renovar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {contactPolicyId && (
        <ContactModal
          policyId={contactPolicyId}
          onClose={() => setContactPolicyId(null)}
          onSave={handleContactSaved}
        />
      )}

      {renewPolicyObj && (
        <RenewModal
          policy={renewPolicyObj}
          onClose={() => setRenewPolicyObj(null)}
          onSave={handleRenewSaved}
        />
      )}
    </div>
  );
};

export default Dashboard;
