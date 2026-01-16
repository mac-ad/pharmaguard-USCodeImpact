import { useState, useEffect, useCallback } from 'react'
import { useQRScanner } from '../hooks/useQRScanner'
import { getTablet, getBatch } from '../utils/api'

export default function Consumer() {
  const [step, setStep] = useState('scan') // 'scan', 'result'
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // QR Scanner
  const handleQRResult = useCallback(async (data, rawText) => {
    try {
      let productInfo = null

      // Handle tablet QR
      if (data.type === 'TABLET' && data.tabletId) {
        productInfo = await getTablet(data.tabletId)
      } 
      // Handle batch QR (direct scan)
      else if (data.type === 'BATCH' && data.batchId) {
        const batch = await getBatch(data.batchId)
        productInfo = {
          tabletId: null,
          batchId: batch.batchId,
          medicineName: batch.medicineName,
          batchStatus: batch.status,
          consumerStatus: batch.status === 'INVALIDATED' ? 'HEAT_DAMAGED' : 'SAFE',
          consumerMessage: batch.status === 'INVALIDATED' 
            ? '⚠️ GENUINE but HEAT-DAMAGED - This medicine was exposed to unsafe temperatures during transport. Do not use.'
            : '✅ GENUINE & SAFE - This medicine has been properly stored throughout its journey.',
          journey: batch.checkpoints
        }
      }

      if (productInfo) {
        setResult(productInfo)
        qrScanner.stopScanning()
        setStep('result')
      }
    } catch (err) {
      setError('Product not found. Please try again.')
    }
  }, [])

  const qrScanner = useQRScanner(handleQRResult)

  // Start scanning
  const startScan = () => {
    setError(null)
    setResult(null)
    setStep('scan')
    setTimeout(() => {
      qrScanner.startScanning()
    }, 100)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      qrScanner.stopScanning()
    }
  }, [])

  // Start scanning on mount
  useEffect(() => {
    startScan()
  }, [])

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '500px' }}>
        <header className="text-center mb-3">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👤</div>
          <h1>Consumer Check</h1>
          <p className="text-secondary">Verify your medicine's authenticity and safety</p>
        </header>

        {/* QR Scanning */}
        {step === 'scan' && (
          <div className="card">
            <h3 className="mb-2 text-center">Scan Medicine QR Code</h3>
            <p className="text-muted text-center mb-2" style={{ fontSize: '0.875rem' }}>
              Point your camera at the QR code on your medicine package
            </p>
            
            <div className="camera-container">
              <video 
                ref={qrScanner.videoRef} 
                className="camera-video"
                playsInline
                muted
              />
              <div className="camera-overlay"></div>
              <div className="camera-status">
                {qrScanner.isScanning ? '📷 Scanning...' : 'Starting camera...'}
              </div>
            </div>

            {error && (
              <div className="card mt-2" style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p className="text-danger text-center">{error}</p>
                <button 
                  onClick={startScan} 
                  className="btn btn-outline btn-block mt-2"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {step === 'result' && result && (
          <div>
            {/* Main Status Card */}
            <div className={`result-card ${result.consumerStatus === 'HEAT_DAMAGED' ? 'danger' : 'safe'}`}>
              <div className="result-icon">
                {result.consumerStatus === 'HEAT_DAMAGED' ? '⚠️' : '✅'}
              </div>
              
              {result.consumerStatus === 'HEAT_DAMAGED' ? (
                <>
                  <div className="result-title" style={{ color: 'var(--danger)' }}>
                    GENUINE but HEAT-DAMAGED
                  </div>
                  <p className="result-message">
                    This medicine is <strong>authentic</strong>, but it was exposed to unsafe temperatures during transport.
                    <br /><br />
                    <strong style={{ color: 'var(--danger)' }}>DO NOT USE</strong> - Return to your pharmacist.
                  </p>
                </>
              ) : (
                <>
                  <div className="result-title" style={{ color: 'var(--safe)' }}>
                    GENUINE & SAFE
                  </div>
                  <p className="result-message">
                    This medicine is <strong>authentic</strong> and has been properly stored throughout its entire journey.
                    <br /><br />
                    <strong style={{ color: 'var(--safe)' }}>SAFE TO USE</strong>
                  </p>
                </>
              )}
            </div>

            {/* Product Details */}
            <div className="card mb-2">
              <h3 className="mb-2">Product Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="flex-between">
                  <span className="text-muted">Medicine</span>
                  <span style={{ fontWeight: 600 }}>{result.medicineName}</span>
                </div>
                <div className="flex-between">
                  <span className="text-muted">Batch ID</span>
                  <span className="mono">{result.batchId}</span>
                </div>
                {result.tabletId && (
                  <div className="flex-between">
                    <span className="text-muted">Tablet ID</span>
                    <span className="mono">{result.tabletId}</span>
                  </div>
                )}
                <div className="flex-between">
                  <span className="text-muted">Authenticity</span>
                  <span className="text-safe">✓ Verified Genuine</span>
                </div>
                <div className="flex-between">
                  <span className="text-muted">Thermal Safety</span>
                  <span className={result.consumerStatus === 'HEAT_DAMAGED' ? 'text-danger' : 'text-safe'}>
                    {result.consumerStatus === 'HEAT_DAMAGED' ? '✗ Compromised' : '✓ Safe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Journey Overview (Simplified for consumers) */}
            {result.journey && result.journey.length > 0 && (
              <div className="card mb-2">
                <h3 className="mb-2">Journey Summary</h3>
                <p className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                  Your medicine passed through {result.journey.length} checkpoints
                </p>
                
                {result.optimalTempMin !== undefined && result.optimalTempMax !== undefined && (
                  <div className="card mb-2" style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span className="text-muted">Safe Temperature Range: </span>
                      <span style={{ fontWeight: 600 }}>{result.optimalTempMin}°C – {result.optimalTempMax}°C</span>
                      <br />
                      <span className="text-muted">Maximum Allowed: </span>
                      <span className="text-warning" style={{ fontWeight: 600 }}>{result.optimalTempMax + 5}°C</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}> (max + 5°C tolerance)</span>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.journey.map((cp, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: cp.stickerColor === 'red' 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : cp.stickerColor === 'yellow'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        border: cp.stickerColor === 'red' 
                          ? '1px solid rgba(239, 68, 68, 0.3)' 
                          : cp.stickerColor === 'yellow'
                            ? '1px solid rgba(245, 158, 11, 0.3)'
                            : '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {cp.stickerColor === 'red' ? '🔴' : cp.stickerColor === 'yellow' ? '🟡' : '🟢'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{cp.checkpoint}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {new Date(cp.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {cp.temperature !== null && cp.temperature !== undefined && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '0.25rem'
                        }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: cp.temperature > (result.optimalTempMax + 5) ? 'var(--danger)' : 
                                   cp.temperature > result.optimalTempMax ? 'var(--warning)' : 'var(--text-secondary)',
                            fontWeight: cp.temperature > result.optimalTempMax ? 600 : 400,
                            fontSize: '0.875rem'
                          }}>
                            <span>🌡️</span>
                            <span>{cp.temperature}°C</span>
                          </div>
                          {cp.temperature > (result.optimalTempMax + 5) && (
                            <span className="text-danger" style={{ fontSize: '0.7rem' }}>
                              ⚠️ Exceeded limit
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {result.journey.some(cp => cp.stickerColor === 'red') && (
                  <div className="card mt-2" style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.75rem'
                  }}>
                    <p className="text-danger" style={{ fontSize: '0.875rem' }}>
                      ⚠️ Heat exposure detected at one or more checkpoints
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="card" style={{ 
              background: result.consumerStatus === 'HEAT_DAMAGED' 
                ? 'rgba(239, 68, 68, 0.05)' 
                : 'rgba(16, 185, 129, 0.05)',
              border: result.consumerStatus === 'HEAT_DAMAGED'
                ? '1px solid rgba(239, 68, 68, 0.2)'
                : '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <h4 className="mb-2">What should I do?</h4>
              {result.consumerStatus === 'HEAT_DAMAGED' ? (
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                  <li>Do not take this medicine</li>
                  <li>Return it to your pharmacist</li>
                  <li>Request a replacement from a different batch</li>
                  <li>Report this issue if needed</li>
                </ul>
              ) : (
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                  <li>This medicine is safe to use</li>
                  <li>Follow the prescribed dosage</li>
                  <li>Store as directed on the package</li>
                </ul>
              )}
            </div>

            <button 
              onClick={startScan} 
              className="btn btn-primary btn-lg btn-block mt-3"
            >
              Scan Another Medicine
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

