/**
 * useDaily
 *
 * Thin wrapper around @daily-co/daily-js.
 * Manages call lifecycle, exposes local/remote participant tracks,
 * and surfaces a ref to the local video element.
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import DailyIframe from '@daily-co/daily-js'

export function useDaily() {
  const callRef = useRef(null)
  const localVideoRef = useRef(null)
  const [remoteParticipants, setRemoteParticipants] = useState({})
  const [callState, setCallState] = useState('idle') // idle | joining | joined | left | error
  const [error, setError] = useState(null)

  // Attach local camera to video element once joined
  const attachLocalVideo = useCallback(async () => {
    if (!callRef.current || !localVideoRef.current) return
    const localVideo = callRef.current.localVideo()
    if (localVideo?.persistentTrack) {
      const stream = new MediaStream([localVideo.persistentTrack])
      localVideoRef.current.srcObject = stream
    }
  }, [])

  const joinCall = useCallback(async (roomUrl, token) => {
    if (callRef.current) return

    setCallState('joining')
    setError(null)

    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    })
    callRef.current = call

    call.on('joining-meeting', () => setCallState('joining'))
    call.on('joined-meeting', () => {
      setCallState('joined')
      attachLocalVideo()
    })
    call.on('left-meeting', () => setCallState('left'))
    call.on('error', (ev) => {
      setError(ev.errorMsg || 'Unknown Daily.co error')
      setCallState('error')
    })

    call.on('participant-joined', (ev) => {
      setRemoteParticipants((prev) => ({ ...prev, [ev.participant.session_id]: ev.participant }))
    })
    call.on('participant-updated', (ev) => {
      setRemoteParticipants((prev) => ({ ...prev, [ev.participant.session_id]: ev.participant }))
    })
    call.on('participant-left', (ev) => {
      setRemoteParticipants((prev) => {
        const next = { ...prev }
        delete next[ev.participant.session_id]
        return next
      })
    })

    // Track updates — re-attach local video if track changes
    call.on('track-started', (ev) => {
      if (ev.participant?.local) attachLocalVideo()
    })

    try {
      await call.join({ url: roomUrl, token })
    } catch (err) {
      setError(err.message || 'Failed to join call')
      setCallState('error')
    }
  }, [attachLocalVideo])

  const leaveCall = useCallback(async () => {
    if (!callRef.current) return
    await callRef.current.leave()
    callRef.current.destroy()
    callRef.current = null
    setRemoteParticipants({})
    setCallState('left')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave()
        callRef.current.destroy()
      }
    }
  }, [])

  return {
    joinCall,
    leaveCall,
    callState,
    error,
    localVideoRef,
    remoteParticipants,
    callObject: callRef,
  }
}
