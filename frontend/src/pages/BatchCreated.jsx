import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BatchCreated() {
    const location = useLocation()
    const navigate = useNavigate()
    const batch = location.state?.batch

    const [selectedTemp, setSelectedTemp] = useState(20)

    // Redirect if no batch data
    useEffect(() => {
        if (!batch) {
            navigate('/manufacturer')
        }
    }, [batch, navigate])

    if (!batch) return null

    // Temperature ranges and corresponding colors (reused from StickerPreview)
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

    const currentRange = getCurrentRange()

    return (
        <div className="page">
            <div className="container">
                <header className="text-center mb-4">
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                    <h1>Batch Created Successfully!</h1>
                    <p className="text-secondary">Batch ID: {batch.batchId}</p>
                </header>

                <div className="">
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

                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Scan Target</p>
                            <div className="scan-target" style={{
                                background: 'white',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2rem',
                                border: '1px solid #e0e0e0'
                            }}>
                                <img src={batch.qrCode} alt="Batch QR Code" className="scan-item" style={{ flexShrink: 0 }} />

                                {/* Sticker Visual */}
                                <div className="scan-item" style={{
                                    borderRadius: '50%',
                                    background: currentRange.gradient,
                                    border: '5px solid rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease'
                                }}>
                                    <span className="scan-text" style={{ color: '#1a1a1a', fontWeight: '800' }}>
                                        {selectedTemp}°
                                    </span>
                                </div>
                            </div>
                            <p className="text-muted mt-3" style={{ fontSize: '0.8rem' }}>
                                Scan both simultaneously using the Checkpoint Scanner.
                            </p>
                        </div>

                    </div>

                    {/* Right Column: Sticker Simulation */}
                    <div className="card">
                        <h2 className="card-title">🎛️ Simulation Controls</h2>
                        <p className="text-secondary mb-4">
                            Adjust temperature to see the sticker color change in real-time.
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            marginBottom: '2rem'
                        }}>
                            {/* Sticker Visualization */}
                            <div style={{
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                background: currentRange.gradient,
                                boxShadow: `0 0 60px ${currentRange.color}40, 0 0 120px ${currentRange.color}20`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                border: '8px solid rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.5s ease',
                                marginBottom: '1.5rem'
                            }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0a0f1c' }}>
                                    {selectedTemp}°C
                                </span>
                            </div>

                            <div style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                background: `${currentRange.color}20`,
                                color: currentRange.color,
                                fontWeight: 'bold',
                                border: `1px solid ${currentRange.color}`
                            }}>
                                {currentRange.label}
                            </div>
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
            </div>

            <style>{`
                .grid-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }

                @media (min-width: 768px) {
                    .grid-layout {
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
                        width: 220px;
                        height: 220px;
                    }
                    .scan-text {
                        font-size: 3rem;
                    }
                }
            `}</style>
        </div>
    )
}
