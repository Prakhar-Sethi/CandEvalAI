/**
 * useFrameCapture
 *
 * Captures a video frame from a <video> element every `intervalMs` milliseconds,
 * encodes it as a base64 JPEG, and calls `onFrame(base64String, frameIndex)`.
 *
 * Usage:
 *   const { startCapture, stopCapture, isCapturing } = useFrameCapture(videoRef, onFrame, 3000)
 */
import { useRef, useState, useCallback } from 'react'

const DEFAULT_INTERVAL_MS = 3000
const JPEG_QUALITY = 0.7

export function useFrameCapture(videoRef, onFrame, intervalMs = DEFAULT_INTERVAL_MS) {
  const timerRef = useRef(null)
  const frameIndexRef = useRef(0)
  const [isCapturing, setIsCapturing] = useState(false)

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return // HAVE_CURRENT_DATA

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // data:image/jpeg;base64,<data>
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.split(',')[1]

    onFrame(base64, frameIndexRef.current)
    frameIndexRef.current += 1
  }, [videoRef, onFrame])

  const startCapture = useCallback(() => {
    if (timerRef.current) return
    frameIndexRef.current = 0
    setIsCapturing(true)
    timerRef.current = setInterval(captureFrame, intervalMs)
  }, [captureFrame, intervalMs])

  const stopCapture = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsCapturing(false)
  }, [])

  return { startCapture, stopCapture, isCapturing }
}
