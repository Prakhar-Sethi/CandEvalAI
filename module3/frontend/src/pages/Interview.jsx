import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { sendMessage, uploadFrame } from '../api'

const EMOTION_COLORS = {
  confident: '#22c55e',
  neutral: '#94a3b8',
  stressed: '#f87171',
}

const EMOTION_LABELS = {
  confident: 'Confident',
  neutral: 'Neutral',
  stressed: 'Stressed',
}

export default function Interview() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const sessionId = params.get('sessionId')
  const greeting = decodeURIComponent(params.get('greeting') || '')
  const candidateName = params.get('name') || 'Candidate'

  const [messages, setMessages] = useState([
    { role: 'assistant', content: greeting }
  ])
  const [input, setInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [questionCount, setQuestionCount] = useState(1)

  const [currentEmotion, setCurrentEmotion] = useState({ label: 'neutral', confidence: 0.5 })
  const [emotionHistory, setEmotionHistory] = useState([])
  const frameIndexRef = useRef(0)

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const transcriptRef = useRef(null)
  const emotionIntervalRef = useRef(null)

  // Webcam setup
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(err => console.warn('Webcam unavailable:', err))
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // Speak AI message
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  // Speak greeting on mount
  useEffect(() => {
    if (greeting) speak(greeting)
  }, []) // eslint-disable-line

  // Emotion frame capture every 3 seconds
  const captureAndUploadFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !sessionId) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video.readyState < 2) return
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, 320, 240)
    const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
    try {
      const result = await uploadFrame(sessionId, b64, frameIndexRef.current++, new Date().toISOString())
      setCurrentEmotion({ label: result.interview_label, confidence: result.confidence_score })
      setEmotionHistory(prev => [...prev.slice(-29), {
        label: result.interview_label,
        confidence: result.confidence_score,
        t: frameIndexRef.current,
      }])
    } catch (_) {}
  }, [sessionId])

  useEffect(() => {
    if (isComplete) return
    emotionIntervalRef.current = setInterval(captureAndUploadFrame, 3000)
    return () => clearInterval(emotionIntervalRef.current)
  }, [captureAndUploadFrame, isComplete])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, aiTyping])

  // Send candidate message to AI
  const handleSend = async (text) => {
    const content = (text || input).trim()
    if (!content || aiTyping || isComplete) return
    setMessages(prev => [...prev, { role: 'user', content }])
    setInput('')
    setAiTyping(true)
    try {
      const result = await sendMessage(sessionId, content)
      setMessages(prev => [...prev, { role: 'assistant', content: result.ai_message }])
      setQuestionCount(result.question_count)
      setIsComplete(result.is_complete)
      speak(result.ai_message)
      if (result.is_complete) {
        clearInterval(emotionIntervalRef.current)
        setTimeout(() => navigate(`/report?sessionId=${sessionId}`), 8000)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: 'Network error. Please try again.' }])
    } finally {
      setAiTyping(false)
    }
  }

  // Voice recognition
  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition requires Chrome.'); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognitionRef.current = recognition
    recognition.onresult = (e) => { setIsListening(false); handleSend(e.results[0][0].transcript) }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }

  if (!sessionId) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#f87171' }}>
          No session found. <a href="/" style={{ color: '#818cf8' }}>Go back</a>
        </p>
      </div>
    )
  }

  const emotionColor = EMOTION_COLORS[currentEmotion.label] || '#94a3b8'

  return (
    <div style={styles.page}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isComplete ? '#f59e0b' : '#22c55e', boxShadow: isComplete ? '0 0 6px #f59e0b' : '0 0 6px #22c55e' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>
            {isComplete ? 'Interview Complete' : `Question ${questionCount} / 6`}
          </span>
        </div>
        <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 500 }}>{candidateName}</span>
      </header>

      {/* Main layout */}
      <div style={styles.main}>
        {/* Left: webcam + emotions */}
        <div style={styles.leftPanel}>
          <div style={styles.videoWrap}>
            <video ref={videoRef} autoPlay muted playsInline style={styles.video} />
            <div style={{ ...styles.emotionBadge, borderColor: emotionColor }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: emotionColor }} />
              <span style={{ color: emotionColor, fontWeight: 600, fontSize: 13 }}>
                {EMOTION_LABELS[currentEmotion.label] || 'Analyzing'}
              </span>
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {Math.round(currentEmotion.confidence * 100)}%
              </span>
            </div>
            {isSpeaking && (
              <div style={styles.speakingBadge}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 3, height: 14, background: '#fff', borderRadius: 2, animation: `wave 0.8s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
                <span style={{ fontSize: 12 }}>AI Speaking</span>
              </div>
            )}
          </div>

          {/* Emotion timeline bars */}
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
              Emotion Timeline
            </p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, minHeight: 80 }}>
              {emotionHistory.length === 0 ? (
                <span style={{ color: '#334155', fontSize: 12 }}>Camera analyzing…</span>
              ) : (
                emotionHistory.map((e, i) => (
                  <div
                    key={i}
                    title={`${EMOTION_LABELS[e.label]} ${Math.round(e.confidence * 100)}%`}
                    style={{
                      flex: 1,
                      background: EMOTION_COLORS[e.label],
                      height: `${Math.max(15, e.confidence * 100)}%`,
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.5 + (i / emotionHistory.length) * 0.5,
                      transition: 'height 0.3s',
                    }}
                  />
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {Object.entries(EMOTION_COLORS).map(([k, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                  {EMOTION_LABELS[k]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI interviewer + conversation */}
        <div style={styles.rightPanel}>
          {/* AI header */}
          <div style={styles.aiHeader}>
            <div style={styles.aiAvatar}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#818cf8" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#818cf8" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>HCL AI Interviewer</p>
              <p style={{ fontSize: 12, color: '#6366f1', margin: '2px 0 0' }}>
                {aiTyping ? 'Thinking…' : isSpeaking ? 'Speaking…' : 'Listening'}
              </p>
            </div>
            {aiTyping && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div ref={transcriptRef} style={styles.transcript}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '75%' : '90%',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : msg.role === 'system'
                    ? 'rgba(248,113,113,0.15)'
                    : 'rgba(30,41,59,0.9)',
                border: msg.role === 'assistant' ? '1px solid rgba(99,102,241,0.2)' : 'none',
                borderRadius: 14,
                padding: '12px 16px',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: msg.role === 'user' ? '#c7d2fe' : '#818cf8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.role === 'user' ? candidateName : msg.role === 'assistant' ? 'AI Interviewer' : 'System'}
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              </div>
            ))}
            {aiTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '16px' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {!isComplete ? (
            <div style={styles.inputArea}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type your answer… (Enter to send)"
                disabled={aiTyping}
                style={styles.textarea}
                rows={3}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={toggleListening}
                  disabled={aiTyping}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    border: `1px solid ${isListening ? '#f87171' : 'rgba(99,102,241,0.4)'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: isListening ? 'rgba(248,113,113,0.2)' : 'rgba(99,102,241,0.15)',
                    color: isListening ? '#f87171' : '#818cf8',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isListening
                      ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
                      : <>
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </>
                    }
                  </svg>
                  {isListening ? 'Stop' : 'Speak'}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || aiTyping}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 20px', fontWeight: 600, fontSize: 14,
                    cursor: !input.trim() || aiTyping ? 'not-allowed' : 'pointer',
                    opacity: !input.trim() || aiTyping ? 0.4 : 1,
                  }}
                >
                  Send Answer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px 20px', background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(51,65,85,0.4)', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', margin: '0 0 8px' }}>Interview Complete</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
                Thank you, {candidateName}! Redirecting to your report…
              </p>
              <button
                onClick={() => navigate(`/report?sessionId=${sessionId}`)}
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                View Report Now
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
      `}</style>
    </div>
  )
}

const styles = {
  page: {
    height: '100vh', background: '#020617', display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',-apple-system,sans-serif", color: '#e2e8f0', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(15,23,42,0.95)',
    borderBottom: '1px solid rgba(51,65,85,0.5)',
    flexShrink: 0,
  },
  main: { display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 },
  leftPanel: {
    width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
    background: 'rgba(10,15,30,0.8)',
    borderRight: '1px solid rgba(51,65,85,0.4)',
  },
  videoWrap: { position: 'relative', background: '#000', aspectRatio: '4/3', flexShrink: 0 },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' },
  emotionBadge: {
    position: 'absolute', bottom: 10, left: 10,
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(0,0,0,0.75)', border: '1px solid', borderRadius: 20, padding: '4px 10px',
  },
  speakingBadge: {
    position: 'absolute', top: 10, right: 10,
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(99,102,241,0.9)', borderRadius: 20, padding: '4px 10px', color: '#fff',
  },
  rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  aiHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 20px',
    background: 'rgba(15,23,42,0.8)',
    borderBottom: '1px solid rgba(51,65,85,0.4)',
    flexShrink: 0,
  },
  aiAvatar: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))',
    border: '1px solid rgba(99,102,241,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  transcript: {
    flex: 1, overflowY: 'auto', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  inputArea: {
    padding: '16px 20px',
    background: 'rgba(15,23,42,0.8)',
    borderTop: '1px solid rgba(51,65,85,0.4)',
    flexShrink: 0,
  },
  textarea: {
    width: '100%', background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(51,65,85,0.8)', borderRadius: 10,
    padding: '10px 14px', color: '#e2e8f0', fontSize: 14,
    resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
  },
}
