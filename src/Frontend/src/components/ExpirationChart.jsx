import React, { useMemo } from 'react';

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  month: 'short',
  year: '2-digit',
});

const ExpirationChart = ({ policies = [] }) => {
  const chartData = useMemo(() => {
    const buckets = {};

    policies.forEach((policy) => {
      if (!policy.expiration_date) return;

      const date = new Date(`${policy.expiration_date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) {
        buckets[key] = {
          key,
          label: MONTH_FORMATTER.format(date),
          count: 0,
        };
      }

      buckets[key].count += 1;
    });

    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, 8);
  }, [policies]);

  const maxCount = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <section className="expiration-chart-card">
      <div className="expiration-chart-header">
        <h3>Vencimientos por mes</h3>
      </div>

      {chartData.length === 0 ? (
        <p className="expiration-chart-empty">No hay datos de vencimiento para graficar.</p>
      ) : (
        <div className="expiration-chart">
          {chartData.map((item) => {
            const barHeight = Math.max((item.count / maxCount) * 160, 14);
            return (
              <div className="expiration-chart-item" key={item.key}>
                <span className="expiration-chart-value">{item.count}</span>
                <div className="expiration-chart-bar-wrap">
                  <div className="expiration-chart-bar" style={{ height: `${barHeight}px` }} />
                </div>
                <span className="expiration-chart-label">{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ExpirationChart;
