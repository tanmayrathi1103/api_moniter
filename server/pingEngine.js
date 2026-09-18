import { performance } from 'node:perf_hooks';
import { recordCheck } from './db.js';

/**
 * Execute an HTTP check for an endpoint, measure latency, and record result in SQLite.
 *
 * @param {Object} endpoint
 * @returns {Promise<Object>} check result
 */
export async function pingEndpoint(endpoint) {
  const timeoutMs = endpoint.timeout_ms || 10000;
  const method = (endpoint.method || 'GET').toUpperCase();
  const expectedStatus = Number(endpoint.expected_status) || 200;

  const startTime = performance.now();
  let statusCode = null;
  let responseTimeMs = 0;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint.url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'SEQA-API-Monitor/1.0 (+https://github.com/seqa/monitor)',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timeoutId);
    responseTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    statusCode = response.status;

    // Check if status matches expected status
    // Matches exact status or 2xx range if 200 expected
    const isExpected = (statusCode === expectedStatus) || 
      (expectedStatus === 200 && statusCode >= 200 && statusCode < 300);

    if (isExpected) {
      isSuccess = true;
    } else {
      isSuccess = false;
      errorMessage = `Status mismatch: expected ${expectedStatus}, got ${statusCode} ${response.statusText || ''}`.trim();
    }
  } catch (err) {
    responseTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    isSuccess = false;

    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
    } else if (err.cause?.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
      errorMessage = 'DNS failure: host not found';
    } else if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused by server';
    } else if (err.cause?.code === 'ECONNRESET' || err.message?.includes('ECONNRESET')) {
      errorMessage = 'Connection reset by peer';
    } else if (err.message?.includes('fetch failed')) {
      errorMessage = err.cause ? `${err.cause.message || err.cause.code || 'Network error'}` : 'Network fetch failed';
    } else {
      errorMessage = err.message || 'Unknown network error';
    }
  }

  const checkRecord = {
    endpoint_id: endpoint.id,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    is_success: isSuccess,
    error_message: errorMessage
  };

  try {
    recordCheck(checkRecord);
  } catch (dbErr) {
    console.error(`[DB Error recording check for endpoint ${endpoint.id}]:`, dbErr.message);
  }

  return {
    ...checkRecord,
    checked_at: new Date().toISOString()
  };
}
