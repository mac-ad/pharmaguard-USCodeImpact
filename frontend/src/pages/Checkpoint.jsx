import { useState, useEffect, useCallback, useRef } from 'react'
import { useQRScanner } from '../hooks/useQRScanner'
import { useCamera } from '../hooks/useCamera'
import { analyzeVideoFrame, getColorInfo } from '../utils/colorDetection'
import { logScan, getBatch, getBatchCheckpoints } from '../utils/api'

export default function Checkpoint() {
  // State
  const [step, setStep] = useState('scanBatch') // 'scanBatch', 'select', 'scanQR', 'processing', 'submitting', 'result'
  const [currentBatch, setCurrentBatch] = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false)
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0)
  const [scannedBatch, setScannedBatch] = useState(null)
  const [detectedColor, setDetectedColor] = useState(null)
  const [temperature, setTemperature] = useState(25) // Default temperature
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const scannerRef = useRef(null)
  const currentCheckpointRef = useRef(0)

  // Submit scan with temperature
  const submitScan = useCallback(async (batch, temp, checkpointIndex) => {
    if (!batch) {
      setError('No batch selected')
      return
    }

    if (!checkpoints || checkpoints.length === 0) {
      setError('No checkpoints available')
      return
    }

    setError(null)
    setIsAnalyzing(true)

    try {
      // Determine sticker color from temperature
      const stickerColor = getStickerColorFromTemp(temp)

      // Use the checkpoint index passed as parameter, or fallback to currentCheckpoint state
      const checkpointIdx = checkpointIndex !== undefined ? checkpointIndex : currentCheckpoint
      const selectedCheckpoint = checkpoints[checkpointIdx];

      let latitude = null;
      let longitude = null;

      // ALWAYS use the district's static coordinates as per user request
      // This simulates being at that specific Nepal district location
      if (selectedCheckpoint) {
        latitude = selectedCheckpoint.latitude
        longitude = selectedCheckpoint.longitude
      }

      // Log scan result using the checkpoint name from the fetched checkpoints
      const result = await logScan({
        batchId: batch.batchId,
        checkpoint: selectedCheckpoint?.name || 'Unknown Checkpoint',
        stickerColor: stickerColor,
        latitude,
        longitude,
        temperature: temp
      })

      setScanResult(result)
      setStep('result')
    } catch (err) {
      setError('Failed to log scan: ' + err.message)
      setStep('scanQR') // Return to scan step on error
    } finally {
      setIsAnalyzing(false)
    }
  }, [currentCheckpoint, checkpoints])

  // Fetch checkpoints for a batch
  const fetchCheckpointsForBatch = useCallback(async (batchId) => {
    try {
      setLoadingCheckpoints(true)
      setError(null)
      const response = await getBatchCheckpoints(batchId, 5) // Get 5 random checkpoints
      if (response && response.checkpoints) {
        setCheckpoints(response.checkpoints)
        return response.checkpoints
      } else {
        throw new Error('Invalid checkpoint data received')
      }
    } catch (err) {
      setError('Failed to load checkpoints: ' + err.message)
      return null
    } finally {
      setLoadingCheckpoints(false)
    }
  }, [])

  // Handle batch QR scan (first step)
  const handleBatchQRResult = useCallback(async (data) => {
    if (data.type === 'BATCH' && data.batchId) {
      // Stop scanning
      if (scannerRef.current) {
        scannerRef.current.stopScanning()
      }

      setStep('processing')
      setError(null)

      try {
        // Fetch batch details
        const batch = await getBatch(data.batchId)
        setCurrentBatch(batch)

        // Fetch checkpoints for this batch
        const fetchedCheckpoints = await fetchCheckpointsForBatch(data.batchId)

        if (fetchedCheckpoints && fetchedCheckpoints.length > 0) {
          // Move to checkpoint selection
          setStep('select')
        } else {
          setError('No checkpoints available for this batch')
          setStep('scanBatch')
        }
      } catch (err) {
        setError('Failed to load batch: ' + err.message)
        setStep('scanBatch')
      }
    }
  }, [fetchCheckpointsForBatch])

  // QR Scanner
  const handleQRResult = useCallback(async (data, rawText, videoElement) => {
    if (data.type === 'BATCH' && data.batchId) {
      // Stop scanning
      if (scannerRef.current) {
        scannerRef.current.stopScanning()
      }

      // Use ref to get the current checkpoint value (always up-to-date)
      const checkpointIndex = currentCheckpointRef.current

      // Show processing state immediately
      setStep('processing')
      setIsAnalyzing(true)
      setError(null)
      setScanResult(null) // Clear any previous result

      try {
        // 1. Fetch batch details
        const batch = await getBatch(data.batchId)
        setScannedBatch(batch)

        // 2. Extract temperature from QR code if available
        const qrTemperature = data.temperature !== undefined && data.temperature !== null
          ? Number(data.temperature)
          : null

        let finalTemperature = null
        let colorResult = null

        // 3. Use temperature from QR code, or estimate from color if not available
        if (qrTemperature !== null) {
          // Temperature is in QR code - use it directly
          finalTemperature = qrTemperature
          const stickerColor = getStickerColorFromTemp(qrTemperature)
          colorResult = getColorInfo(stickerColor)
          setTemperature(qrTemperature)
          setDetectedColor(colorResult)
        } else {
          // No temperature in QR - analyze color from camera
          let detectedColor = { color: 'unknown' }
          try {
            if (videoElement) {
              detectedColor = analyzeVideoFrame(videoElement)
            }
          } catch (e) {
            console.error('Color analysis failed', e)
          }
          setDetectedColor(detectedColor)

          // Estimate temperature from color
          const tempMap = { green: 22, yellow: 32, red: 45 }
          finalTemperature = tempMap[detectedColor.color] || 25
          setTemperature(finalTemperature)
        }

        // 4. Show submitting state and automatically submit the scan data
        // Use the captured checkpointIndex to ensure we use the correct checkpoint
        setStep('submitting')
        await submitScan(batch, finalTemperature, checkpointIndex)
      } catch (err) {
        setError('Processing failed: ' + err.message)
        setStep('scanQR') // Return to scan step on error
        setIsAnalyzing(false)
      }
    }
  }, [submitScan])

  // Separate scanners for different steps
  const batchQRScanner = useQRScanner(handleBatchQRResult)
  const qrScanner = useQRScanner(handleQRResult)

  // Use the appropriate scanner based on step
  useEffect(() => {
    if (step === 'scanBatch') {
      scannerRef.current = batchQRScanner
    } else if (step === 'scanQR') {
      scannerRef.current = qrScanner
    }
  }, [step, batchQRScanner, qrScanner])

  // Sync ref with state to ensure it's always up-to-date
  useEffect(() => {
    currentCheckpointRef.current = currentCheckpoint
  }, [currentCheckpoint])

  const camera = useCamera()

  // Start batch QR scanning (first step)
  const startBatchScan = () => {
    setError(null)
    setCurrentBatch(null)
    setCheckpoints([])
    setScannedBatch(null)
    setDetectedColor(null)
    setTemperature(25)
    setScanResult(null)
    setIsAnalyzing(false)
    setStep('scanBatch')
    setTimeout(() => {
      batchQRScanner.startScanning()
    }, 100)
  }

  // Start QR scanning (for checkpoint scanning)
  const startQRScan = () => {
    // Reset all state when starting a new scan
    setError(null)
    setScannedBatch(null)
    setDetectedColor(null)
    setTemperature(25)
    setScanResult(null)
    setIsAnalyzing(false)
    setStep('scanQR')
    setTimeout(() => {
      qrScanner.startScanning()
    }, 100)
  }



  // Get sticker color based on temperature
  const getStickerColorFromTemp = (temp) => {
    if (temp <= 25) return 'green'
    if (temp <= 35) return 'yellow'
    return 'red'
  }

  // Reset and go back to checkpoint selection
  const resetForNext = () => {
    setScannedBatch(null)
    setDetectedColor(null)
    setTemperature(25)
    setScanResult(null)
    setError(null)
    // Go back to checkpoint selection (keep current batch and checkpoints)
    setStep('select')
    qrScanner.resetScanner()
  }

  // Get color info for current temperature
  const getCurrentColorInfo = () => {
    const color = getStickerColorFromTemp(temperature)
    return getColorInfo(color)
  }

  // Start batch scan on mount
  useEffect(() => {
    startBatchScan()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScanner) qrScanner.stopScanning()
      if (batchQRScanner) batchQRScanner.stopScanning()
      camera.stopCamera()
    }
  }, [])

  // Checkpoint icons and colors (extended to support more checkpoints)
  const checkpointIcons = ['🏭', '📦', '🚛', '🏪', '🏬', '🏢', '🏛️', '🏗️']
  const checkpointColors = [
    'linear-gradient(135deg, #6366f1, #818cf8)',
    'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    'linear-gradient(135deg, #ec4899, #f472b6)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
    'linear-gradient(135deg, #ef4444, #f87171)',
    'linear-gradient(135deg, #14b8a6, #2dd4bf)'
  ]

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '700px' }}>
        <header className="text-center mb-4">
          <div style={{
            fontSize: '4rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #6366f1, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>🚚</div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #fff, #a0aec0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Checkpoint Scanner</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>
            Scan batch QR codes to record temperature conditions
          </p>
        </header>

        {/* Step 1: Scan Batch QR Code */}
        {step === 'scanBatch' && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Scan Batch QR Code
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                First, scan the batch QR code to load checkpoints
              </p>
            </div>

            <div className="camera-container" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '1rem',
              position: 'relative',
              width: '100%',
              height: '400px',
              minHeight: '400px',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video
                ref={batchQRScanner.videoRef}
                className="camera-video"
                playsInline
                muted
                style={{
                  borderRadius: '12px',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <div className="camera-overlay"></div>
              <div className="camera-status" style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                {batchQRScanner.isScanning ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span>📷</span>
                    <span>Scanning for batch QR code...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span>⏳</span>
                    <span>Initializing camera...</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p className="text-secondary" style={{
                margin: 0,
                fontSize: '0.875rem',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                📱 Point your camera at the batch QR code. Checkpoints will be automatically assigned.
              </p>
            </div>

            {error && (
              <div className="card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <p className="text-danger" style={{ margin: 0, textAlign: 'center' }}>
                  ⚠️ {error}
                </p>
                <button
                  onClick={startBatchScan}
                  className="btn btn-outline btn-block mt-2"
                  style={{ fontSize: '0.875rem' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Checkpoint Selection */}
        {step === 'select' && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Select Checkpoint Location
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Batch: {currentBatch?.batchId} • {currentBatch?.medicineName}
              </p>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Choose your current location to begin scanning
              </p>
            </div>

            {loadingCheckpoints ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loader" style={{ width: 48, height: 48, margin: '0 auto 1rem' }}></div>
                <p>Loading checkpoints...</p>
              </div>
            ) : checkpoints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="text-danger">No checkpoints available</p>
                <button onClick={startBatchScan} className="btn btn-outline mt-2">
                  Scan Another Batch
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {checkpoints.map((cp, index) => (
                  <button
                    key={cp.name}
                    onClick={() => {
                      setCurrentCheckpoint(index)
                      currentCheckpointRef.current = index
                      startQRScan()
                    }}
                    className="btn"
                    style={{
                      background: checkpointColors[index % checkpointColors.length],
                      border: 'none',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-4px)'
                      e.target.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div style={{ fontSize: '2.5rem' }}>
                      {checkpointIcons[index % checkpointIcons.length]}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: 0.9,
                      textAlign: 'center',
                      lineHeight: '1.4'
                    }}>
                      {cp.name}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      opacity: 0.8,
                      marginTop: '0.25rem'
                    }}>
                      Step {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Code Scanning */}
        {step === 'scanQR' && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  fontSize: '1.5rem',
                  background: checkpointColors[currentCheckpoint % checkpointColors.length],
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {checkpointIcons[currentCheckpoint % checkpointIcons.length]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                    {checkpoints[currentCheckpoint]?.name || 'Unknown Checkpoint'}
                  </h3>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                    Step {currentCheckpoint + 1} of {checkpoints.length}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForNext}
                className="btn btn-outline"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem'
                }}
              >
                ← Back
              </button>
            </div>

            {/* Camera Container */}
            <div className="camera-container" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '1rem',
              position: 'relative',
              width: '100%',
              height: '400px',
              minHeight: '400px',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video
                ref={qrScanner.videoRef}
                className="camera-video"
                playsInline
                muted
                style={{
                  borderRadius: '12px',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <div className="camera-overlay"></div>
              <div className="camera-status" style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                {isAnalyzing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <div className="loader" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                    <span>Processing...</span>
                  </div>
                ) : qrScanner.isScanning ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span>📷</span>
                    <span>Scanning QR Code...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span>⏳</span>
                    <span>Initializing camera...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p className="text-secondary" style={{
                margin: 0,
                fontSize: '0.875rem',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                {isAnalyzing ? (
                  <>⏳ Processing scanned data...</>
                ) : (
                  <>📱 Point your camera at the batch QR code. Data will be automatically recorded.</>
                )}
              </p>
            </div>

            {error && (
              <div className="card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <p className="text-danger" style={{ margin: 0, textAlign: 'center' }}>
                  ⚠️ {error}
                </p>
                <button
                  onClick={startQRScan}
                  className="btn btn-outline btn-block mt-2"
                  style={{ fontSize: '0.875rem' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processing State (fetching batch, extracting temperature) */}
        {step === 'processing' && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '3rem 2rem'
          }}>
            <div className="text-center">
              <div className="loader" style={{
                width: 64,
                height: 64,
                margin: '0 auto 2rem',
                borderWidth: '4px',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderTopColor: '#6366f1'
              }}></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Processing Scan...
              </h3>
              <p className="text-secondary" style={{ fontSize: '1rem' }}>
                Analyzing QR code and temperature data
              </p>
            </div>
          </div>
        )}

        {/* Submitting State */}
        {step === 'submitting' && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '3rem 2rem'
          }}>
            <div className="text-center">
              <div className="loader" style={{
                width: 64,
                height: 64,
                margin: '0 auto 2rem',
                borderWidth: '4px',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                borderTopColor: '#10b981'
              }}></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Recording Data...
              </h3>
              <p className="text-secondary" style={{ fontSize: '1rem' }}>
                Submitting checkpoint scan to database
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && scanResult && (
          <div className="card text-center" style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            {(() => {
              // Calculate safety status locally for immediate feedback
              const temp = scanResult.temperature !== undefined ? scanResult.temperature : temperature
              const minTemp = scannedBatch?.optimalTempMin || 15
              const maxTemp = scannedBatch?.optimalTempMax || 25
              const isSafe = temp >= minTemp && temp <= maxTemp
              const isCritical = temp > maxTemp // Strictly over max is critical

              return (
                <>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: isSafe
                      ? 'linear-gradient(135deg, #10b981, #34d399)'
                      : 'linear-gradient(135deg, #ef4444, #f87171)',
                    boxShadow: isSafe
                      ? '0 0 40px rgba(16, 185, 129, 0.5)'
                      : '0 0 40px rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '3rem'
                  }}>
                    {isSafe ? '✅' : '⚠️'}
                  </div>

                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: isSafe ? '#10b981' : '#ef4444',
                    marginBottom: '0.5rem'
                  }}>
                    {isSafe ? 'Checkpoint Passed' : 'CRITICAL ALERT'}
                  </h2>

                  <p className="text-secondary" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                    {isSafe
                      ? 'Conditions are within optimal range. Supply chain integrity maintained.'
                      : `Temperature breach detected! Batch is now INVALIDATED.`}
                  </p>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Checkpoint
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {checkpoints[currentCheckpoint]?.name || 'Unknown Checkpoint'}
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Batch ID
                        </div>
                        <div className="mono" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {scannedBatch?.batchId}
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        gridColumn: 'span 2'
                      }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Medicine
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#60a5fa' }}>
                          {scannedBatch?.medicineName || 'Unknown Medicine'}
                        </div>
                      </div>

                      {/* Temperature Display */}
                      <div style={{
                        background: isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: `1px solid ${isSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        gridColumn: 'span 2'
                      }}>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Recorded Temperature
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.5rem', color: isSafe ? '#10b981' : '#ef4444' }}>
                            {temp}°C
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: isSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isSafe ? '#10b981' : '#ef4444',
                            fontWeight: 600
                          }}>
                            Range: {minTemp}°C - {maxTemp}°C
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Required Section for unsafe batches */}
                    {!isSafe && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'left',
                        marginBottom: '1rem'
                      }}>
                        <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ⚠️ ACTION REQUIRED
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <li><strong>IMMEDIATE QUARANTINE:</strong> Isolate this batch immediately. Do not transport further.</li>
                          <li><strong>REPORT:</strong> Notify the central quality assurance team.</li>
                          <li><strong>VERIFY:</strong> Check cooling systems at current location.</li>
                        </ul>
                      </div>
                    )}

                    {/* Blockchain Mining Success Display */}
                    {scanResult.blockchain && (
                      <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>⛓️</span>
                          <span style={{ fontWeight: 600, color: '#10b981' }}>Block Successfully Mined</span>
                        </div>
                        <div className="mono" style={{ fontSize: '0.7rem', color: '#6ee7b7', wordBreak: 'break-all', textAlign: 'left' }}>
                          Hash: {scanResult.blockchain.currentHash}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}


            <button
              onClick={resetForNext}
              className="btn btn-primary btn-lg btn-block"
              style={{
                background: checkpointColors[currentCheckpoint],
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            >
              Scan Another Batch
            </button>
          </div>
        )}
      </div>

      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        input[type="range"]::-moz-range-track {
          height: 10px;
          border-radius: 5px;
        }
      `}</style>
    </div>
  )
}

