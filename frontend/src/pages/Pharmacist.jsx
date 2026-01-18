import { useState, useEffect, useCallback } from 'react'
import { useQRScanner } from '../hooks/useQRScanner'
import { getBatch, createTablets } from '../utils/api'
import AuditScanner from '../components/AuditScanner'

export default function Pharmacist() {
  const [step, setStep] = useState('scan') // 'scan', 'details', 'tablets'
  const [batch, setBatch] = useState(null)
  const [tablets, setTablets] = useState([])
  const [tabletCount, setTabletCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAudit, setShowAudit] = useState(false)

  // QR Scanner
  const handleQRResult = useCallback(async (data) => {
    if (data.type === 'BATCH' && data.batchId) {
      try {
        const batchData = await getBatch(data.batchId)
        setBatch(batchData)
        qrScanner.stopScanning()
        setStep('details')
      } catch (err) {
        setError('Batch not found: ' + data.batchId)
      }
    }
  }, [])

  const qrScanner = useQRScanner(handleQRResult)

  // Start scanning
  const startScan = () => {
    setError(null)
    setBatch(null)
    setTablets([])
    setStep('scan')
    setTimeout(() => {
      qrScanner.startScanning()
    }, 100)
  }

  // Generate tablets
  const generateTablets = async () => {
    if (!batch) return

    setLoading(true)
    setError(null)

    try {
      const result = await createTablets(batch.batchId, tabletCount)
      setTablets(result.tablets)
      setStep('tablets')
    } catch (err) {
      setError('Failed to generate tablets: ' + err.message)
    } finally {
      setLoading(false)
    }
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
      {/* DEBUG BUTTON FOR AUDIT */}
      <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
        <button
          onClick={() => setShowAudit(true)}
          className="btn btn-outline btn-sm"
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
        >
          🛠️ Debug: Open Audit Scanner
        </button>
      </div>

      <div className="container" style={{ maxWidth: '700px' }}>
        <header className="text-center mb-3">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💊</div>
          <h1>Pharmacist</h1>
          <p className="text-secondary">Verify batch status and generate tablet codes</p>
        </header>

        {/* QR Scanning */}
        {step === 'scan' && (
          <div className="card">
            <h3 className="mb-2">Scan Batch QR Code</h3>

            <div className="camera-container">
              <video
                ref={qrScanner.videoRef}
                className="camera-video"
                playsInline
                muted
              />
              <div className="camera-overlay"></div>
              <div className="camera-status">
                {qrScanner.isScanning ? '📷 Scanning for batch QR...' : 'Initializing camera...'}
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
          </div>
        )}

        {/* Batch Details */}
        {step === 'details' && batch && (
          <div>
            {/* Status Card */}
            <div className={`result-card ${batch.status === 'INVALIDATED' ? 'danger' : 'safe'}`}>
              <div className="result-icon">
                {batch.status === 'INVALIDATED' ? '⚠️' : '✅'}
              </div>
              <div className="result-title">
                {batch.status === 'INVALIDATED' ? 'HEAT DAMAGED' : 'SAFE FOR DISPENSING'}
              </div>
              <p className="result-message">
                {batch.status === 'INVALIDATED'
                  ? 'This batch was exposed to unsafe temperatures and should NOT be dispensed to patients.'
                  : 'This batch has been properly stored throughout its journey and is safe for use.'}
              </p>
            </div>

            {/* AI Audit Button */}
            <div className="mb-3">
              <button
                onClick={() => setShowAudit(true)}
                className="btn btn-outline btn-block"
                style={{ border: '2px dashed var(--primary)', background: 'rgba(37, 99, 235, 0.05)' }}
              >
                🔍 AI Audit: Verify TTI Sticker
              </button>
            </div>

            {/* Batch Info */}
            <div className="card mb-2">
              <h3 className="mb-2">Batch Information</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>BATCH ID</p>
                  <p className="mono" style={{ fontWeight: 600 }}>{batch.batchId}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>MEDICINE</p>
                  <p style={{ fontWeight: 600 }}>{batch.medicineName}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>TEMP RANGE</p>
                  <p>{batch.optimalTempMin}°C – {batch.optimalTempMax}°C</p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>MAX ALLOWED</p>
                  <p className="text-warning" style={{ fontWeight: 600 }}>{batch.optimalTempMax + 5}°C</p>
                  <p className="text-muted" style={{ fontSize: '0.65rem' }}>(max + 5°C)</p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>STATUS</p>
                  <span className={`status-badge status-${batch.status === 'INVALIDATED' ? 'danger' : 'safe'}`}>
                    {batch.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Journey Timeline */}
            {batch.checkpoints && batch.checkpoints.length > 0 && (
              <div className="card mb-2">
                <h3 className="mb-2">Supply Chain Journey</h3>
                <div className="timeline">
                  {batch.checkpoints.map((cp, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className={`timeline-dot ${cp.stickerColor === 'red' ? 'danger' : cp.stickerColor === 'yellow' ? 'warning' : 'safe'}`}></div>
                      <div className="timeline-content">
                        <div className="flex-between">
                          <div className="timeline-title">{cp.checkpoint}</div>
                          <span>
                            {cp.stickerColor === 'green' ? '🟢' : cp.stickerColor === 'yellow' ? '🟡' : '🔴'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <div className="timeline-time">
                            {new Date(cp.timestamp).toLocaleString()}
                          </div>
                          {cp.temperature !== null && cp.temperature !== undefined && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              color: cp.temperature > (batch.optimalTempMax + 5) ? 'var(--danger)' :
                                cp.temperature > batch.optimalTempMax ? 'var(--warning)' : 'var(--text-secondary)',
                              fontWeight: cp.temperature > batch.optimalTempMax ? 600 : 400
                            }}>
                              <span>🌡️</span>
                              <span>{cp.temperature}°C</span>
                              {cp.temperature > (batch.optimalTempMax + 5) && (
                                <span className="text-danger" style={{ fontSize: '0.7rem' }}>⚠️ Exceeded</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Tablets (only if SAFE) */}
            {batch.status !== 'INVALIDATED' && (
              <div className="card">
                <h3 className="mb-2">Generate Tablet QR Codes</h3>
                <p className="text-secondary mb-2" style={{ fontSize: '0.875rem' }}>
                  Create individual QR codes for consumer verification
                </p>

                <div className="input-group">
                  <label>Number of Tablets</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="50"
                    value={tabletCount}
                    onChange={(e) => setTabletCount(parseInt(e.target.value) || 1)}
                  />
                </div>

                <button
                  onClick={generateTablets}
                  disabled={loading}
                  className="btn btn-safe btn-block"
                >
                  {loading ? 'Generating...' : `Generate ${tabletCount} Tablet QR Codes`}
                </button>
              </div>
            )}

            <button
              onClick={startScan}
              className="btn btn-outline btn-block mt-2"
            >
              ← Scan Another Batch
            </button>
          </div>
        )}

        {/* Generated Tablets */}
        {step === 'tablets' && tablets.length > 0 && (
          <div>
            <div className="card text-center mb-2">
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <h2>{tablets.length} Tablet QR Codes Generated</h2>
              <p className="text-secondary">Print or display these for consumers to scan</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}>
              {tablets.map((tablet) => (
                <div key={tablet.tabletId} className="card text-center" style={{ padding: '1rem' }}>
                  <div className="qr-display" style={{ margin: '0 auto 0.75rem' }}>
                    <img
                      src={tablet.qrCode}
                      alt={`Tablet ${tablet.tabletId}`}
                      style={{ width: 150, height: 150 }}
                    />
                  </div>
                  <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {tablet.tabletId}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => setStep('details')}
                className="btn btn-outline"
              >
                ← Back to Batch
              </button>
              <button
                onClick={startScan}
                className="btn btn-primary"
              >
                Scan Another Batch
              </button>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        {showAudit && (
          <AuditScanner onClose={() => setShowAudit(false)} />
        )}

      </div>
    </div>
  )
}

