import React from 'react';

export const getTemporalBadge = (status) => {
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

export const getManagementBadge = (status) => {
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

export const formatDays = (days, status) => {
  const absDays = Math.abs(days);

  if (status === 'active') {
    return <span className="exp-days ok">{days} días restantes</span>;
  }

  if (status === 'expiring_soon') {
    return <span className="exp-days warning">{days} días restantes</span>;
  }

  if (status === 'expired_recoverable') {
    return <span className="exp-days urgent">Hace {absDays} días (Límite 30d)</span>;
  }

  return <span className="exp-days lost">Hace {absDays} días</span>;
};

export const getPolicyTypeLabel = (type) => {
  switch (type?.toLowerCase()) {
    case 'auto':
      return 'Vehículos';
    case 'hogar':
      return 'Hogar';
    case 'vida':
      return 'Vida';
    case 'salud':
      return 'Salud';
    default:
      return type;
  }
};
