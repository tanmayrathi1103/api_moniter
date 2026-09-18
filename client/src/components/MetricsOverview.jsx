import React from 'react';

export default function MetricsOverview({ stats }) {
  const {
    total = 0,
    active = 0,
    up = 0,
    down = 0,
    avgUptime = 100,
    avgLatency = 0
  } = stats || {};

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <span className="metric-label">Monitored Endpoints</span>
        <span className="metric-value">{total}</span>
        <span className="metric-sub">{active} active polling</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Operational (UP)</span>
        <span className="metric-value" style={{ color: '#10b981' }}>{up}</span>
        <span className="metric-sub">{total > 0 ? `${Math.round((up / total) * 100)}% online` : 'No endpoints'}</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Failing / Down</span>
        <span className="metric-value" style={{ color: down > 0 ? '#f43f5e' : 'var(--text-primary)' }}>{down}</span>
        <span className="metric-sub">{down > 0 ? 'Requires attention' : 'All systems normal'}</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">24h Avg Uptime</span>
        <span className="metric-value" style={{ color: avgUptime < 99 ? '#f59e0b' : '#10b981' }}>
          {avgUptime !== null ? `${avgUptime}%` : '—'}
        </span>
        <span className="metric-sub">Past 24 hours</span>
      </div>

      <div className="metric-card">
        <span className="metric-label">Avg Response Time</span>
        <span className="metric-value">
          {avgLatency > 0 ? `${avgLatency} ms` : '—'}
        </span>
        <span className="metric-sub">Mean across active</span>
      </div>
    </div>
  );
}
