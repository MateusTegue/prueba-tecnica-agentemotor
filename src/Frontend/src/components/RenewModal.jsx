import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { renewPolicy } from '../services/api';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const RenewModal = ({ policy, onClose, onSave, onActionError }) => {
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Custom calendar state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // Default to 1 year from today
    const oneYearFromToday = new Date();
    oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
    const yyyy = oneYearFromToday.getFullYear();
    const mm = String(oneYearFromToday.getMonth() + 1).padStart(2, '0');
    const dd = String(oneYearFromToday.getDate()).padStart(2, '0');
    setNewDate(`${yyyy}-${mm}-${dd}`);
    setCurrentMonth(oneYearFromToday);
  }, [policy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Por favor selecciona una fecha de vencimiento.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await renewPolicy(policy.id, newDate);
      onSave();
    } catch (err) {
      setError(err.message);
      if (onActionError) onActionError(err.message);
      setSubmitting(false);
    }
  };

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const daysInMonth = [];
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    daysInMonth.push(null);
  }

  for (let d = 1; d <= totalDays; d++) {
    daysInMonth.push(new Date(year, month, d));
  }

  const handleDateSelect = (date) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setNewDate(`${yyyy}-${mm}-${dd}`);
    setShowDatePicker(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Renovar Póliza</h3>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ minHeight: '380px' }}>
            {error && (
              <div className="error-banner">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary-color)' }}>
              <p style={{ fontWeight: 600 }}>{policy.client?.name}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Póliza actual: <span style={{ fontWeight: 500 }}>{policy.policy_number}</span>
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Vencimiento anterior: <span style={{ fontWeight: 600 }}>{policy.expiration_date}</span>
              </p>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label>Nueva Fecha de Vencimiento</label>
              <div className="custom-date-picker">
                <button
                  type="button"
                  className="date-picker-trigger"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <Calendar size={16} style={{ marginRight: '0.5rem', color: 'var(--text-secondary)' }} />
                  {newDate ? newDate : 'Selecciona una fecha'}
                </button>
                
                {showDatePicker && (
                  <div className="calendar-popover">
                    <div className="calendar-header">
                      <button type="button" className="btn-cal-nav" onClick={handlePrevMonth}>&larr;</button>
                      <span className="calendar-title">{monthNames[month]} de {year}</span>
                      <button type="button" className="btn-cal-nav" onClick={handleNextMonth}>&rarr;</button>
                    </div>
                    
                    <div className="calendar-weekdays">
                      {['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'].map(d => (
                        <div key={d} className="weekday-cell">{d}</div>
                      ))}
                    </div>
                    
                    <div className="calendar-days-grid">
                      {daysInMonth.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} className="day-cell empty"></div>;
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const isSelected = newDate === dateStr;
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`day-cell ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleDateSelect(date)}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Debe ser una fecha futura en comparación con el día de hoy.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#166534', fontSize: '0.825rem' }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>Esta acción renovará la póliza, establecerá su estado de gestión a 'renovada' y actualizará automáticamente el estado temporal a 'vigente'.</span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || showDatePicker}>
              {submitting ? 'Renovando...' : 'Confirmar Renovación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenewModal;
