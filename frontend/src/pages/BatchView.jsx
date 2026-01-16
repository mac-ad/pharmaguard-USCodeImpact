import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBatch, generateQRWithTemperature } from '../utils/api'

export default function BatchView() {
    const { batchId } = useParams()
    const navigate = useNavigate()
    const [batch, setBatch] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedTemp, setSelectedTemp] = useState(20)
    const [dynamicQRCode, setDynamicQRCode] = useState(null)
    const [generatingQR, setGeneratingQR] = useState(false)

    // Temperature ranges and corresponding colors (moved outside conditional)
    const tempRanges = [
        { temp: 15, color: '#00ff88', label: 'SAFE - Cold Storage', gradient: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)' },
        { temp: 20, color: '#00ff88', label: 'SAFE - Optimal', gradient: 'linear-gradient(135deg, #00ff88 0%, #00dd77 100%)' },
        { temp: 25, color: '#00ff88', label: 'SAFE - Room Temp', gradient: 'linear-gradient(135deg, #00ff88 0%, #88ff00 100%)' },
        { temp: 30, color: '#ffdd00', label: 'WARNING - Upper Safe Limit', gradient: 'linear-gradient(135deg, #88ff00 0%, #ffdd00 100%)' },
        { temp: 35, color: '#ffaa00', label: 'CAUTION - Near Threshold', gradient: 'linear-gradient(135deg, #ffdd00 0%, #ffaa00 100%)' },
        { temp: 40, color: '#ff6600', label: 'DANGER - Overheating', gradient: 'linear-gradient(135deg, #ffaa00 0%, #ff6600 100%)' },
        { temp: 45, color: '#ff0000', label: 'CRITICAL - Heat Damage', gradient: 'linear-gradient(135deg, #ff6600 0%, #ff0000 100%)' },
    ]

    const getCurrentRange = () => {
        return tempRanges.find(r => r.temp >= selectedTemp) || tempRanges[tempRanges.length - 1]
    }

    // Generate QR code with temperature in real-time
    const updateQRCode = useCallback(async (temp) => {
        if (!batch?.batchId) return

        try {
            setGeneratingQR(true)
            const data = await generateQRWithTemperature(batch.batchId, temp)
            if (data.qrCode) {
                setDynamicQRCode(data.qrCode)
            }
        } catch (err) {
            console.error('Error generating QR:', err)
            // Keep existing QR code on error
        } finally {
            setGeneratingQR(false)
        }
    }, [batch?.batchId])

    useEffect(() => {
        const fetchBatch = async () => {
            if (!batchId) {
                setError('No batch ID provided')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const batchData = await getBatch(batchId)
                setBatch(batchData)
                // Generate initial QR code with default temperature immediately
                if (batchData.batchId) {
                    try {
                        const qrData = await generateQRWithTemperature(batchData.batchId, selectedTemp)
                        if (qrData.qrCode) {
                            setDynamicQRCode(qrData.qrCode)
                        } else if (batchData.qrCode) {
                            // Fallback to batch QR code if generation fails
                            setDynamicQRCode(batchData.qrCode)
                        }
                    } catch (qrErr) {
                        console.warn('Initial QR generation failed, using batch QR:', qrErr)
                        // Fallback to batch QR code
                        if (batchData.qrCode) {
                            setDynamicQRCode(batchData.qrCode)
                        }
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load batch')
            } finally {
                setLoading(false)
            }
        }

        fetchBatch()
    }, [batchId])

    // Generate QR when batch loads or temperature changes (with debounce)
    useEffect(() => {
        if (!batch?.batchId) return

        const timeoutId = setTimeout(() => {
            updateQRCode(selectedTemp)
        }, 300) // Debounce 300ms to avoid too many requests

        return () => clearTimeout(timeoutId)
    }, [batch?.batchId, selectedTemp, updateQRCode])

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="loader" style={{ width: 48, height: 48, margin: '0 auto 1rem' }}></div>
                        <p>Loading batch...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !batch) {
        return (
            <div className="page">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2>Batch Not Found</h2>
                        <p className="text-secondary mb-3">{error || 'The requested batch could not be found.'}</p>
                        <button onClick={() => navigate('/manufacturer')} className="btn btn-primary">
                            Go to Manufacturer
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const currentRange = getCurrentRange()

    return (
        <div className="page">
            <div className="container">
                <header className="text-center mb-4">
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
                    <h1>Batch Details</h1>
                    <p className="text-secondary">Batch ID: {batch.batchId}</p>
                </header>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '1.5rem',
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {/* Left Column: Batch Details & QR */}
                    <div className="card">
                        <h2 className="card-title">📦 Batch Details</h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Medicine Name</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{batch.medicineName}</p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Temperature Constraints</p>
                            <div className="temp-badge">
                                {batch.optimalTempMin}°C — {batch.optimalTempMax}°C
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Status</p>
                            <span className={`status-badge status-${batch.status === 'INVALIDATED' ? 'danger' : 'safe'}`}>
                                {batch.status}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Scan Target
                            </p>
                            <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                                QR code updates in real-time with temperature: <strong>{selectedTemp}°C</strong>
                            </p>
                            <div className="scan-target" style={{
                                background: 'white',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2rem',
                                flexWrap: 'wrap',
                                width: '100%',
                                position: 'relative',
                            }}>
                                {dynamicQRCode ? (
                                    <img
                                        src={dynamicQRCode}
                                        alt={`Batch QR Code (${selectedTemp}°C)`}
                                        className="scan-item"
                                        style={{ flexShrink: 0 }}
                                    />
                                ) : (
                                    <div className="scan-item" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f0f0f0',
                                        color: '#999',

                                    }}>
                                        {generatingQR ? 'Generating...' : 'Loading QR...'}
                                    </div>
                                )}

                                {/* Sticker Visual */}
                                <div className="scan-item" style={{
                                    borderRadius: '50%',
                                    background: currentRange.gradient,
                                    border: '5px solid rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease',
                                    height: '100px',
                                    width: '100px',
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}>
                                    <span className="scan-text" style={{ color: '#1a1a1a', fontWeight: '800' }}>
                                        {/* {selectedTemp}° */}
                                    </span>
                                </div>
                            </div>
                            <p className="text-muted mt-3" style={{ fontSize: '0.8rem' }}>
                                Scan both simultaneously using the Checkpoint Scanner.
                            </p>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                <span>Temperature</span>
                                <span style={{ color: currentRange.color, fontWeight: 'bold' }}>{selectedTemp}°C</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={selectedTemp}
                                onChange={(e) => setSelectedTemp(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: 'linear-gradient(to right, #00ff88 0%, #88ff00 40%, #ffdd00 60%, #ff6600 80%, #ff0000 100%)',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>
                                <span>10°C</span>
                                <span>50°C</span>
                            </div>
                        </div>

                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button onClick={() => navigate('/manufacturer')} className="btn btn-outline">
                        ← Back to Manufacturer
                    </button>
                </div>

                <style>{`
                    @media (min-width: 768px) {
                        .page .container > div:first-of-type {
                            grid-template-columns: 1fr 1fr;
                        }
                    }

                    .card-title {
                        margin-bottom: 1.5rem;
                        font-size: 1.5rem;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        padding-bottom: 0.75rem;
                    }

                    .temp-badge {
                        display: inline-block;
                        padding: 0.5rem 1rem;
                        background: rgba(99, 102, 241, 0.1);
                        border: 1px solid rgba(99, 102, 241, 0.3);
                        color: #818cf8;
                        border-radius: 6px;
                        font-weight: 600;
                    }

                    input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #fff;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    }

                    input[type="range"]::-moz-range-thumb {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #fff;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        border: none;
                    }

                    /* Responsive Scan Item Sizes */
                    .scan-item {
                        width: 130px;
                        height: 130px;
                    }
                    .scan-text {
                        font-size: 1.5rem;
                    }

                    @media (min-width: 600px) {
                        .scan-item {
                            width: 450px;
                            height: 450px;
                        }
                        .scan-text {
                            font-size: 3rem;
                        }
                    }
                `}</style>
            </div>
        </div>
    )
}

