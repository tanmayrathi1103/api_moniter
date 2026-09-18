import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import MetricsOverview from './components/MetricsOverview.jsx';
import EndpointCard from './components/EndpointCard.jsx';
import EndpointModal from './components/EndpointModal.jsx';
import EndpointDetailModal from './components/EndpointDetailModal.jsx';
import {
  fetchOverviewStats,
  fetchEndpoints,
  fetchEndpointById,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  checkEndpoint,
  seedSampleData
} from './api.js';

export default function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);

  const [detailEndpointId, setDetailEndpointId] = useState(null);
  const [detailEndpointData, setDetailEndpointData] = useState(null);

  // Load endpoints & stats
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const [eps, st] = await Promise.all([
        fetchEndpoints(),
        fetchOverviewStats()
      ]);
      setEndpoints(eps);
      setStats(st);

      // If detail modal is open, refresh its data too
      if (detailEndpointId) {
        try {
          const detail = await fetchEndpointById(detailEndpointId);
          setDetailEndpointData(detail);
        } catch {
          // ignore background detail refresh error
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (showRefreshing) setIsRefreshing(false);
    }
  }, [detailEndpointId]);

  // Initial load and periodic polling every 5s
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Trigger manual check
  const handleCheckNow = async (id) => {
    try {
      const result = await checkEndpoint(id);
      // Immediately refresh list & stats
      await loadData(false);
      // If currently viewing this endpoint in detail modal, update detail view
      if (detailEndpointId === id && result.endpoint) {
        setDetailEndpointData(result.endpoint);
      }
    } catch (err) {
      alert(`Error checking endpoint: ${err.message}`);
    }
  };

  // Open detail view
  const handleSelectEndpoint = async (id) => {
    setDetailEndpointId(id);
    try {
      const detail = await fetchEndpointById(id);
      setDetailEndpointData(detail);
    } catch (err) {
      alert(`Failed to load endpoint details: ${err.message}`);
      setDetailEndpointId(null);
    }
  };

  const handleCloseDetail = () => {
    setDetailEndpointId(null);
    setDetailEndpointData(null);
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingEndpoint(null);
    setIsAddEditOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (endpoint) => {
    setEditingEndpoint(endpoint);
    setIsAddEditOpen(true);
  };

  // Save endpoint (Add or Edit)
  const handleSaveEndpoint = async (data) => {
    if (editingEndpoint) {
      await updateEndpoint(editingEndpoint.id, data);
    } else {
      await createEndpoint(data);
    }
    await loadData(false);
  };

  // Delete endpoint
  const handleDeleteEndpoint = async (id, name) => {
    if (window.confirm(`Are you sure you want to stop monitoring and delete "${name}"?`)) {
      try {
        await deleteEndpoint(id);
        if (detailEndpointId === id) {
          handleCloseDetail();
        }
        await loadData(false);
      } catch (err) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  // Seed sample endpoints
  const handleSeedSample = async () => {
    try {
      setIsRefreshing(true);
      await seedSampleData(false);
      await loadData(false);
    } catch (err) {
      alert(`Failed to seed data: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter & search logic
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(ep => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'UP' && ep.current_status !== 'UP') return false;
        if (statusFilter === 'DOWN' && ep.current_status !== 'DOWN') return false;
        if (statusFilter === 'PAUSED' && ep.current_status !== 'PAUSED') return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = ep.name.toLowerCase().includes(query);
        const matchesUrl = ep.url.toLowerCase().includes(query);
        return matchesName || matchesUrl;
      }
      return true;
    });
  }, [endpoints, statusFilter, searchTerm]);

  return (
    <div className="app-container">
      <Navbar
        onOpenAddModal={handleOpenAddModal}
        onRefresh={() => loadData(true)}
        onSeed={handleSeedSample}
        isRefreshing={isRefreshing}
      />

      <main className="main-content">
        {/* Top Aggregate Metrics */}
        <MetricsOverview stats={stats} />

        {/* Search & Filter Controls Bar */}
        <div className="controls-bar">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or URL..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({endpoints.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'UP' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UP')}
            >
              Online ({endpoints.filter(e => e.current_status === 'UP').length})
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'DOWN' ? 'active' : ''}`}
              onClick={() => setStatusFilter('DOWN')}
            >
              Failing ({endpoints.filter(e => e.current_status === 'DOWN').length})
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'PAUSED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('PAUSED')}
            >
              Paused ({endpoints.filter(e => e.current_status === 'PAUSED').length})
            </button>
          </div>
        </div>

        {/* Endpoints Grid */}
        {filteredEndpoints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <h3 className="empty-title">
              {endpoints.length === 0 ? 'No monitored endpoints yet' : 'No matching endpoints found'}
            </h3>
            <p className="empty-desc">
              {endpoints.length === 0 
                ? 'Get started by adding your first HTTP endpoint to track its availability and latency in real-time, or load sample demo APIs.'
                : 'Try adjusting your search query or status filter to see more endpoints.'}
            </p>
            {endpoints.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleOpenAddModal}
                >
                  + Add First Endpoint
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleSeedSample}
                >
                  🌱 Load Sample APIs
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="endpoints-grid">
            {filteredEndpoints.map(endpoint => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                onCheckNow={handleCheckNow}
                onSelect={handleSelectEndpoint}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteEndpoint}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Endpoint Modal */}
      <EndpointModal
        endpoint={editingEndpoint}
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveEndpoint}
      />

      {/* Endpoint Detail View Modal */}
      <EndpointDetailModal
        endpoint={detailEndpointData}
        isOpen={Boolean(detailEndpointId)}
        onClose={handleCloseDetail}
        onCheckNow={handleCheckNow}
      />
    </div>
  );
}
