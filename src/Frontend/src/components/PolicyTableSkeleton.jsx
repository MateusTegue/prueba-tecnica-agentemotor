import React from 'react';

const PolicyTableSkeleton = ({ rows = 6 }) => {
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
        {Array.from({ length: rows }).map((_, idx) => (
          <tr key={`skeleton-row-${idx}`}>
            <td>
              <div className="customer-info">
                <span className="skeleton-line skeleton-name"></span>
                <span className="skeleton-line skeleton-sub"></span>
              </div>
            </td>
            <td>
              <div className="customer-info">
                <span className="skeleton-line skeleton-policy"></span>
                <span className="skeleton-line skeleton-sub"></span>
              </div>
            </td>
            <td>
              <div className="exp-info">
                <span className="skeleton-line skeleton-date"></span>
                <span className="skeleton-line skeleton-sub"></span>
              </div>
            </td>
            <td><span className="skeleton-pill"></span></td>
            <td><span className="skeleton-pill"></span></td>
            <td><span className="skeleton-line skeleton-attempts"></span></td>
            <td>
              <div className="actions-cell">
                <span className="skeleton-btn"></span>
                <span className="skeleton-btn"></span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PolicyTableSkeleton;
