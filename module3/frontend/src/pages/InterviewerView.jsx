/**
 * InterviewerView
 * Route: /interviewer?sessionId=<uuid>&name=<string>
 *
 * - Joins the LiveKit room as owner
 * - Shows candidate URL so interviewer can share it
 * - Does NOT upload frames (only candidate side does that)
 * - Shows live emotion dashboard fed by candidate's frame uploads
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveKit } from '../hooks/useLiveKit'
import { VideoCall } from '../components/VideoCall'
import { EmotionDashboard } from '../components/EmotionDashboard'
import { getMeetingToken, updateSession, getSession } from '../api'

export default function InterviewerView() {
  const [params] = useSearchParams()
  const sessionId = params.get('sessionId')
  const name = params.get('name') || 'Interviewer'

  const {
    joinCall, leaveCall, callState, error,
    localVideoRef, localVideoTrack, remoteVideoTracks, remoteParticipants,
  } = useLiveKit()

  const [joined, setJoined] = useState(false)
  const [sessionInfo, setSessionInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionId) getSession(sessionId).then(setSessionInfo).catch(console.error)
  }, [sessionId])

  useEffect(() => {
    if (callState === 'joined' && !joined) {
      setJoined(true)
      updateSession(sessionId, { status: 'active' }).catch(console.error)
    }
  }, [callState, joined, sessionId])

  const candidateUrl = sessionId
    ? `${window.location.origin}/candidate?sessionId=${sessionId}&name=${encodeURIComponent(sessionInfo?.candidate_id || 'Candidate')}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(candidateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoin = async () => {
    try {
      const tokenData = await getMeetingToken(sessionId, 'interviewer', name)
      await joinCall(tokenData.room_url, tokenData.token)
    } catch (err) {
      console.error('Join failed:', err)
    }
  }

  const handleLeave = async () => {
    await leaveCall()
    await updateSession(sessionId, { status: 'completed' }).catch(console.error)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <header style={{ marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          HCL Interview — <span style={{ color: '#818cf8' }}>Interviewer</span>
        </h1>
        {sessionInfo && (
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
            Candidate: <span style={{ color: '#94a3b8' }}>{sessionInfo.candidate_id}</span>
            {sessionInfo.job_role && <> · Role: <span style={{ color: '#94a3b8' }}>{sessionInfo.job_role}</span></>}
          </p>
        )}
      </header>

      {/* Candidate link box — always visible */}
      {candidateUrl && (
        <div style={{
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>Candidate URL:</span>
          <span style={{
            color: '#94a3b8', fontSize: 12, fontFamily: 'monospace',
            flex: 1, wordBreak: 'break-all',
          }}>
            {candidateUrl}
          </span>
          <button onClick={handleCopy} style={{
            background: copied ? '#16a34a' : '#1e293b',
            color: '#e2e8f0', border: '1px solid #334155',
            borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            transition: 'background 0.2s',
          }}>
            {copied ? '✓ Copied' : 'Copy Link'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left: Video */}
        <div style={{ flex: '1 1 400px' }}>
          <VideoCall
            localVideoRef={localVideoRef}
            localVideoTrack={localVideoTrack}
            remoteVideoTracks={remoteVideoTracks}
            onFrame={null}
            callState={callState}
            latestEmotion={null}
          />
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            {callState !== 'joined' && callState !== 'joining' && (
              <button onClick={handleJoin} style={BTN_PRIMARY}>
                Join Interview Room
              </button>
            )}
            {(callState === 'joined' || callState === 'joining') && (
              <button onClick={handleLeave} style={BTN_DANGER}>
                End Interview
              </button>
            )}
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>

        {/* Right: Emotion Dashboard */}
        <div style={{ flex: '1 1 320px' }}>
          <EmotionDashboard sessionId={sessionId} isActive={callState === 'joined'} />
        </div>
      </div>
    </div>
  )
}

const BTN_PRIMARY = {
  background: '#6366f1', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 22px', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
}
const BTN_DANGER = {
  background: '#dc2626', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 22px', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
}
