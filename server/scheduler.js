import { getDueEndpoints, getEndpointById } from './db.js';
import { pingEndpoint } from './pingEngine.js';

let intervalId = null;
const inFlightChecks = new Set();

/**
 * Tick function that checks for any endpoints that need to be pinged
 */
async function schedulerTick() {
  try {
    const dueEndpoints = getDueEndpoints();
    if (!dueEndpoints || dueEndpoints.length === 0) return;

    for (const ep of dueEndpoints) {
      if (inFlightChecks.has(ep.id)) continue;

      inFlightChecks.add(ep.id);
      pingEndpoint(ep)
        .catch(err => {
          console.error(`[Scheduler] Error pinging endpoint ${ep.id} (${ep.name}):`, err.message);
        })
        .finally(() => {
          inFlightChecks.delete(ep.id);
        });
    }
  } catch (err) {
    console.error('[Scheduler Tick Error]:', err.message);
  }
}

/**
 * Start the background scheduler
 */
export function startScheduler(tickIntervalMs = 2000) {
  if (intervalId) return;
  console.log(`[Scheduler] Started (tick interval: ${tickIntervalMs}ms)`);
  // Run an immediate tick
  schedulerTick();
  intervalId = setInterval(schedulerTick, tickIntervalMs);
}

/**
 * Stop the background scheduler
 */
export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Perform a manual on-demand check for a specific endpoint
 */
export async function runManualCheck(endpointId) {
  const ep = getEndpointById(endpointId);
  if (!ep) {
    throw new Error(`Endpoint with ID ${endpointId} not found`);
  }

  inFlightChecks.add(ep.id);
  try {
    const checkResult = await pingEndpoint(ep);
    const updatedEp = getEndpointById(endpointId);
    return {
      check: checkResult,
      endpoint: updatedEp
    };
  } finally {
    inFlightChecks.delete(ep.id);
  }
}
