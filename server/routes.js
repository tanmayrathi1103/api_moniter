import { Router } from 'express';
import {
  getAllEndpoints,
  getEndpointById,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  getOverviewStats
} from './db.js';
import { pingEndpoint } from './pingEngine.js';
import { runManualCheck } from './scheduler.js';
import { seedDatabase } from './seedData.js';

const router = Router();

// GET /api/stats/overview - Overall system metrics
router.get('/stats/overview', (req, res) => {
  try {
    const stats = getOverviewStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endpoints - List all endpoints
router.get('/endpoints', (req, res) => {
  try {
    const endpoints = getAllEndpoints();
    res.json({ success: true, data: endpoints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/endpoints/:id - Get detailed endpoint info & logs
router.get('/endpoints/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const endpoint = getEndpointById(id);
    if (!endpoint) {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
    res.json({ success: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/endpoints - Create a new monitored endpoint
router.post('/endpoints', async (req, res) => {
  try {
    const { name, url, method = 'GET', expected_status = 200, check_interval = 30, timeout_ms = 10000, is_active = 1 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Basic URL validation
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, error: 'URL must use http or https protocol' });
      }
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    const newEndpoint = createEndpoint({
      name,
      url,
      method,
      expected_status,
      check_interval,
      timeout_ms,
      is_active
    });

    // Trigger an immediate initial ping in the background so it populates right away
    if (newEndpoint.is_active) {
      pingEndpoint(newEndpoint).catch(err => {
        console.error('[Initial Ping Error]:', err.message);
      });
    }

    res.status(201).json({ success: true, data: newEndpoint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/endpoints/:id - Update endpoint
router.put('/endpoints/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = getEndpointById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }

    const { name, url, method, expected_status, check_interval, timeout_ms, is_active } = req.body;

    if (url) {
      try {
        const parsed = new URL(url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ success: false, error: 'URL must use http or https protocol' });
        }
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid URL format' });
      }
    }

    const updated = updateEndpoint(id, {
      name,
      url,
      method,
      expected_status,
      check_interval,
      timeout_ms,
      is_active
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/endpoints/:id - Delete endpoint
router.delete('/endpoints/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const success = deleteEndpoint(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
    res.json({ success: true, message: 'Endpoint deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/endpoints/:id/check - Trigger an on-demand check
router.post('/endpoints/:id/check', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await runManualCheck(id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/seed - Seed sample endpoints
router.post('/seed', async (req, res) => {
  try {
    const force = Boolean(req.body.force);
    const result = await seedDatabase(force);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
