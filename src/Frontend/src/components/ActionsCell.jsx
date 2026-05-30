import React from 'react';
import { Phone, RotateCcw } from 'lucide-react';

const ActionsCell = ({ policy, onContact, onRenew }) => {
  const isLost = policy.temporal_status === 'lost';

  return (
    <div className="actions-cell">
      <button
        className="btn btn-secondary"
        onClick={() => onContact(policy.id)}
        title="Registrar contacto comercial"
      >
        <Phone size={14} />
        Contacto
      </button>
      <button
        className={`btn ${isLost ? 'btn-disabled' : 'btn-primary'}`}
        onClick={() => !isLost && onRenew(policy)}
        disabled={isLost}
        title={isLost ? 'Póliza perdida fuera de la ventana regulatoria' : 'Renovar póliza'}
      >
        <RotateCcw size={14} />
        Renovar
      </button>
    </div>
  );
};

export default ActionsCell;
