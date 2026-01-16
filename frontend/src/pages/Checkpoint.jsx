import { useState, useEffect, useCallback } from 'react'
import { useQRScanner } from '../hooks/useQRScanner'
import { useCamera } from '../hooks/useCamera'
import { analyzeVideoFrame, getColorInfo } from '../utils/colorDetection'
import { logScan, getBatch } from '../utils/api'

const CHECKPOINTS = [
  'Manufacturer Dispatch',
  'Birgunj Distributor',
  'Lumbini Transit',
  'Jumla Distributor',
  'Pharmacy'
]

export default function Checkpoint() {
  // State
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0)
  const [step, setStep] = useState('select') // 'select', 'scanQR', 'scanSticker', 'result'
  const [scannedBatch, setScannedBatch] = useState(null)
  const [detectedColor, setDetectedColor] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // QR Scanner
  // QR Scanner
  const handleQRResult = useCallback(async (data, rawText, videoElement) => {
    if (data.type === 'BATCH' && data.batchId) {
      // 1. Analyze color IMMEDIATELY from the current frame
      let colorResult = { color: 'unknown' }
      try {
        if (videoElement) {
          colorResult = analyzeVideoFrame(videoElement)
        }
      } catch (e) {
        console.error('Color analysis failed', e)
      }

      // Stop scanning
      qrScanner.stopScanning()

      try {
        // 2. Fetch batch details
        const batch = await getBatch(data.batchId)
        setScannedBatch(batch)
        setDetectedColor(colorResult)

        // 3. Get Geolocation
        let latitude = null
        let longitude = null
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          })
          latitude = pos.coords.latitude
          longitude = pos.coords.longitude
        } catch (e) {
          console.warn('Geolocation failed or timed out', e)
        }

        // 4. Estimate Temperature
        const tempMap = { green: 22, yellow: 32, red: 45 }
        const estimatedTemp = tempMap[colorResult.color] || 25

        // 5. Log scan result
        const result = await logScan({
          batchId: batch.batchId,
          checkpoint: CHECKPOINTS[currentCheckpoint],
          stickerColor: colorResult.color,
          latitude,
          longitude,
          temperature: estimatedTemp
        })

        setScanResult(result)
        setStep('result')
      } catch (err) {
        setError('Processing failed: ' + err.message)
      }
    }
  }, [currentCheckpoint])

  const qrScanner = useQRScanner(handleQRResult)
  const camera = useCamera()

  // Start QR scanning
  const startQRScan = () => {
    setError(null)
    setStep('scanQR')
    setTimeout(() => {
      qrScanner.startScanning()
    }, 100)
  }



  // Reset and scan next
  const resetForNext = () => {
    setScannedBatch(null)
    setDetectedColor(null)
    setScanResult(null)
    setError(null)
    setStep('select')
    qrScanner.resetScanner()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      qrScanner.stopScanning()
      camera.stopCamera()
    }
  }, [])

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '600px' }}>
        <header className="text-center mb-3">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚚</div>
          <h1>Checkpoint Scan</h1>
          <p className="text-secondary">Log temperature conditions at each transit point</p>
        </header>

        {/* Checkpoint Selection */}
        {step === 'select' && (
          <div className="card">
            <h3 className="mb-2">Select Checkpoint</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {CHECKPOINTS.map((cp, index) => (
                <button
                  key={cp}
                  onClick={() => {
                    setCurrentCheckpoint(index)
                    startQRScan()
                  }}
                  className="btn btn-outline"
                  style={{
                    justifyContent: 'flex-start',
                    padding: '1rem 1.25rem'
                  }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {index + 1}
                  </span>
                  {cp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Scanning */}
        {step === 'scanQR' && (
          <div className="card">
            <div className="flex-between mb-2">
              <h3>Scan QR & Sticker</h3>
              <span className="status-badge status-warning">
                {CHECKPOINTS[currentCheckpoint]}
              </span>
            </div>

            <div className="camera-container">
              <video
                ref={qrScanner.videoRef}
                className="camera-video"
                playsInline
                muted
              />
              <div className="camera-overlay"></div>
              <div className="camera-status">
                {qrScanner.isScanning ? '📷 Scanning for QR & Sticker...' : 'Initializing camera...'}
              </div>
              <p className="text-center text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                Ensure both the QR Code and Temperature Sticker are visible in the frame.
              </p>
            </div>

            {error && (
              <div className="card mt-2" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p className="text-danger">{error}</p>
              </div>
            )}

            <button
              onClick={resetForNext}
              className="btn btn-outline btn-block mt-2"
            >
              ← Back to Checkpoints
            </button>
          </div>
        )}



        {/* Result */}
        {step === 'result' && scanResult && (
          <div className="card text-center">
            {scanResult.batchStatus === 'INVALIDATED' ? (
              <>
                <div className="sticker-preview sticker-red">🔥</div>
                <h2 className="text-danger">Batch Invalidated!</h2>
                <p className="text-secondary mt-1">
                  Heat exposure detected. This batch is no longer safe for use.
                </p>
              </>
            ) : (
              <>
                <div className={`sticker-preview sticker-${detectedColor?.color || 'green'}`}>
                  {detectedColor?.emoji || '✓'}
                </div>
                <h2 className="text-safe">Checkpoint Logged</h2>
                <p className="text-secondary mt-1">
                  {detectedColor?.message}
                </p>
              </>
            )}

            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              margin: '1.5rem 0'
            }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <span className="text-muted">Checkpoint</span>
                <span>{CHECKPOINTS[currentCheckpoint]}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <span className="text-muted">Batch</span>
                <span className="mono">{scannedBatch?.batchId}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <span className="text-muted">Sticker Color</span>
                <span>{detectedColor?.emoji} {detectedColor?.label}</span>
              </div>
              <div className="flex-between">
                <span className="text-muted">Status</span>
                <span className={`status-badge status-${scanResult.batchStatus === 'INVALIDATED' ? 'danger' : 'safe'}`}>
                  {scanResult.batchStatus}
                </span>
              </div>
            </div>

            {/* Journey so far */}
            {scanResult.checkpoints && scanResult.checkpoints.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <h4 className="mb-2">Journey Log</h4>
                <div className="timeline">
                  {scanResult.checkpoints.map((cp, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className={`timeline-dot ${cp.stickerColor === 'red' ? 'danger' : cp.stickerColor === 'yellow' ? 'warning' : 'safe'}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{cp.checkpoint}</div>
                        <div className="flex-between">
                          <span className="timeline-time">
                            {new Date(cp.timestamp).toLocaleString()}
                          </span>
                          <span>
                            {cp.stickerColor === 'green' ? '🟢' : cp.stickerColor === 'yellow' ? '🟡' : '🔴'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={resetForNext}
              className="btn btn-primary btn-lg btn-block"
            >
              Scan Another Batch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

