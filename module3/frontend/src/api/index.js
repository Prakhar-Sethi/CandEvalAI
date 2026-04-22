import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Sessions ─────────────────────────────────────────────────────────────────

export const createSession = (candidateName, jobRole) =>
  api.post('/sessions', { candidate_name: candidateName, job_role: jobRole || null })
    .then(r => r.data)

export const getSession = (sessionId) =>
  api.get(`/sessions/${sessionId}`).then(r => r.data)

// ── Interview conversation ────────────────────────────────────────────────────

export const sendMessage = (sessionId, content) =>
  api.post(`/sessions/${sessionId}/message`, { content }).then(r => r.data)

// ── Emotion frames ────────────────────────────────────────────────────────────

export const uploadFrame = (sessionId, frameB64, frameIndex, capturedAt) =>
  api.post(`/sessions/${sessionId}/frames`, {
    frame_b64: frameB64,
    frame_index: frameIndex,
    captured_at: capturedAt,
  }).then(r => r.data)

export const getLiveEmotions = (sessionId, limit = 20) =>
  api.get(`/sessions/${sessionId}/emotions`, { params: { limit } }).then(r => r.data)

// ── Report ─────────────────────────────────────────────────────────────────────

export const getSessionReport = (sessionId) =>
  api.get(`/sessions/${sessionId}/report`).then(r => r.data)
