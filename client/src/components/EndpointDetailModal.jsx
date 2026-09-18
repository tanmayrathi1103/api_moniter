import React, { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import Sparkline from './Sparkline.jsx';

export default function EndpointDetailModal({ endpoint, isOpen, onClose, onCheckNow }) {
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen || !endpoint) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await onCheckNow(endpoint.id);
    } finally {
      setIsChecking(false);
    }
  };

  const checks = endpoint.checks || [];
  // For sparkline, reverse checks so they appear chronologically from left to right
  const chronologicalChecks = [...checks].reverse();

  const methodClass = `method-${(endpoint.method || 'get').toLowerCase()}`;
  const latestCheck = checks[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`method-tag ${methodClass}`}>{endpoint.method}</span>
              <h2 className="modal-title" style={{ margin: 0 }}>{endpoint.name}</h2>
              <StatusBadge 
                status={endpoint.current_status} 
                statusCode={latestCheck?.status_code}
                lastError={latestCheck?.error_message}
              />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {endpoint.url}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleManualCheck}
              disabled={isChecking}
              title="Ping endpoint now"
            >
              <span className={isChecking ? 'spinning' : ''}>⚡</span>
              <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
            </button>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Key Metrics Strip (24h Uptime, Avg Latency, Min, Max) */}
          <div className="detail-stats-strip">
            <div className="detail-stat-box">
              <div className="num" style={{ color: endpoint.uptime_24h < 99 ? '#f59e0b' : '#10b981' }}>
                {endpoint.uptime_24h !== null ? `${endpoint.uptime_24h}%` : '—'}
              </div>
              <div className="lbl">24h Uptime</div>
            </div>

            <div className="detail-stat-box">
              <div className="num">
                {endpoint.avg_response_time !== null ? `${endpoint.avg_response_time} ms` : '—'}
              </div>
              <div className="lbl">Average Latency</div>
            </div>

            <div className="detail-stat-box">
              <div className="num" style={{ color: '#38bdf8' }}>
                {endpoint.min_response_time !== null ? `${endpoint.min_response_time} ms` : '—'}
              </div>
              <div className="lbl">Minimum Latency</div>
            </div>

            <div className="detail-stat-box">
              <div className="num" style={{ color: '#fb923c' }}>
                {endpoint.max_response_time !== null ? `${endpoint.max_response_time} ms` : '—'}
              </div>
              <div className="lbl">Maximum Latency</div>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="detail-sparkline-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Recent Response Time Trend</span>
              <span>{chronologicalChecks.length} samples</span>
            </div>
            <Sparkline data={chronologicalChecks} height={50} width={600} />
          </div>

          {/* Check Logs Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Check History ({checks.length} checks logged)
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Interval: every {endpoint.check_interval}s
              </span>
            </div>

            <div className="logs-table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {checks.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No check history recorded yet. Click "Check Now" above to initiate a health check.
                </div>
              ) : (
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Checked At</th>
                      <th style={{ width: '100px' }}>HTTP Status</th>
                      <th style={{ width: '110px' }}>Latency</th>
                      <th>Result / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map(check => {
                      const isSuccess = Boolean(check.is_success);
                      return (
                        <tr key={check.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            {new Date(check.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '10px' }}>
                              {new Date(check.checked_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            {check.status_code ? (
                              <span className={`status-code-pill ${isSuccess ? 'status-code-success' : 'status-code-fail'}`}>
                                {check.status_code}
                              </span>
                            ) : (
                              <span className="status-code-pill status-code-fail">
                                Failed
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {check.response_time_ms != null ? `${check.response_time_ms} ms` : '—'}
                          </td>
                          <td>
                            {isSuccess ? (
                              <span style={{ color: '#34d399', fontSize: '11px', fontWeight: 500 }}>
                                ✓ OK (matches expected status)
                              </span>
                            ) : (
                              <span style={{ color: '#f87171', fontSize: '11px' }}>
                                ✕ {check.error_message || 'Health check failed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
