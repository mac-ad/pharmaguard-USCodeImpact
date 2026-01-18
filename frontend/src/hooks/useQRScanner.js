import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

/**
 * Custom hook for QR code scanning
 * Uses @zxing/library for decoding
 */
export function useQRScanner(onResult) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  // Initialize reader
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()

    return () => {
      stopScanning()
    }
  }, [])


  const startScanning = useCallback(async () => {
    if (!readerRef.current || !videoRef.current) return

    // Ensure previous scan is stopped
    if (isScanning) {
      stopScanning()
      // Small delay to allow cleanup
      await new Promise(r => setTimeout(r, 100))
    }

    try {
      setError(null)
      setIsScanning(true)

      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')

      // Prefer back camera
      let selectedDeviceId = null
      for (const device of videoDevices) {
        if (device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')) {
          selectedDeviceId = device.deviceId
          break
        }
      }

      // If no back camera found, use first available
      if (!selectedDeviceId && videoDevices.length > 0) {
        selectedDeviceId = videoDevices[0].deviceId
      }

      if (!selectedDeviceId) {
        throw new Error('No video devices found')
      }

      // WRAPPER to catch async errors from the library
      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText()
            setLastResult(text)
            try {
              const parsed = JSON.parse(text)
              if (onResult) onResult(parsed, text, videoRef.current)
            } catch {
              if (onResult) onResult({ raw: text }, text, videoRef.current)
            }
          }

          if (err && !(err instanceof NotFoundException)) {
            // Still ignore IndexSizeError in the callback loop
            if (err.message && err.message.includes('IndexSizeError')) return;
            console.error('Scan error:', err)
          }
        }
      ).catch(err => {
        // Catch initialization errors (like "It was not possible to play the video")
        console.warn("Recoverable scanner initialization error:", err);
        if (err.message && err.message.includes('IndexSizeError')) {
          // Retry once after a delay if it's a size error
          setTimeout(() => {
            if (isScanning) startScanning();
          }, 500);
        }
      });

    } catch (err) {
      console.error('Scanner error:', err)
      setError(err.message || 'Failed to start scanner')
      setIsScanning(false)
    }
  }, [onResult, isScanning, stopScanning])


  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset()
    }
    setIsScanning(false)
  }, [])

  const resetScanner = useCallback(() => {
    setLastResult(null)
    setError(null)
  }, [])

  return {
    videoRef,
    isScanning,
    error,
    lastResult,
    startScanning,
    stopScanning,
    resetScanner
  }
}

