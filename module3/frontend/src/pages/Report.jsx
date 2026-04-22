import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSessionReport } from '../api'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

const EMOTION_COLORS = {
  confident: '#22c55e',
  neutral: '#94a3b8',
  stressed: '#f87171',
}

export default function Report() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('sessionId')

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('assessment')

  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      try {
        const data = await getSessionReport(sessionId)
        setReport(data)
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load report.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (!sessionId) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#f87171' }}>No session ID. <a href="/" style={{ color: '#818cf8' }}>Go home</a></p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: 16 }}>Generating your report…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#f87171' }}>{error}</p>
      </div>
    )
  }

  const {
    candidate_name, job_role, emotion_breakdown, emotion_percentages,
    dominant_label, average_confidence, timeline, ai_assessment, transcript,
    total_frames_analyzed,
  } = report

  const pieData = Object.entries(emotion_breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const timelineData = (timeline || []).map((t, i) => ({
    frame: i + 1,
    confidence: +(t.confidence * 100).toFixed(1),
  }))

  const transcriptMessages = (transcript || []).filter(m => !m.content.startsWith('[SYSTEM]'))

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1' }} />
            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>HCL Technologies</span>
          </div>
          <h1 style={styles.headerTitle}>Interview Report</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {candidate_name} &nbsp;&middot;&nbsp; {job_role || 'Software Engineer'}
          </p>
        </div>
        <button onClick={() => navigate('/')} style={styles.newBtn}>New Interview</button>
      </header>

      {/* Summary cards */}
      <div style={styles.cards}>
        <Card label="Dominant State" value={dominant_label ? dominant_label.charAt(0).toUpperCase() + dominant_label.slice(1) : 'N/A'} color={EMOTION_COLORS[dominant_label] || '#94a3b8'} sub="during interview" />
        <Card label="Avg Confidence" value={`${Math.round((average_confidence || 0) * 100)}%`} color="#6366f1" sub="facial analysis score" />
        <Card label="Frames Analyzed" value={total_frames_analyzed || 0} color="#f59e0b" sub="emotion readings captured" />
        <Card label="Confident Time" value={`${Math.round(emotion_percentages?.confident || 0)}%`} color="#22c55e" sub="of interview duration" />
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {['assessment', 'emotions', 'transcript'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              ...styles.tabBtn,
              color: activeTab === t ? '#818cf8' : '#64748b',
              background: activeTab === t ? 'rgba(99,102,241,0.12)' : 'transparent',
              borderBottom: `2px solid ${activeTab === t ? '#6366f1' : 'transparent'}`,
            }}
          >
            {t === 'assessment' ? 'AI Assessment' : t === 'emotions' ? 'Emotion Analysis' : 'Transcript'}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'assessment' && (
          <div style={styles.box}>
            {ai_assessment ? (
              <pre style={styles.assessmentText}>{ai_assessment}</pre>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>
                Assessment is still being generated. Please refresh in a moment.
              </p>
            )}
          </div>
        )}

        {activeTab === 'emotions' && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ ...styles.box, flex: 1 }}>
                <p style={styles.chartTitle}>Emotion Distribution</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map(entry => (
                          <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} frames`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#475569', textAlign: 'center', marginTop: 60 }}>No emotion data captured.</p>
                )}
              </div>
              <div style={{ ...styles.box, flex: 1 }}>
                <p style={styles.chartTitle}>Confidence Over Time</p>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                      <XAxis dataKey="frame" stroke="#475569" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={v => [`${v}%`, 'Confidence']} />
                      <Line type="monotone" dataKey="confidence" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#475569', textAlign: 'center', marginTop: 60 }}>No timeline data.</p>
                )}
              </div>
            </div>
            {pieData.length > 0 && (
              <div style={styles.box}>
                <p style={styles.chartTitle}>Emotion Breakdown (frames count)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pieData} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760, gap: 14 }}>
            {transcriptMessages.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>No transcript available.</p>
            ) : (
              transcriptMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: msg.role === 'user' ? '75%' : '90%',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'rgba(30,41,59,0.9)',
                    border: msg.role === 'assistant' ? '1px solid rgba(99,102,241,0.2)' : 'none',
                    borderRadius: 14,
                    padding: '12px 16px',
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, color: msg.role === 'user' ? '#c7d2fe' : '#818cf8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.role === 'user' ? candidate_name : 'AI Interviewer'}
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color, sub }) {
  return (
    <div style={{ flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: 14, padding: '18px 20px' }}>
      <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, margin: '0 0 2px' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{sub}</p>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#020617', fontFamily: "'Inter',-apple-system,sans-serif", color: '#e2e8f0', display: 'flex', flexDirection: 'column' },
  center: { minHeight: '100vh', background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',-apple-system,sans-serif", color: '#e2e8f0' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(51,65,85,0.5)' },
  headerTitle: { fontSize: 22, fontWeight: 700, margin: '0 0 4px', background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  newBtn: { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  cards: { display: 'flex', gap: 16, padding: '20px 32px' },
  tabBar: { display: 'flex', padding: '0 32px', borderBottom: '1px solid rgba(51,65,85,0.4)' },
  tabBtn: { padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', transition: 'color 0.2s' },
  content: { flex: 1, overflow: 'auto', padding: '24px 32px' },
  box: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 },
  assessmentText: { fontSize: 14, lineHeight: 1.8, color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' },
  chartTitle: { fontSize: 12, fontWeight: 600, color: '#94a3b8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 },
  spinner: { width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
