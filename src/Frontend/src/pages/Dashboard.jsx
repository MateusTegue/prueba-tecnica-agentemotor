import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import ContactModal from '../components/ContactModal';
import RenewModal from '../components/RenewModal';
import { getPolicies } from '../services/api';
import PolicyTable from '../components/PolicyTable';
import PolicyToolbar from '../components/PolicyToolbar';
import { getTemporalBadge, getManagementBadge, formatDays } from '../utils/policyDisplay';
import { ERROR_MESSAGES } from '../helpers/errorMessages';

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
      setError(err.message || ERROR_MESSAGES.SERVER_CONNECTION);
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

  return (
    <div className="app-container">
      {/* Metrics Header Component */}
      <Header policies={policies} />

      {/* Toolbar Filters / Search */}
      <PolicyToolbar
        search={search}
        onSearchChange={setSearch}
        temporalStatus={temporalStatus}
        onTemporalStatusChange={setTemporalStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

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
        ) : (
          <PolicyTable
            policies={policies}
            onContact={(id) => setContactPolicyId(id)}
            onRenew={(policy) => setRenewPolicyObj(policy)}
            getTemporalBadge={getTemporalBadge}
            getManagementBadge={getManagementBadge}
            formatDays={formatDays}
          />
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
