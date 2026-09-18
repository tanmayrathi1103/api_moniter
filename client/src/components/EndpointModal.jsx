import React, { useState, useEffect } from 'react';

export default function EndpointModal({ endpoint, isOpen, onClose, onSave }) {
  const isEditing = Boolean(endpoint?.id);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    expected_status: 200,
    check_interval: 30,
    timeout_ms: 10000,
    is_active: true
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (endpoint) {
      setFormData({
        name: endpoint.name || '',
        url: endpoint.url || '',
        method: endpoint.method || 'GET',
        expected_status: endpoint.expected_status || 200,
        check_interval: endpoint.check_interval || 30,
        timeout_ms: endpoint.timeout_ms || 10000,
        is_active: endpoint.is_active !== undefined ? endpoint.is_active : true
      });
    } else {
      setFormData({
        name: '',
        url: '',
        method: 'GET',
        expected_status: 200,
        check_interval: 30,
        timeout_ms: 10000,
        is_active: true
      });
    }
    setError(null);
  }, [endpoint, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Please provide a descriptive name for the endpoint.');
      return;
    }

    if (!formData.url.trim()) {
      setError('Endpoint URL is required.');
      return;
    }

    try {
      const parsed = new URL(formData.url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('URL must begin with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid URL (e.g., https://api.example.com/health)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        expected_status: Number(formData.expected_status),
        check_interval: Number(formData.check_interval),
        timeout_ms: Number(formData.timeout_ms)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save endpoint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? `Edit ${endpoint.name}` : 'Add New Endpoint'}
          </h2>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="ep-name">Friendly Name</label>
              <input
                id="ep-name"
                name="name"
                type="text"
                className="form-input"
                placeholder="e.g. GitHub API, Stripe Webhook"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ep-url">URL</label>
              <input
                id="ep-url"
                name="url"
                type="url"
                className="form-input"
                placeholder="https://api.example.com/v1/health"
                value={formData.url}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ep-method">HTTP Method</label>
                <select
                  id="ep-method"
                  name="method"
                  className="form-select"
                  value={formData.method}
                  onChange={handleChange}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ep-status">Expected Status</label>
                <input
                  id="ep-status"
                  name="expected_status"
                  type="number"
                  className="form-input"
                  value={formData.expected_status}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ep-interval">Check Interval</label>
                <select
                  id="ep-interval"
                  name="check_interval"
                  className="form-select"
                  value={formData.check_interval}
                  onChange={handleChange}
                >
                  <option value="10">Every 10 seconds</option>
                  <option value="15">Every 15 seconds</option>
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every 1 minute</option>
                  <option value="300">Every 5 minutes</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ep-timeout">Timeout (ms)</label>
                <input
                  id="ep-timeout"
                  name="timeout_ms"
                  type="number"
                  step="500"
                  className="form-input"
                  value={formData.timeout_ms}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <span>Active (enable background periodic health checks)</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Endpoint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
