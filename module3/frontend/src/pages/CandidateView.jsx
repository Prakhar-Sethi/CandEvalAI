/**
 * CandidateView
 * Route: /candidate?sessionId=<uuid>&name=<string>
 *
 * - Joins the LiveKit room as candidate
 * - Captures frames every 3s and uploads to backend for emotion analysis
 * - Does NOT show emotion results to the candidate
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveKit } from '../hooks/useLiveKit'
import { VideoCall } from '../components/VideoCall'
import { getMeetingToken, uploadFrame, getSession } from '../api'

export default function CandidateView() {
  const [params] = useSearchParams()
  const sessionId = params.get('sessionId')
  const name = params.get('name') || 'Candidate'

  const {
    joinCall, leaveCall, callState, error,
    localVideoRef, localVideoTrack, remoteVideoTracks,
  } = useLiveKit()

  const [frameCount, setFrameCount] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)

  useEffect(() => {
    if (sessionId) getSession(sessionId).then(setSessionInfo).catch(console.error)
  }, [sessionId])

  const handleJoin = async () => {
    try {
      const tokenData = await getMeetingToken(sessionId, 'candidate', name)
      await joinCall(tokenData.room_url, tokenData.token)
    } catch (err) {
      console.error('Join failed:', err)
    }
  }

  const handleLeave = async () => {
    await leaveCall()
  }

  // Frame capture callback — uploads candidate's face for emotion analysis
  const handleFrame = async (base64, frameIndex) => {
    try {
      await uploadFrame(sessionId, base64, frameIndex, new Date().toISOString())
      setFrameCount((n) => n + 1)
    } catch (err) {
      console.error('Frame upload error:', err)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#020617', color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif', padding: 24,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <header style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          HCL Interview — <span style={{ color: '#34d399' }}>Candidate</span>
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
          Welcome, {name}
          {sessionInfo?.job_role && <> · Role: {sessionInfo.job_role}</>}
        </p>
      </header>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <VideoCall
          localVideoRef={localVideoRef}
          localVideoTrack={localVideoTrack}
          remoteVideoTracks={remoteVideoTracks}
          onFrame={handleFrame}
          callState={callState}
          latestEmotion={null}
        />

        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {callState !== 'joined' && callState !== 'joining' && (
            <button onClick={handleJoin} style={BTN_PRIMARY}>Join Interview</button>
          )}
          {(callState === 'joined' || callState === 'joining') && (
            <button onClick={handleLeave} style={BTN_SECONDARY}>Leave</button>
          )}
        </div>

        {error && <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, marginTop: 8 }}>{error}</p>}

        {callState === 'joined' && (
          <p style={{ color: '#334155', textAlign: 'center', fontSize: 12, marginTop: 12 }}>
            Your session is being recorded for evaluation purposes · {frameCount} frames analyzed
          </p>
        )}
      </div>
    </div>
  )
}

const BTN_PRIMARY = {
  background: '#6366f1', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 22px', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
}
const BTN_SECONDARY = {
  background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
  borderRadius: 8, padding: '10px 22px', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
}
