import { db, createEndpoint } from './db.js';
import { pingEndpoint } from './pingEngine.js';

export const sampleEndpoints = [
  {
    name: 'GitHub API',
    url: 'https://api.github.com',
    method: 'GET',
    expected_status: 200,
    check_interval: 30,
    timeout_ms: 10000,
    is_active: 1
  },
  {
    name: 'JSONPlaceholder (Posts)',
    url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET',
    expected_status: 200,
    check_interval: 15,
    timeout_ms: 8000,
    is_active: 1
  },
  {
    name: 'HTTPBin Status 200',
    url: 'https://httpbin.org/status/200',
    method: 'GET',
    expected_status: 200,
    check_interval: 20,
    timeout_ms: 8000,
    is_active: 1
  },
  {
    name: 'HTTPBin Status 500 (Simulated Failure)',
    url: 'https://httpbin.org/status/500',
    method: 'GET',
    expected_status: 200,
    check_interval: 30,
    timeout_ms: 8000,
    is_active: 1
  },
  {
    name: 'DNS Failure Test (Invalid Host)',
    url: 'https://this-host-definitely-does-not-exist-test.xyz',
    method: 'GET',
    expected_status: 200,
    check_interval: 45,
    timeout_ms: 5000,
    is_active: 1
  }
];

/**
 * Seeds the database if empty or if force is specified
 */
export async function seedDatabase(force = false) {
  const count = db.prepare('SELECT COUNT(*) as count FROM endpoints').get().count;

  if (count > 0 && !force) {
    return { seeded: false, count };
  }

  if (force) {
    db.prepare('DELETE FROM endpoint_checks').run();
    db.prepare('DELETE FROM endpoints').run();
  }

  const created = [];
  for (const item of sampleEndpoints) {
    const ep = createEndpoint(item);
    created.push(ep);
    // Trigger an immediate initial ping for realistic demo
    try {
      await pingEndpoint(ep);
    } catch (e) {
      // ignore
    }
  }

  return { seeded: true, count: created.length, endpoints: created };
}
