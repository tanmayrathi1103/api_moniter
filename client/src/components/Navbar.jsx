import React from 'react';

export default function Navbar({ onOpenAddModal, onRefresh, onSeed, isRefreshing }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-logo">▲</div>
          <div>
            <h1 className="brand-title">API Monitor</h1>
            <div className="brand-subtitle">Endpoint Uptime & Performance</div>
          </div>
        </div>

        <div className="header-actions">
          {/* Pulsing Live indicator */}
          <div className="live-indicator" title="Dashboard auto-refreshes every 5 seconds">
            <span className="pulse-dot"></span>
            <span>Live</span>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard data now"
          >
            <span className={isRefreshing ? 'spinning' : ''}>↻</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onSeed}
            title="Populate test endpoints (healthy, failing, DNS error)"
          >
            <span>🌱</span>
            <span>Seed APIs</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onOpenAddModal}
          >
            <span>+</span>
            <span>Add Endpoint</span>
          </button>
        </div>
      </div>
    </header>
  );
}
