import React, { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import Sparkline from './Sparkline.jsx';

export default function EndpointCard({ endpoint, onCheckNow, onSelect, onEdit, onDelete }) {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckClick = async (e) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await onCheckNow(endpoint.id);
    } finally {
      setIsChecking(false);
    }
  };

  const methodClass = `method-${(endpoint.method || 'get').toLowerCase()}`;
  const latestCheck = endpoint.last_check;

  return (
    <div className="endpoint-card">
      <div>
        {/* Card Header */}
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-name" title={endpoint.name}>{endpoint.name}</h3>
            <div className="url-row">
              <span className={`method-tag ${methodClass}`}>{endpoint.method}</span>
              <span className="card-url-text" title={endpoint.url}>{endpoint.url}</span>
            </div>
          </div>
          <StatusBadge 
            status={endpoint.current_status} 
            statusCode={latestCheck?.status_code}
            lastError={latestCheck?.error_message}
          />
        </div>

        {/* Card Stats */}
        <div className="card-stats">
          <div className="stat-item">
            <span className="stat-label">24h Uptime</span>
            <span className="stat-value">
              {endpoint.uptime_24h !== null ? `${endpoint.uptime_24h}%` : '—'}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Avg Latency</span>
            <span className="stat-value">
              {endpoint.avg_response_time !== null ? `${endpoint.avg_response_time} ms` : '—'}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Interval</span>
            <span className="stat-value">
              {endpoint.check_interval}s
            </span>
          </div>
        </div>

        {/* Recent checks sparkline */}
        <div className="sparkline-section">
          <div className="sparkline-header">
            <span>Recent Response Times</span>
            <span>
              {latestCheck?.response_time_ms != null 
                ? `Last: ${latestCheck.response_time_ms} ms` 
                : 'No pings yet'}
            </span>
          </div>
          <Sparkline data={endpoint.recent_checks || []} height={38} width={280} />
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="card-footer">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCheckClick}
          disabled={isChecking}
          title="Trigger immediate health check"
        >
          <span className={isChecking ? 'spinning' : ''}>⚡</span>
          <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
        </button>

        <div className="card-footer-right">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSelect(endpoint.id)}
            title="View full latency logs"
          >
            Details
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(endpoint)}
            title="Edit configuration"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(endpoint.id, endpoint.name)}
            title="Delete endpoint"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
