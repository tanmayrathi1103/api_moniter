const BASE_URL = '/api';

export async function fetchOverviewStats() {
  const res = await fetch(`${BASE_URL}/stats/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview stats');
  const json = await res.json();
  return json.data;
}

export async function fetchEndpoints() {
  const res = await fetch(`${BASE_URL}/endpoints`);
  if (!res.ok) throw new Error('Failed to fetch endpoints');
  const json = await res.json();
  return json.data;
}

export async function fetchEndpointById(id) {
  const res = await fetch(`${BASE_URL}/endpoints/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch endpoint ${id}`);
  const json = await res.json();
  return json.data;
}

export async function createEndpoint(data) {
  const res = await fetch(`${BASE_URL}/endpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create endpoint');
  return json.data;
}

export async function updateEndpoint(id, data) {
  const res = await fetch(`${BASE_URL}/endpoints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update endpoint');
  return json.data;
}

export async function deleteEndpoint(id) {
  const res = await fetch(`${BASE_URL}/endpoints/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete endpoint');
  return json;
}

export async function checkEndpoint(id) {
  const res = await fetch(`${BASE_URL}/endpoints/${id}/check`, {
    method: 'POST'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to ping endpoint');
  return json.data;
}

export async function seedSampleData(force = false) {
  const res = await fetch(`${BASE_URL}/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to seed sample data');
  return json.data;
}
