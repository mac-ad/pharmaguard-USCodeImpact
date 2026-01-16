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
  const [step, setStep] = useState('select') // 'select', 'scanQR', 'scanSticker', 'enterTemp', 'result'
  const [scannedBatch, setScannedBatch] = useState(null)
  const [detectedColor, setDetectedColor] = useState(null)
  const [temperature, setTemperature] = useState(25) // Default temperature
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // QR Scanner
  const handleQRResult = useCallback(async (data, rawText, videoElement) => {
    if (data.type === 'BATCH' && data.batchId) {
      // Stop scanning
      qrScanner.stopScanning()

      try {
        // 1. Fetch batch details
        const batch = await getBatch(data.batchId)
        setScannedBatch(batch)

        // 3. Extract temperature from QR code if available
        const qrTemperature = data.temperature !== undefined && data.temperature !== null 
          ? Number(data.temperature) 
          : null

        // 3. Use temperature from QR code, or estimate from color if not available
        if (qrTemperature !== null) {
          // Temperature is in QR code - use it directly
          setTemperature(qrTemperature)
          const stickerColor = getStickerColorFromTemp(qrTemperature)
          setDetectedColor(getColorInfo(stickerColor))
        } else {
          // No temperature in QR - analyze color from camera
          let colorResult = { color: 'unknown' }
          try {
            if (videoElement) {
              colorResult = analyzeVideoFrame(videoElement)
            }
          } catch (e) {
            console.error('Color analysis failed', e)
          }
          setDetectedColor(colorResult)

          // Estimate temperature from color
          const tempMap = { green: 22, yellow: 32, red: 45 }
          const estimatedTemp = tempMap[colorResult.color] || 25
          setTemperature(estimatedTemp)
        }

        // 4. Move to temperature slider step (user can adjust if needed)
        setStep('enterTemp')
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



  // Get sticker color based on temperature
  const getStickerColorFromTemp = (temp) => {
    if (temp <= 25) return 'green'
    if (temp <= 35) return 'yellow'
    return 'red'
  }

  // Submit scan with temperature
  const submitScan = async () => {
    if (!scannedBatch) {
      setError('No batch selected')
      return
    }

    setError(null)
    setIsAnalyzing(true)

    // Determine sticker color from temperature
    const stickerColor = getStickerColorFromTemp(temperature)

    try {
      // Get Geolocation
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

      // Log scan result
      const result = await logScan({
        batchId: scannedBatch.batchId,
        checkpoint: CHECKPOINTS[currentCheckpoint],
        stickerColor: stickerColor,
        latitude,
        longitude,
        temperature: temperature
      })

      // Handle "already recorded" response
      if (result.alreadyRecorded) {
        setScanResult({
          ...result,
          message: result.message || '✅ This checkpoint was already recorded for this batch.',
          dataRecorded: true
        })
      } else {
        setScanResult(result)
      }
      
      setStep('result')
    } catch (err) {
      setError('Failed to log scan: ' + err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Reset and scan next
  const resetForNext = () => {
    setScannedBatch(null)
    setDetectedColor(null)
    setTemperature(25)
    setScanResult(null)
    setError(null)
    setStep('select')
    qrScanner.resetScanner()
  }

  // Get color info for current temperature
  const getCurrentColorInfo = () => {
    const color = getStickerColorFromTemp(temperature)
    return getColorInfo(color)
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

        {/* Temperature Input */}
        {step === 'enterTemp' && scannedBatch && (
          <div className="card">
            <div className="flex-between mb-2">
              <h3>Enter Temperature</h3>
              <span className="status-badge status-warning">
                {CHECKPOINTS[currentCheckpoint]}
              </span>
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>BATCH</p>
              <p className="mono" style={{ fontWeight: 600 }}>{scannedBatch.batchId}</p>
              <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{scannedBatch.medicineName}</p>
              <div className="mt-2" style={{ fontSize: '0.875rem' }}>
                <span className="text-muted">Safe Range: </span>
                <span>{scannedBatch.optimalTempMin}°C – {scannedBatch.optimalTempMax}°C</span>
                <br />
                <span className="text-muted">Max Allowed: </span>
                <span className="text-warning">{scannedBatch.optimalTempMax + 5}°C</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}> (max + 5°C)</span>
              </div>
            </div>

            {/* Temperature Slider with Sticker Visualization */}
            <div className="card mb-2" style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <h4 className="mb-2" style={{ fontSize: '1rem' }}>🌡️ Adjust Temperature</h4>
              <p className="text-secondary mb-3" style={{ fontSize: '0.875rem' }}>
                Move the slider to match the sticker color. Temperature will be automatically recorded.
              </p>

              {/* Sticker Preview */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: getCurrentColorInfo().color === 'green'
                    ? 'linear-gradient(135deg, #10b981, #34d399)'
                    : getCurrentColorInfo().color === 'yellow'
                      ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(135deg, #ef4444, #f87171)',
                  boxShadow: `0 0 40px ${getCurrentColorInfo().color === 'green' ? 'rgba(16, 185, 129, 0.5)' :
                    getCurrentColorInfo().color === 'yellow' ? 'rgba(245, 158, 11, 0.5)' :
                      'rgba(239, 68, 68, 0.5)'
                    }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  marginBottom: '1rem'
                }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#0a0f1c'
                  }}>
                    {temperature}°
                  </span>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: getCurrentColorInfo().color === 'green'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : getCurrentColorInfo().color === 'yellow'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color: getCurrentColorInfo().color === 'green'
                    ? 'var(--safe)'
                    : getCurrentColorInfo().color === 'yellow'
                      ? 'var(--warning)'
                      : 'var(--danger)',
                  fontWeight: 'bold',
                  border: `1px solid ${getCurrentColorInfo().color === 'green'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : getCurrentColorInfo().color === 'yellow'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                    }`
                }}>
                  {getCurrentColorInfo().emoji} {getCurrentColorInfo().label}
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>Temperature</span>
                  <span style={{
                    color: temperature > (scannedBatch.optimalTempMax + 5) ? 'var(--danger)' :
                      temperature > scannedBatch.optimalTempMax ? 'var(--warning)' : 'var(--safe)',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}>
                    {temperature}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  step="1"
                  style={{
                    width: '100%',
                    height: '10px',
                    borderRadius: '5px',
                    background: 'linear-gradient(to right, #10b981 0%, #10b981 50%, #f59e0b 70%, #ef4444 85%, #ef4444 100%)',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  opacity: 0.6,
                  marginTop: '0.5rem'
                }}>
                  <span>10°C</span>
                  <span style={{ color: 'var(--warning)' }}>
                    Max: {scannedBatch.optimalTempMax + 5}°C
                  </span>
                  <span>50°C</span>
                </div>
                {temperature > (scannedBatch.optimalTempMax + 5) && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px'
                  }}>
                    <p className="text-danger" style={{ fontSize: '0.875rem', margin: 0 }}>
                      ⚠️ Temperature exceeds safe limit. Batch will be invalidated!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="card mt-2" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p className="text-danger">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={submitScan}
                disabled={isAnalyzing}
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
              >
                {isAnalyzing ? (
                  <>
                    <span className="loader" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                    Logging...
                  </>
                ) : (
                  <>✅ Log Checkpoint ({temperature}°C)</>
                )}
              </button>
              <button
                onClick={resetForNext}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && scanResult && (
          <div className="card text-center">
            {scanResult.alreadyRecorded ? (
              <>
                <div className="sticker-preview" style={{
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  boxShadow: '0 0 40px rgba(99, 102, 241, 0.5)'
                }}>ℹ️</div>
                <h2 style={{ color: 'var(--accent)' }}>Already Recorded</h2>
                <p className="text-secondary mt-1">
                  {scanResult.message || 'This checkpoint was already recorded for this batch.'}
                </p>
                {scanResult.existingData && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    margin: '1.5rem 0',
                    textAlign: 'left'
                  }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>PREVIOUSLY RECORDED</p>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <span className="text-muted">Timestamp</span>
                      <span>{new Date(scanResult.existingData.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <span className="text-muted">Temperature</span>
                      <span>{scanResult.existingData.temperature}°C</span>
                    </div>
                    <div className="flex-between">
                      <span className="text-muted">Sticker Color</span>
                      <span>
                        {scanResult.existingData.stickerColor === 'green' ? '🟢' : 
                         scanResult.existingData.stickerColor === 'yellow' ? '🟡' : '🔴'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="sticker-preview" style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)'
                }}>✅</div>
                <h2 className="text-safe">Data Recorded</h2>
                <p className="text-secondary mt-1">
                  {scanResult.message || 'Checkpoint data has been successfully recorded.'}
                </p>
                <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
                  Safety status will be visible to pharmacist and consumer only.
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
                <span>
                  {(() => {
                    const color = scanResult.stickerColor || getStickerColorFromTemp(scanResult.temperature || temperature)
                    const colorInfo = getColorInfo(color)
                    return `${colorInfo.emoji} ${colorInfo.label}`
                  })()}
                </span>
              </div>
              {scanResult.temperature !== undefined && (
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span className="text-muted">Temperature</span>
                  <span style={{ fontWeight: 600 }}>
                    {scanResult.temperature}°C
                  </span>
                </div>
              )}
              <div className="flex-between">
                <span className="text-muted">Recording Status</span>
                <span className="status-badge status-safe">
                  {scanResult.alreadyRecorded ? 'ALREADY RECORDED' : 'RECORDED'}
                </span>
              </div>
            </div>

            {/* Note: Safety status hidden from checkpoint view */}
            <div className="card" style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: '1.5rem'
            }}>
              <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                ℹ️ Safety and invalidation status is only visible to pharmacist and consumer.
              </p>
            </div>

            <button
              onClick={resetForNext}
              className="btn btn-primary btn-lg btn-block"
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

