import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Custom hook for camera access
 * Handles camera stream, permissions, and cleanup
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' for back camera

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError(err.message || 'Failed to access camera')
      setIsActive(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }, [])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isActive) {
      startCamera()
    }
  }, [facingMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  /**
   * Capture current frame as canvas
   */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !isActive) return null

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    return canvas
  }, [isActive])

  /**
   * Capture current frame as data URL
   */
  const captureImage = useCallback(() => {
    const canvas = captureFrame()
    if (!canvas) return null
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [captureFrame])

  /**
   * Get image data for color analysis
   */
  const getImageData = useCallback(() => {
    const canvas = captureFrame()
    if (!canvas) return null
    
    const ctx = canvas.getContext('2d')
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [captureFrame])

  return {
    videoRef,
    isActive,
    error,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    captureImage,
    getImageData
  }
}

