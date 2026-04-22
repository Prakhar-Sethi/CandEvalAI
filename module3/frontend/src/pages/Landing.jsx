import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../api'

export default function Landing() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const session = await createSession(name.trim(), role.trim())
      navigate(`/interview?sessionId=${session.id}&greeting=${encodeURIComponent(session.greeting)}&name=${encodeURIComponent(name.trim())}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to start interview. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* HCL branding */}
        <div style={styles.brand}>
          <div style={styles.brandDot} />
          <span style={styles.brandText}>HCL Technologies</span>
        </div>

        <h1 style={styles.title}>AI Technical Interview</h1>
        <p style={styles.subtitle}>
          Your interview will be conducted by an AI interviewer. Make sure your webcam
          is connected — facial expressions are analyzed throughout the session.
        </p>

        <form onSubmit={handleStart} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Your Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Arjun Sharma"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Job Role Applying For</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Senior React Developer"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading || !name.trim()} style={{
            ...styles.btn,
            opacity: loading || !name.trim() ? 0.5 : 1,
            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Starting Interview…' : 'Begin Interview'}
          </button>
        </form>

        <div style={styles.tips}>
          <p style={styles.tipsTitle}>Before you begin</p>
          <ul style={styles.tipsList}>
            <li>Allow camera access when prompted</li>
            <li>Ensure good lighting on your face</li>
            <li>Find a quiet environment</li>
            <li>The AI will ask ~6 technical questions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a0f1e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#e2e8f0',
    padding: 20,
  },
  card: {
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: 20,
    padding: '40px 44px',
    width: '100%',
    maxWidth: 460,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#6366f1',
    boxShadow: '0 0 8px #6366f1',
  },
  brandText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: '0 0 8px',
    background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
  },
  input: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(51, 65, 85, 0.8)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    margin: 0,
    padding: '8px 12px',
    background: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 8,
    border: '1px solid rgba(248, 113, 113, 0.2)',
  },
  btn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '13px',
    fontWeight: 600,
    fontSize: 15,
    marginTop: 4,
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
  },
  tips: {
    marginTop: 28,
    padding: '16px',
    background: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 10,
    border: '1px solid rgba(99, 102, 241, 0.1)',
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#818cf8',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipsList: {
    margin: 0,
    padding: '0 0 0 16px',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.8,
  },
}
