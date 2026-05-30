import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import ExpirationChart from '../components/ExpirationChart';
import ContactModal from '../components/ContactModal';
import RenewModal from '../components/RenewModal';
import { getPolicies } from '../services/api';
import PolicyTable from '../components/PolicyTable';
import PolicyTableSkeleton from '../components/PolicyTableSkeleton';
import PolicyToolbar from '../components/PolicyToolbar';
import ToastNotifications from '../components/ToastNotifications';
import { getTemporalBadge, getManagementBadge, formatDays } from '../utils/policyDisplay';
import { ERROR_MESSAGES } from '../helpers/errorMessages';

const Dashboard = ({ activeSection = 'operations' }) => {
  const isOperationsView = activeSection === 'operations';

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
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
    addToast('Contacto registrado correctamente.', 'success');
  };

  const handleRenewSaved = () => {
    setRenewPolicyObj(null);
    fetchPoliciesData();
    addToast('Póliza renovada correctamente.', 'success');
  };

  return (
    <div className="app-container">
      <ToastNotifications toasts={toasts} onClose={removeToast} />

      {/* Metrics Header Component */}
      <Header policies={policies} />

      {!isOperationsView && <ExpirationChart policies={policies} />}

      {isOperationsView && (
        <>
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
            {loading ? (
              <PolicyTableSkeleton rows={6} />
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
        </>
      )}

      {/* Modals */}
      {isOperationsView && contactPolicyId && (
        <ContactModal
          policyId={contactPolicyId}
          onClose={() => setContactPolicyId(null)}
          onSave={handleContactSaved}
          onActionError={(message) => addToast(message, 'error')}
        />
      )}

      {isOperationsView && renewPolicyObj && (
        <RenewModal
          policy={renewPolicyObj}
          onClose={() => setRenewPolicyObj(null)}
          onSave={handleRenewSaved}
          onActionError={(message) => addToast(message, 'error')}
        />
      )}
    </div>
  );
};

export default Dashboard;
