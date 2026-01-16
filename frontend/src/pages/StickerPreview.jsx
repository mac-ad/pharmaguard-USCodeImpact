import { useState } from 'react'

function StickerPreview() {
    const [selectedTemp, setSelectedTemp] = useState(25)

    // Temperature ranges and corresponding colors
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
                <div className="page-header">
                    <div className="page-icon">🌡️</div>
                    <div>
                        <h1 className="page-title">Thermal Sticker Preview</h1>
                        <p className="page-subtitle">Visual simulation of thermochromic sticker color changes</p>
                    </div>
                </div>

                {/* Temperature Slider */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎚️</span>
                        Temperature Control
                    </h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Current Temperature</span>
                            <span style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                background: currentRange.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {selectedTemp}°C
                            </span>
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
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            opacity: 0.5,
                            marginTop: '0.5rem'
                        }}>
                            <span>10°C</span>
                            <span>50°C</span>
                        </div>
                    </div>
                </div>

                {/* Large Sticker Preview */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎨</span>
                        Current Sticker State
                    </h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}>
                        {/* Sticker Visualization */}
                        <div style={{
                            width: '300px',
                            height: '300px',
                            borderRadius: '50%',
                            background: currentRange.gradient,
                            boxShadow: `0 0 60px ${currentRange.color}40, 0 0 120px ${currentRange.color}20`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            border: '8px solid rgba(255, 255, 255, 0.1)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            <div style={{
                                fontSize: '4rem',
                                fontWeight: 'bold',
                                color: '#0a0f1c',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                                {selectedTemp}°C
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: '#0a0f1c',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginTop: '0.5rem'
                            }}>
                                {currentRange.label.split(' - ')[0]}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            background: `${currentRange.color}20`,
                            border: `2px solid ${currentRange.color}`,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: currentRange.color,
                            textAlign: 'center'
                        }}>
                            {currentRange.label}
                        </div>
                    </div>
                </div>

                {/* All Temperature States */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📊</span>
                        All Temperature States
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        {tempRanges.map((range, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedTemp(range.temp)}
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: selectedTemp === range.temp
                                        ? `2px solid ${range.color}`
                                        : '2px solid rgba(255, 255, 255, 0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: selectedTemp === range.temp ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: selectedTemp === range.temp
                                        ? `0 0 20px ${range.color}40`
                                        : 'none'
                                }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: range.gradient,
                                    margin: '0 auto 1rem',
                                    boxShadow: `0 4px 12px ${range.color}40`,
                                    border: '4px solid rgba(255, 255, 255, 0.1)'
                                }} />
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    marginBottom: '0.5rem',
                                    color: range.color
                                }}>
                                    {range.temp}°C
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    textAlign: 'center',
                                    opacity: 0.7,
                                    lineHeight: '1.4'
                                }}>
                                    {range.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Information Section */}
                <div className="card" style={{ marginTop: '2rem', background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#00ff88' }}>ℹ️ How Thermochromic Stickers Work</h3>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                            <span style={{ color: '#00ff88', fontSize: '1.2rem' }}>✓</span>
                            <span><strong>Green (Safe):</strong> Medicine stored within optimal temperature range</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                            <span style={{ color: '#ffdd00', fontSize: '1.2rem' }}>⚠</span>
                            <span><strong>Yellow (Warning):</strong> Approaching temperature threshold, still acceptable</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                            <span style={{ color: '#ff0000', fontSize: '1.2rem' }}>✗</span>
                            <span><strong>Red (Danger):</strong> Heat exposure detected, batch invalidated</span>
                        </li>
                    </ul>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
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
          border: 3px solid #0a0f1c;
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 3px solid #0a0f1c;
        }
      `}</style>
        </div>
    )
}

export default StickerPreview
