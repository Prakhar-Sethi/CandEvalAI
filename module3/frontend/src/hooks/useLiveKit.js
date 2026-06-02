/**
 * useLiveKit
 *
 * Manages the LiveKit room lifecycle.
 * Exposes:
 *   - localVideoRef      ref to attach to the local <video> element
 *   - localVideoTrack    the actual LiveKit LocalVideoTrack (for useEffect attachment)
 *   - remoteVideoTracks  { [identity]: { track, name } } for rendering remote videos
 *   - remoteParticipants { [identity]: { session_id, user_name, video } } legacy shape
 *   - callState          idle | joining | joined | left | error
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

export function useLiveKit() {
  const roomRef = useRef(null)
  const localVideoRef = useRef(null)

  const [callState, setCallState] = useState('idle')
  const [error, setError] = useState(null)
  const [localVideoTrack, setLocalVideoTrack] = useState(null)
  const [remoteParticipants, setRemoteParticipants] = useState({})
  const [remoteVideoTracks, setRemoteVideoTracks] = useState({})

  const syncRemoteParticipants = useCallback((room) => {
    const snapshot = {}
    room.remoteParticipants.forEach((p) => {
      const hasVideo = [...p.trackPublications.values()].some(
        (pub) => pub.kind === Track.Kind.Video && pub.isSubscribed
      )
      snapshot[p.identity] = {
        session_id: p.identity,
        user_name: p.name || p.identity,
        video: hasVideo,
      }
    })
    setRemoteParticipants(snapshot)
  }, [])

  const joinCall = useCallback(async (wsUrl, token) => {
    if (roomRef.current) return

    setCallState('joining')
    setError(null)

    const room = new Room()
    roomRef.current = room

    // ── Local track published ──────────────────────────────────────────────
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.kind === Track.Kind.Video && publication.track) {
        setLocalVideoTrack(publication.track)
      }
    })

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.kind === Track.Kind.Video) {
        setLocalVideoTrack(null)
      }
    })

    // ── Remote tracks ──────────────────────────────────────────────────────
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((prev) => ({
          ...prev,
          [participant.identity]: { track, name: participant.name || participant.identity },
        }))
      }
      syncRemoteParticipants(room)
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((prev) => {
          const next = { ...prev }
          delete next[participant.identity]
          return next
        })
      }
      syncRemoteParticipants(room)
    })

    room.on(RoomEvent.ParticipantConnected, () => syncRemoteParticipants(room))
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      syncRemoteParticipants(room)
      setRemoteVideoTracks((prev) => {
        const next = { ...prev }
        delete next[participant.identity]
        return next
      })
    })

    // ── Connection state ───────────────────────────────────────────────────
    room.on(RoomEvent.Connected, async () => {
      setCallState('joined')
      try {
        await room.localParticipant.setCameraEnabled(true)
        await room.localParticipant.setMicrophoneEnabled(true)
      } catch (err) {
        console.error('Failed to enable camera/mic:', err)
        setError('Camera/mic permission denied. Please allow access and try again.')
      }
    })

    room.on(RoomEvent.Disconnected, () => {
      setCallState('left')
      setRemoteParticipants({})
      setRemoteVideoTracks({})
      setLocalVideoTrack(null)
    })

    try {
      await room.connect(wsUrl, token, {
        rtcConfig: {
          iceServers: [{
            urls: ['turn:127.0.0.1:3478?transport=tcp'],
            username: 'lkuser',
            credential: 'lkpass',
          }],
          iceTransportPolicy: 'relay',
        },
      })
    } catch (err) {
      setError(err.message || 'Failed to connect to video room')
      setCallState('error')
      roomRef.current = null
    }
  }, [syncRemoteParticipants])

  const leaveCall = useCallback(async () => {
    if (!roomRef.current) return
    await roomRef.current.disconnect()
    roomRef.current = null
    setRemoteParticipants({})
    setRemoteVideoTracks({})
    setLocalVideoTrack(null)
    setCallState('left')
  }, [])

  useEffect(() => {
    return () => {
      if (roomRef.current) roomRef.current.disconnect()
    }
  }, [])

  return {
    joinCall,
    leaveCall,
    callState,
    error,
    localVideoRef,
    localVideoTrack,
    remoteParticipants,
    remoteVideoTracks,
    callObject: roomRef,
  }
}
