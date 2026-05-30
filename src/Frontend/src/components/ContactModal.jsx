import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Calendar, AlertCircle } from 'lucide-react';
import { getPolicyDetail, createContactAttempt } from '../services/api';

const ContactModal = ({ policyId, onClose, onSave, onActionError }) => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [outcome, setOutcome] = useState('no_answer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getPolicyDetail(policyId);
        setPolicy(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [policyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createContactAttempt(policyId, outcome, notes);
      onSave();
    } catch (err) {
      setError(err.message);
      if (onActionError) onActionError(err.message);
      setSubmitting(false);
    }
  };

  const getOutcomeLabel = (val) => {
    switch (val) {
      case 'successful': return 'Exitoso';
      case 'no_answer': return 'No contestó';
      case 'callback_requested': return 'Pidió llamar luego';
      case 'wrong_number': return 'Número incorrecto';
      default: return val;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Registrar Intento de Contacto</h3>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando detalles del cliente...</p>
              </div>
            ) : policy ? (
              <>
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontWeight: 600 }}>{policy.client?.name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Teléfono: <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{policy.client?.phone}</span>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Póliza: {policy.policy_number} ({policy.type} - {policy.insurer})
                  </p>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Resultado del contacto</label>
                  <div className="custom-dropdown" style={{ width: '100%' }}>
                    <button
                      type="button"
                      className="dropdown-trigger"
                      style={{ width: '100%' }}
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    >
                      {outcome === 'no_answer' && 'No contestó'}
                      {outcome === 'successful' && 'Exitoso / Renovación conversada'}
                      {outcome === 'callback_requested' && 'Pidió llamar luego'}
                      {outcome === 'wrong_number' && 'Número equivocado'}
                      <span className="dropdown-arrow"></span>
                    </button>
                    {dropdownOpen && (
                      <div className="dropdown-menu" style={{ width: '100%', left: 0, right: 'auto' }}>
                        <div
                          className={`dropdown-item ${outcome === 'no_answer' ? 'selected' : ''}`}
                          onClick={() => { setOutcome('no_answer'); setDropdownOpen(false); }}
                        >
                          No contestó
                        </div>
                        <div
                          className={`dropdown-item ${outcome === 'successful' ? 'selected' : ''}`}
                          onClick={() => { setOutcome('successful'); setDropdownOpen(false); }}
                        >
                          Exitoso / Renovación conversada
                        </div>
                        <div
                          className={`dropdown-item ${outcome === 'callback_requested' ? 'selected' : ''}`}
                          onClick={() => { setOutcome('callback_requested'); setDropdownOpen(false); }}
                        >
                          Pidió llamar luego
                        </div>
                        <div
                          className={`dropdown-item ${outcome === 'wrong_number' ? 'selected' : ''}`}
                          onClick={() => { setOutcome('wrong_number'); setDropdownOpen(false); }}
                        >
                          Número equivocado
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notas o Comentarios</label>
                  <textarea
                    id="notes"
                    className="form-textarea"
                    placeholder="Escribe detalles de la llamada (ej. llamar por la tarde, renovará el viernes...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {policy.contact_attempts && policy.contact_attempts.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                      Historial de Intentos ({policy.contact_attempts.length})
                    </label>
                    <div className="attempts-history">
                      {policy.contact_attempts.map((attempt) => (
                        <div key={attempt.id} className="attempt-item">
                          <div className="attempt-meta">
                            <span className="attempt-outcome">{getOutcomeLabel(attempt.outcome)}</span>
                            <span>{attempt.created_at}</span>
                          </div>
                          {attempt.notes && <p className="attempt-notes">{attempt.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>No se pudo cargar la información de la póliza.</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading || !policy}>
              {submitting ? 'Guardando...' : 'Registrar Contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
