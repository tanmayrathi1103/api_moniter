import React from 'react';

export default function StatusBadge({ status, statusCode, lastError }) {
  const normalizedStatus = (status || 'PENDING').toUpperCase();

  let badgeClass = 'pending';
  let label = 'Pending';

  if (normalizedStatus === 'UP') {
    badgeClass = 'up';
    label = statusCode ? `UP (${statusCode})` : 'UP';
  } else if (normalizedStatus === 'DOWN') {
    badgeClass = 'down';
    label = statusCode ? `DOWN (${statusCode})` : (lastError?.includes('DNS') ? 'DOWN (DNS)' : 'DOWN');
  } else if (normalizedStatus === 'PAUSED') {
    badgeClass = 'paused';
    label = 'PAUSED';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="badge-dot"></span>
      {label}
    </span>
  );
}
