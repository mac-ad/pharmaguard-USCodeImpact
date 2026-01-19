import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../utils/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Custom marker icons
const safeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const alertIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function AuthorityDashboard() {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [lastDataHash, setLastDataHash] = useState(null)
    const [justUpdated, setJustUpdated] = useState(false)

    // Polling Logic
    useEffect(() => {
        fetchData()
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/database/all`)
                if (!response.ok) return
                const newData = await response.json()

                // Hash for change detection
                const latestCpTime = newData.checkpoints.length > 0 ? newData.checkpoints[0].timestamp : 'none';
                const newHash = `${newData.stats.totalCheckpoints}-${newData.stats.totalBatches}-${latestCpTime}`;

                if (newHash !== lastDataHash && lastDataHash !== null) {
                    setData(newData)
                    setLastDataHash(newHash)
                    setJustUpdated(true)
                    setTimeout(() => setJustUpdated(false), 2000)
                } else if (lastDataHash === null) {
                    setLastDataHash(newHash)
                }
            } catch (err) {
                console.warn(err)
            }
        }, 2000)
        return () => clearInterval(pollInterval)
    }, [lastDataHash])

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_BASE}/database/all`)
            const result = await response.json()
            setData(result)
            setLastDataHash(`${result.checkpointCount}-${result.batchCount}-${result.lastUpdated}`)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !data) {
        return (
            <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    // Process Data for Dashboard

    // 1. Manufacturer Compliance
    const manufacturers = {}
    data.batches.forEach(b => {
        const name = b.manufacturer || 'Unknown Manufacturer'
        if (!manufacturers[name]) {
            manufacturers[name] = { name, total: 0, safe: 0, invalidated: 0 }
        }
        manufacturers[name].total++
        if (b.status === 'SAFE') manufacturers[name].safe++
        else manufacturers[name].invalidated++
    })
    const manufacturerList = Object.values(manufacturers).sort((a, b) => b.total - a.total)

    // 2. Critical Alerts (Last 5 invalidated checkpoints)
    const criticalAlerts = data.checkpoints
        .filter(cp => !cp.withinRange)
        .slice(0, 5)

    return (
        <div className="page" style={{ paddingBottom: '3rem' }}>
            <div className="container">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem',
                    background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            fontSize: '3rem',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '1rem',
                            borderRadius: '12px'
                        }}>🏛️</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>National Drug Authority</h1>
                            <p style={{ margin: '0.5rem 0 0', opacity: 0.7 }}>Oversight & Compliance Dashboard</p>
                        </div>
                    </div>
                    {justUpdated && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(0, 255, 136, 0.2)',
                            color: '#00ff88',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            animation: 'fadeIn 0.3s'
                        }}>
                            <span className="live-dot"></span> Live Updates
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ background: '#1e293b' }}>
                        <div style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total Manufacturers</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{manufacturerList.length}</div>
                        <div className="stat-icon">🏭</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b' }}>
                        <div style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Batches Monitored</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.stats.totalBatches}</div>
                        <div className="stat-icon">📦</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', borderColor: '#ff0000' }}>
                        <div style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ffaaaa' }}>Critical Incidents</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ff5555' }}>{data.stats.invalidatedBatches}</div>
                        <div className="stat-icon">🚨</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', borderColor: '#00ff88' }}>
                        <div style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaffcc' }}>Safety Rating</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00ff88' }}>
                            {data.stats.totalBatches > 0
                                ? Math.round((data.stats.safeBatches / data.stats.totalBatches) * 100)
                                : 100}%
                        </div>
                        <div className="stat-icon">🛡️</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                    {/* Live Map */}
                    <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>📍 National Safety Map</h3>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Red markers indicate temperature breaches</span>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <MapContainer
                                center={[28.3949, 84.1240]}
                                zoom={7}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                {([...data.checkpoints].reverse()).map((cp) => {
                                    if (!cp.latitude || !cp.longitude) return null;
                                    return (
                                        <Marker
                                            key={`${cp.batchId}-${cp.id}`}
                                            position={[cp.latitude, cp.longitude]}
                                            icon={cp.withinRange ? safeIcon : alertIcon}
                                        >
                                            <Popup>
                                                <div style={{ color: '#1e293b', minWidth: '200px' }}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        borderBottom: '1px solid #e2e8f0',
                                                        paddingBottom: '0.5rem',
                                                        marginBottom: '0.5rem',
                                                        fontSize: '1rem'
                                                    }}>
                                                        {cp.checkpoint}
                                                    </div>

                                                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                        <div>
                                                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Manufacturer</div>
                                                            <div
                                                                onClick={() => navigate(`/database-viewer?search=${encodeURIComponent(cp.manufacturer || '')}`)}
                                                                style={{
                                                                    fontWeight: 600,
                                                                    color: '#6366f1',
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline'
                                                                }}
                                                            >
                                                                {cp.manufacturer || 'Unknown'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Medicine</div>
                                                            <div style={{ fontWeight: 600 }}>{cp.medicineName}</div>
                                                        </div>

                                                        <div>
                                                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Batch ID</div>
                                                            <div
                                                                onClick={() => navigate(`/database-viewer?batch=${cp.batchId}`)}
                                                                style={{
                                                                    color: '#6366f1',
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline'
                                                                }}
                                                            >
                                                                {cp.batchId}
                                                            </div>
                                                        </div>

                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            background: cp.withinRange ? '#f0fdf4' : '#fef2f2',
                                                            padding: '0.5rem',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${cp.withinRange ? '#bbf7d0' : '#fecaca'}`
                                                        }}>
                                                            <span>Temp:</span>
                                                            <span style={{
                                                                fontWeight: 'bold',
                                                                color: cp.withinRange ? '#166534' : '#991b1b'
                                                            }}>
                                                                {cp.temperature !== null ? `${cp.temperature}°C` : 'N/A'}
                                                            </span>
                                                        </div>

                                                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                            {new Date(cp.timestamp).toLocaleString(undefined, {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                })}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Recent Alerts Feed */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚠️ Recent Alerts
                        </h3>
                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                            {criticalAlerts.length === 0 ? (
                                <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>No recent critical alerts</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {criticalAlerts.map((alert, i) => (
                                        <div key={i} style={{
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 0, 0, 0.1)',
                                            borderLeft: '4px solid #ff0000',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{alert.checkpoint}</div>
                                            <div
                                                onClick={() => navigate(`/database-viewer?search=${encodeURIComponent(alert.manufacturer || '')}`)}
                                                style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', marginBottom: '0.5rem', textDecoration: 'underline' }}
                                            >
                                                {alert.manufacturer || 'Unknown Manufacturer'}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, marginBottom: '0.5rem' }}>
                                                <span>Temp: {alert.temperature}°C</span>
                                                <span style={{ color: '#ff5555' }}>Exceeded Limit</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Manufacturer Performance Table */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>🏆 Manufacturer Compliance Rankings</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Manufacturer</th>
                                    <th>Total Batches</th>
                                    <th>Safe</th>
                                    <th>Invalidated</th>
                                    <th>Compliance Score</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {manufacturerList.map((m, idx) => {
                                    const score = m.total > 0 ? Math.round((m.safe / m.total) * 100) : 0
                                    return (
                                        <tr key={idx}>
                                            <td>#{idx + 1}</td>
                                            <td><strong>{m.name}</strong></td>
                                            <td>{m.total}</td>
                                            <td style={{ color: '#00ff88' }}>{m.safe}</td>
                                            <td style={{ color: '#ff5555' }}>{m.invalidated}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', width: '100px' }}>
                                                        <div style={{
                                                            width: `${score}%`,
                                                            height: '100%',
                                                            background: score > 90 ? '#00ff88' : score > 70 ? '#ffdd00' : '#ff0000',
                                                            borderRadius: '3px'
                                                        }} />
                                                    </div>
                                                    <span>{score}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '6px',
                                                    background: score > 90 ? 'rgba(0, 255, 136, 0.2)' : score > 70 ? 'rgba(255, 221, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                                                    color: score > 90 ? '#00ff88' : score > 70 ? '#ffdd00' : '#ff5555',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {score > 90 ? 'EXCELLENT' : score > 70 ? 'GOOD' : 'POOR'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default AuthorityDashboard
