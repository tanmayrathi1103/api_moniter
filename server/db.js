import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const dbPath = path.join(__dirname, 'monitor.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    expected_status INTEGER NOT NULL DEFAULT 200,
    check_interval INTEGER NOT NULL DEFAULT 30, -- in seconds
    is_active INTEGER NOT NULL DEFAULT 1,
    timeout_ms INTEGER NOT NULL DEFAULT 10000,
    last_check_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS endpoint_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    status_code INTEGER,
    response_time_ms REAL,
    is_success INTEGER NOT NULL,
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_checks_endpoint_time 
    ON endpoint_checks(endpoint_id, checked_at DESC, id DESC);
`);

/**
 * Record a check result and enforce history retention (keep last 100 checks)
 */
export function recordCheck({ endpoint_id, status_code = null, response_time_ms = 0, is_success, error_message = null }) {
  const insertStmt = db.prepare(`
    INSERT INTO endpoint_checks (endpoint_id, status_code, response_time_ms, is_success, error_message, checked_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  insertStmt.run(endpoint_id, status_code, response_time_ms, is_success ? 1 : 0, error_message);

  // Update endpoint's last_check_at
  const updateEndpoint = db.prepare(`
    UPDATE endpoints 
    SET last_check_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  updateEndpoint.run(endpoint_id);

  // Retention cleanup: keep the latest 100 checks for this endpoint
  const pruneStmt = db.prepare(`
    DELETE FROM endpoint_checks 
    WHERE endpoint_id = ? AND id NOT IN (
      SELECT id FROM endpoint_checks 
      WHERE endpoint_id = ? 
      ORDER BY checked_at DESC, id DESC 
      LIMIT 100
    )
  `);
  pruneStmt.run(endpoint_id, endpoint_id);
}

/**
 * Fetch all endpoints with computed 24h metrics & recent checks for sparklines
 */
export function getAllEndpoints() {
  const endpoints = db.prepare(`
    SELECT * FROM endpoints ORDER BY created_at DESC
  `).all();

  const getLatestCheckStmt = db.prepare(`
    SELECT status_code, response_time_ms, is_success, error_message, checked_at 
    FROM endpoint_checks 
    WHERE endpoint_id = ? 
    ORDER BY checked_at DESC, id DESC 
    LIMIT 1
  `);

  const get24hStatsStmt = db.prepare(`
    SELECT 
      COUNT(*) AS total_checks,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful_checks,
      AVG(response_time_ms) AS avg_response_time,
      MIN(response_time_ms) AS min_response_time,
      MAX(response_time_ms) AS max_response_time
    FROM endpoint_checks 
    WHERE endpoint_id = ? AND checked_at >= datetime('now', '-24 hours')
  `);

  const getAllTimeStatsStmt = db.prepare(`
    SELECT 
      COUNT(*) AS total_checks,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful_checks,
      AVG(response_time_ms) AS avg_response_time,
      MIN(response_time_ms) AS min_response_time,
      MAX(response_time_ms) AS max_response_time
    FROM endpoint_checks 
    WHERE endpoint_id = ?
  `);

  const getRecentChecksStmt = db.prepare(`
    SELECT id, status_code, response_time_ms, is_success, checked_at 
    FROM endpoint_checks 
    WHERE endpoint_id = ? 
    ORDER BY checked_at DESC, id DESC 
    LIMIT 20
  `);

  return endpoints.map(ep => {
    const latestCheck = getLatestCheckStmt.get(ep.id);
    let stats = get24hStatsStmt.get(ep.id);
    
    // If no checks in last 24h, fall back to all-time stats
    if (!stats || stats.total_checks === 0) {
      stats = getAllTimeStatsStmt.get(ep.id);
    }

    const recentChecks = getRecentChecksStmt.all(ep.id).reverse(); // chronological for sparkline

    let current_status = 'PENDING';
    if (!ep.is_active) {
      current_status = 'PAUSED';
    } else if (latestCheck) {
      current_status = latestCheck.is_success === 1 ? 'UP' : 'DOWN';
    }

    const total = stats?.total_checks || 0;
    const successful = stats?.successful_checks || 0;
    const uptime_24h = total > 0 ? Math.round((successful / total) * 1000) / 10 : null;
    const avg_response_time = stats?.avg_response_time != null ? Math.round(stats.avg_response_time) : null;
    const min_response_time = stats?.min_response_time != null ? Math.round(stats.min_response_time) : null;
    const max_response_time = stats?.max_response_time != null ? Math.round(stats.max_response_time) : null;

    return {
      ...ep,
      is_active: Boolean(ep.is_active),
      current_status,
      last_check: latestCheck || null,
      uptime_24h,
      avg_response_time,
      min_response_time,
      max_response_time,
      total_checks: total,
      recent_checks: recentChecks
    };
  });
}

/**
 * Fetch a single endpoint with full stats and up to 100 check logs
 */
export function getEndpointById(id) {
  const ep = db.prepare(`SELECT * FROM endpoints WHERE id = ?`).get(id);
  if (!ep) return null;

  const checks = db.prepare(`
    SELECT id, status_code, response_time_ms, is_success, error_message, checked_at 
    FROM endpoint_checks 
    WHERE endpoint_id = ? 
    ORDER BY checked_at DESC, id DESC 
    LIMIT 100
  `).all(id);

  const stats24h = db.prepare(`
    SELECT 
      COUNT(*) AS total_checks,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful_checks,
      AVG(response_time_ms) AS avg_response_time,
      MIN(response_time_ms) AS min_response_time,
      MAX(response_time_ms) AS max_response_time
    FROM endpoint_checks 
    WHERE endpoint_id = ? AND checked_at >= datetime('now', '-24 hours')
  `).get(id);

  const allTimeStats = db.prepare(`
    SELECT 
      COUNT(*) AS total_checks,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful_checks,
      AVG(response_time_ms) AS avg_response_time,
      MIN(response_time_ms) AS min_response_time,
      MAX(response_time_ms) AS max_response_time
    FROM endpoint_checks 
    WHERE endpoint_id = ?
  `).get(id);

  const activeStats = (stats24h && stats24h.total_checks > 0) ? stats24h : allTimeStats;
  const total = activeStats?.total_checks || 0;
  const successful = activeStats?.successful_checks || 0;
  const uptime_24h = total > 0 ? Math.round((successful / total) * 1000) / 10 : null;

  const latestCheck = checks[0] || null;
  let current_status = 'PENDING';
  if (!ep.is_active) {
    current_status = 'PAUSED';
  } else if (latestCheck) {
    current_status = latestCheck.is_success === 1 ? 'UP' : 'DOWN';
  }

  return {
    ...ep,
    is_active: Boolean(ep.is_active),
    current_status,
    uptime_24h,
    avg_response_time: activeStats?.avg_response_time != null ? Math.round(activeStats.avg_response_time) : null,
    min_response_time: activeStats?.min_response_time != null ? Math.round(activeStats.min_response_time) : null,
    max_response_time: activeStats?.max_response_time != null ? Math.round(activeStats.max_response_time) : null,
    total_checks: allTimeStats?.total_checks || 0,
    checks: checks
  };
}

/**
 * Create endpoint
 */
export function createEndpoint({ name, url, method = 'GET', expected_status = 200, check_interval = 30, timeout_ms = 10000, is_active = 1 }) {
  const stmt = db.prepare(`
    INSERT INTO endpoints (name, url, method, expected_status, check_interval, timeout_ms, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name.trim(),
    url.trim(),
    (method || 'GET').toUpperCase(),
    Number(expected_status) || 200,
    Number(check_interval) || 30,
    Number(timeout_ms) || 10000,
    is_active ? 1 : 0
  );
  return getEndpointById(result.lastInsertRowid);
}

/**
 * Update endpoint
 */
export function updateEndpoint(id, fields) {
  const current = db.prepare(`SELECT * FROM endpoints WHERE id = ?`).get(id);
  if (!current) return null;

  const updatedName = fields.name !== undefined ? fields.name.trim() : current.name;
  const updatedUrl = fields.url !== undefined ? fields.url.trim() : current.url;
  const updatedMethod = fields.method !== undefined ? fields.method.toUpperCase() : current.method;
  const updatedExpectedStatus = fields.expected_status !== undefined ? Number(fields.expected_status) : current.expected_status;
  const updatedCheckInterval = fields.check_interval !== undefined ? Number(fields.check_interval) : current.check_interval;
  const updatedTimeoutMs = fields.timeout_ms !== undefined ? Number(fields.timeout_ms) : current.timeout_ms;
  const updatedIsActive = fields.is_active !== undefined ? (fields.is_active ? 1 : 0) : current.is_active;

  const stmt = db.prepare(`
    UPDATE endpoints 
    SET name = ?, url = ?, method = ?, expected_status = ?, check_interval = ?, timeout_ms = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(updatedName, updatedUrl, updatedMethod, updatedExpectedStatus, updatedCheckInterval, updatedTimeoutMs, updatedIsActive, id);
  return getEndpointById(id);
}

/**
 * Delete endpoint
 */
export function deleteEndpoint(id) {
  const stmt = db.prepare(`DELETE FROM endpoints WHERE id = ?`);
  const res = stmt.run(id);
  return res.changes > 0;
}

/**
 * Find active endpoints due for checking
 */
export function getDueEndpoints() {
  return db.prepare(`
    SELECT * FROM endpoints 
    WHERE is_active = 1 
      AND (
        last_check_at IS NULL 
        OR (strftime('%s', 'now') - strftime('%s', last_check_at)) >= check_interval
      )
  `).all();
}

/**
 * Overview statistics across all endpoints
 */
export function getOverviewStats() {
  const all = getAllEndpoints();
  const total = all.length;
  const active = all.filter(e => e.is_active).length;
  const up = all.filter(e => e.current_status === 'UP').length;
  const down = all.filter(e => e.current_status === 'DOWN').length;

  const endpointsWithUptime = all.filter(e => e.uptime_24h !== null);
  const avgUptime = endpointsWithUptime.length > 0 
    ? Math.round((endpointsWithUptime.reduce((acc, curr) => acc + curr.uptime_24h, 0) / endpointsWithUptime.length) * 10) / 10 
    : 100;

  const endpointsWithLatency = all.filter(e => e.avg_response_time !== null);
  const avgLatency = endpointsWithLatency.length > 0 
    ? Math.round(endpointsWithLatency.reduce((acc, curr) => acc + curr.avg_response_time, 0) / endpointsWithLatency.length) 
    : 0;

  return {
    total,
    active,
    up,
    down,
    avgUptime,
    avgLatency
  };
}
