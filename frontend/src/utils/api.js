const API_BASE = 'http://192.168.1.84:3001'

export async function createBatch(data) {
  const response = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to create batch')
  return response.json()
}

export async function getBatch(batchId) {
  const response = await fetch(`${API_BASE}/batch/${batchId}`)
  if (!response.ok) throw new Error('Failed to fetch batch')
  return response.json()
}

export async function getAllBatches() {
  const response = await fetch(`${API_BASE}/batches`)
  if (!response.ok) throw new Error('Failed to fetch batches')
  return response.json()
}

export async function logScan(data) {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to log scan')
  return response.json()
}

export async function getCheckpoints() {
  const response = await fetch(`${API_BASE}/checkpoints`)
  if (!response.ok) throw new Error('Failed to fetch checkpoints')
  return response.json()
}

export async function createTablets(batchId, count = 1) {
  const response = await fetch(`${API_BASE}/tablet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, count })
  })
  if (!response.ok) throw new Error('Failed to create tablets')
  return response.json()
}

export async function getTablet(tabletId) {
  const response = await fetch(`${API_BASE}/tablet/${tabletId}`)
  if (!response.ok) throw new Error('Failed to fetch tablet')
  return response.json()
}

