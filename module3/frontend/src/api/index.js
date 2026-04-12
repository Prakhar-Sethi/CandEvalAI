import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Sessions ─────────────────────────────────────────────────────────────────

export const createSession = (payload) =>
  api.post('/sessions', payload).then((r) => r.data)

export const getSession = (sessionId) =>
  api.get(`/sessions/${sessionId}`).then((r) => r.data)

export const updateSession = (sessionId, payload) =>
  api.patch(`/sessions/${sessionId}`, payload).then((r) => r.data)

export const cancelSession = (sessionId) =>
  api.delete(`/sessions/${sessionId}`)

// ── Tokens ───────────────────────────────────────────────────────────────────

export const getMeetingToken = (sessionId, participantRole, participantName) =>
  api
    .post(`/sessions/${sessionId}/token`, { session_id: sessionId, participant_role: participantRole, participant_name: participantName })
    .then((r) => r.data)

// ── Frames / Emotions ─────────────────────────────────────────────────────────

export const uploadFrame = (sessionId, frameB64, frameIndex, capturedAt) =>
  api
    .post(`/sessions/${sessionId}/frames`, {
      frame_b64: frameB64,
      frame_index: frameIndex,
      captured_at: capturedAt,
    })
    .then((r) => r.data)

export const getLiveEmotions = (sessionId, limit = 20) =>
  api.get(`/sessions/${sessionId}/emotions`, { params: { limit } }).then((r) => r.data)

// ── Report ────────────────────────────────────────────────────────────────────

export const getSessionReport = (sessionId) =>
  api.get(`/sessions/${sessionId}/report`).then((r) => r.data)
