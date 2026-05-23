import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
})

export const ingestText = (text, priority = 'MEDIUM') =>
  API.post('/api/ingest', { text, priority }).then(r => r.data)

export const nlQuery = (query, context = null) =>
  API.post('/api/query/nl', { query, context }).then(r => r.data)

export const getGridState = () =>
  API.get('/api/grid/state').then(r => r.data)

export const getWindVectors = (bounds = {}) =>
  API.get('/api/wind/vectors', { params: bounds }).then(r => r.data)

export const getMineralsOverlay = (mineral_type = null) =>
  API.get('/api/minerals/overlay', { params: mineral_type ? { mineral_type } : {} }).then(r => r.data)

export const getAgentTrace = (runId) =>
  API.get(`/api/agents/trace/${runId}`).then(r => r.data)

export const listAgentTraces = () =>
  API.get('/api/agents/traces').then(r => r.data)

export const getMockDispatchTickets = () =>
  API.get('/mock/dispatch').then(r => r.data)

export const getMockGridStates = () =>
  API.get('/mock/grid/states').then(r => r.data)

export default API
