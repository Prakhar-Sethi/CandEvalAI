/**
 * EmotionDashboard
 *
 * Live emotion panel visible only to the interviewer.
 * Polls GET /sessions/{sessionId}/emotions every 3 seconds.
 *
 * Props:
 *   sessionId – UUID string
 *   isActive  – boolean (starts/stops polling)
 */
import { useState, useEffect, useRef } from 'react'
import { getLiveEmotions } from '../api'
import { EmotionChart } from './EmotionChart'

const POLL_INTERVAL_MS = 3000

const LABEL_COLOR = {
  confident: '#22c55e',
  neutral: '#60a5fa',
  stressed: '#f87171',
}

const LABEL_ICON = {
  confident: '💪',
  neutral: '😐',
  stressed: '😰',
}

// Average the last N raw emotion readings and pick the winning label
const SMOOTH_WINDOW = 5

function smoothedLatest(data) {
  if (data.length === 0) return null
  const window = data.slice(-SMOOTH_WINDOW)
  const emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
  const avg = {}
  emotions.forEach((e) => {
    avg[e] = window.reduce((s, r) => s + (r.raw_emotions?.[e] ?? 0), 0) / window.length
  })
  const MAP = {
    confident: [['happy', 1.8], ['surprise', 1.0]],
    neutral:   [['neutral', 0.7]],
    stressed:  [['angry', 1.6], ['fear', 1.4], ['sad', 1.1], ['disgust', 0.8]],
  }
  const total = Object.values(avg).reduce((s, v) => s + v, 0) || 1
  const norm = Object.fromEntries(Object.entries(avg).map(([k, v]) => [k, v / total]))
  const scores = {}
  Object.entries(MAP).forEach(([label, components]) => {
    scores[label] = components.reduce((s, [e, w]) => s + (norm[e] ?? 0) * w, 0)
  })
  const best = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  const bucketTotal = Object.values(scores).reduce((s, v) => s + v, 0) || 1
  return {
    ...data[data.length - 1],
    interview_label: best,
    confidence_score: Math.round((scores[best] / bucketTotal) * 100) / 100,
  }
}

export function EmotionDashboard({ sessionId, isActive }) {
  const [readings, setReadings] = useState([])
  const [latest, setLatest] = useState(null)
  const [stats, setStats] = useState(null)
  const timerRef = useRef(null)

  const fetchEmotions = async () => {
    try {
      const data = await getLiveEmotions(sessionId, 40)
      setReadings(data)
      if (data.length > 0) {
        setLatest(smoothedLatest(data))
        computeStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch emotions:', err)
    }
  }

  const computeStats = (data) => {
    const counts = { confident: 0, neutral: 0, stressed: 0 }
    data.forEach((r) => counts[r.interview_label]++)
    const total = data.length || 1
    const pct = Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 100)])
    )
    setStats(pct)
  }

  useEffect(() => {
    if (isActive && sessionId) {
      fetchEmotions()
      timerRef.current = setInterval(fetchEmotions, POLL_INTERVAL_MS)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isActive, sessionId])

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 16,
        padding: 20,
        border: '1px solid #1e293b',
        minWidth: 320,
        maxWidth: 480,
      }}
    >
      <h3 style={{ color: '#e2e8f0', marginTop: 0, fontSize: 15, fontWeight: 600 }}>
        Live Emotion Dashboard
      </h3>

      {/* Current emotion badge */}
      {latest ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            background: '#1e293b',
            borderRadius: 10,
            padding: '10px 16px',
          }}
        >
          <span style={{ fontSize: 28 }}>{LABEL_ICON[latest.interview_label]}</span>
          <div>
            <div
              style={{
                color: LABEL_COLOR[latest.interview_label],
                fontWeight: 700,
                fontSize: 18,
                textTransform: 'capitalize',
              }}
            >
              {latest.interview_label}
            </div>
            <div style={{ color: '#64748b', fontSize: 12 }}>
              Confidence: {Math.round(latest.confidence_score * 100)}%
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#475569', marginBottom: 16, fontSize: 13 }}>
          {isActive ? 'Waiting for first frame…' : 'Session not started'}
        </div>
      )}

      {/* Stat bars */}
      {stats && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stats).map(([label, pct]) => (
            <div key={label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: '#94a3b8',
                  marginBottom: 2,
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>
                  {LABEL_ICON[label]} {label}
                </span>
                <span>{pct}%</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: '#1e293b',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: LABEL_COLOR[label],
                    borderRadius: 3,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <EmotionChart readings={readings} />

      <p style={{ color: '#334155', fontSize: 11, textAlign: 'right', marginBottom: 0, marginTop: 8 }}>
        Refreshes every 3 s · {readings.length} frames analyzed
      </p>
    </div>
  )
}
