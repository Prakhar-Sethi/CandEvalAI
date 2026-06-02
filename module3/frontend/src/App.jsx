import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import InterviewerView from './pages/InterviewerView'
import CandidateView from './pages/CandidateView'
import { useState } from 'react'
import { createSession } from './api'

function LandingPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    candidateId: '',
    interviewerId: '',
    jobRole: '',
    participantRole: 'interviewer',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const session = await createSession({
        candidate_id: form.candidateId,
        interviewer_id: form.interviewerId,
        job_role: form.jobRole || undefined,
      })
      const path =
        form.participantRole === 'interviewer'
          ? `/interviewer?sessionId=${session.id}&name=${encodeURIComponent(form.name)}`
          : `/candidate?sessionId=${session.id}&name=${encodeURIComponent(form.name)}`
      navigate(path)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 20,
          padding: 40,
          width: '100%',
          maxWidth: 440,
        }}
      >
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>HCL Interview Platform</h1>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 28 }}>Module 3 — Technical Interview</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Candidate ID" value={form.candidateId} onChange={(v) => setForm({ ...form, candidateId: v })} required />
          <Field label="Interviewer ID" value={form.interviewerId} onChange={(v) => setForm({ ...form, interviewerId: v })} required />
          <Field label="Job Role (optional)" value={form.jobRole} onChange={(v) => setForm({ ...form, jobRole: v })} />
          <Field label="Your Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />

          <div>
            <label style={LABEL}>Join as</label>
            <select
              value={form.participantRole}
              onChange={(e) => setForm({ ...form, participantRole: e.target.value })}
              style={INPUT}
            >
              <option value="interviewer">Interviewer</option>
              <option value="candidate">Candidate</option>
            </select>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating room…' : 'Start Interview Session'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={INPUT}
      />
    </div>
  )
}

const LABEL = { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }
const INPUT = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#e2e8f0',
  fontSize: 14,
  boxSizing: 'border-box',
}
const BTN = {
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 15,
  marginTop: 6,
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interviewer" element={<InterviewerView />} />
        <Route path="/candidate" element={<CandidateView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
