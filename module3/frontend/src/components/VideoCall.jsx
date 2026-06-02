/**
 * VideoCall
 *
 * Renders local camera + remote participant videos.
 * Handles frame capture for the candidate side only (when onFrame is provided).
 *
 * Props:
 *   localVideoRef      – ref for the local <video> element
 *   localVideoTrack    – LiveKit LocalVideoTrack (null until camera is ready)
 *   remoteVideoTracks  – { [identity]: { track, name } }
 *   onFrame            – callback(base64, frameIndex) — null on interviewer side
 *   callState          – idle | joining | joined | left | error
 *   latestEmotion      – latest EmotionReading or null
 */
import { useEffect, useRef } from 'react'
import { useFrameCapture } from '../hooks/useFrameCapture'

const LABEL_COLOR = {
  confident: '#22c55e',
  neutral: '#60a5fa',
  stressed: '#f87171',
}

export function VideoCall({
  localVideoRef,
  localVideoTrack,
  remoteVideoTracks = {},
  onFrame,
  callState,
  latestEmotion,
}) {
  // Attach / detach local video track whenever it changes
  useEffect(() => {
    const el = localVideoRef.current
    if (!el || !localVideoTrack) return
    localVideoTrack.attach(el)
    return () => {
      localVideoTrack.detach(el)
    }
  }, [localVideoTrack, localVideoRef])

  // Frame capture — only runs when onFrame is provided (candidate side)
  const { startCapture, stopCapture, isCapturing } = useFrameCapture(
    localVideoRef,
    onFrame || (() => {}),
    1500
  )

  useEffect(() => {
    if (!onFrame) return
    if (callState === 'joined') {
      startCapture()
    } else {
      stopCapture()
    }
    return stopCapture
  }, [callState, onFrame, startCapture, stopCapture])

  const emotionColor = latestEmotion ? LABEL_COLOR[latestEmotion.interview_label] : '#334155'
  const remoteEntries = Object.entries(remoteVideoTracks)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Local video */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            borderRadius: 12,
            border: `3px solid ${emotionColor}`,
            background: '#111',
            transition: 'border-color 0.5s ease',
            display: 'block',
          }}
        />

        {/* Live emotion badge */}
        {latestEmotion && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(0,0,0,0.65)', color: emotionColor,
            padding: '4px 10px', borderRadius: 6,
            fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {latestEmotion.interview_label}&nbsp;
            <span style={{ opacity: 0.7 }}>{Math.round(latestEmotion.confidence_score * 100)}%</span>
          </div>
        )}

        {/* Recording dot — only on candidate side */}
        {isCapturing && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            width: 10, height: 10, borderRadius: '50%',
            background: '#ef4444', animation: 'pulse 1.5s infinite',
          }} />
        )}

        {callState === 'joining' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', fontSize: 14,
          }}>
            Connecting…
          </div>
        )}
      </div>

      {/* Remote participants */}
      {remoteEntries.length > 0 && (
        <div>
          <p style={{ color: '#475569', fontSize: 12, margin: '0 0 8px' }}>
            {remoteEntries.length === 1 ? 'Other participant' : 'Other participants'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {remoteEntries.map(([identity, { track, name }]) => (
              <RemoteVideoTrack key={identity} track={track} name={name} />
            ))}
          </div>
        </div>
      )}

      {callState === 'error' && (
        <p style={{ color: '#f87171', textAlign: 'center' }}>
          Connection error. Please refresh and try again.
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}

function RemoteVideoTrack({ track, name }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: 240,
          borderRadius: 10,
          border: '2px solid #1e293b',
          background: '#111',
          display: 'block',
        }}
      />
      <div style={{
        position: 'absolute', bottom: 6, left: 6,
        background: 'rgba(0,0,0,0.6)', color: '#e2e8f0',
        padding: '2px 8px', borderRadius: 4, fontSize: 12,
      }}>
        {name}
      </div>
    </div>
  )
}
