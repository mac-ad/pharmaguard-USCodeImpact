import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../utils/api'
import { createTablets } from '../utils/api'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const MapClickHandler = ({ onClick }) => {
    useMapEvents({
        click: onClick
    })
    return null
}

function DatabaseViewer() {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('batches')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBatch, setSelectedBatch] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [loadingBatch, setLoadingBatch] = useState(false)
    const [viewMode, setViewMode] = useState('batches') // 'batches' or 'checkpoints'
    const [lastDataHash, setLastDataHash] = useState(null)
    const [isAutoRefresh, setIsAutoRefresh] = useState(true)
    const [justUpdated, setJustUpdated] = useState(false)
    const [generatingTablets, setGeneratingTablets] = useState(null)
    const [generatedTablets, setGeneratedTablets] = useState(null)
    const [showMapModal, setShowMapModal] = useState(false)
    const [highlightedBatchId, setHighlightedBatchId] = useState(null)
    const [mapFilter, setMapFilter] = useState('all')



    useEffect(() => {
        fetchData()
    }, [])

    // Real-time polling for updates
    useEffect(() => {
        if (!isAutoRefresh || !data) return

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/database/all`)
                if (!response.ok) return
                const newData = await response.json()

                // Create a simple hash to detect changes (Count + Latest Timestamp)
                const latestCpTime = newData.checkpoints.length > 0 ? newData.checkpoints[0].timestamp : 'none';
                const newHash = `${newData.stats.totalCheckpoints}-${newData.stats.totalBatches}-${latestCpTime}`;

                // Only update if data actually changed
                if (newHash !== lastDataHash && lastDataHash !== null) {
                    setData(newData)
                    setLastDataHash(newHash)
                    // Show update indicator
                    setJustUpdated(true)
                    setTimeout(() => setJustUpdated(false), 2000)
                } else if (lastDataHash === null) {
                    // First time, just set the hash
                    setLastDataHash(newHash)
                }
            } catch (err) {
                // Silently fail for polling - don't show errors
                console.warn('Polling error:', err)
            }
        }, 2000) // Poll every 2 seconds

        return () => clearInterval(pollInterval)
    }, [isAutoRefresh, data, lastDataHash])

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/database/all`)
            if (!response.ok) throw new Error('Failed to fetch database data')
            const result = await response.json()
            setData(result)
            // Update hash for change detection
            const hash = `${result.checkpointCount}-${result.batchCount}-${result.lastUpdated}`
            setLastDataHash(hash)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const clearDatabase = async () => {
        if (!confirm('⚠️ Are you sure you want to clear ALL database data? This action cannot be undone!')) {
            return
        }

        try {
            // setLoading(true)
            const response = await fetch(`${API_BASE}/database/clear`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to clear database')

            // Refresh data after clearing
            await fetchData()
            alert('✅ Database cleared successfully!')
        } catch (err) {
            setError(err.message)
            alert('❌ Failed to clear database: ' + err.message)
        } finally {
            setLoading(false)
        }
    }


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status) => {
        return status === 'SAFE' ? '#00ff88' : '#ff0000'
    }

    const getColorBadge = (color) => {
        const colors = {
            green: '#00ff88',
            yellow: '#ffdd00',
            red: '#ff0000'
        }
        return colors[color] || '#888'
    }

    const filterData = (items, searchFields) => {
        if (!searchTerm) return items
        return items.filter(item =>
            searchFields.some(field =>
                String(item[field]).toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
    }

    const generateTabletsForBatch = async (batchId, count = 10) => {
        try {
            setGeneratingTablets(batchId)
            const result = await createTablets(batchId, count)
            setGeneratedTablets({ batchId, tablets: result.tablets })
            // Refresh data after generating
            await fetchData()
        } catch (err) {
            alert('Failed to generate tablets: ' + err.message)
        } finally {
            setGeneratingTablets(null)
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Loading database...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page">
                <div className="container">
                    <div className="error-message">
                        <span style={{ fontSize: '2rem' }}>⚠️</span>
                        <p>{error}</p>
                        <button className="btn-primary" onClick={fetchData}>Retry</button>
                    </div>
                </div>
            </div>
        )
    }

    const filteredBatches = filterData(data.batches, ['batchId', 'medicineName', 'status'])
    const filteredCheckpoints = filterData(data.checkpoints, ['batchId', 'checkpoint', 'stickerColor', 'medicineName'])
    const filteredTablets = filterData(data.tablets, ['tabletId', 'batchId', 'medicineName'])


    // Get checkpoints for selected batch
    const batchCheckpoints = selectedBatch
        ? data.checkpoints.filter(cp => cp.batchId === selectedBatch.batchId)
        : []

    console.log(batchCheckpoints)

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div className="page-icon">🗄️</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h1 className="page-title">Database Viewer</h1>
                            {isAutoRefresh && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(0, 255, 136, 0.15)',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    color: '#00ff88',
                                    fontWeight: 'bold'
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#00ff88',
                                        animation: justUpdated ? 'pulse 0.5s ease' : 'none'
                                    }}></span>
                                    Live
                                </span>
                            )}
                        </div>
                        <p className="page-subtitle">Complete view of all system data {isAutoRefresh && '(Auto-refreshing every 2s)'}</p>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-value">{data.stats.totalBatches}</div>
                        <div className="stat-label">Total Batches</div>
                    </div>
                    <div className="stat-card" style={{ borderColor: '#00ff88' }}>
                        <div className="stat-icon">✅</div>
                        <div className="stat-value" style={{ color: '#00ff88' }}>{data.stats.safeBatches}</div>
                        <div className="stat-label">Safe Batches</div>
                    </div>
                    <div className="stat-card" style={{ borderColor: '#ff0000' }}>
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-value" style={{ color: '#ff0000' }}>{data.stats.invalidatedBatches}</div>
                        <div className="stat-label">Invalidated</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📍</div>
                        <div className="stat-value">{data.stats.totalCheckpoints}</div>
                        <div className="stat-label">Checkpoints</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💊</div>
                        <div className="stat-value">{data.stats.totalTablets}</div>
                        <div className="stat-label">Tablets</div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="🔍 Search by ID, medicine name, status, checkpoint, or color..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '0.5rem'
                }}>
                    <button
                        onClick={() => {
                            setActiveTab('batches')
                            setViewMode('batches')
                            setSelectedBatch(null)
                        }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'batches' ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'batches' ? '2px solid #00ff88' : '2px solid transparent',
                            color: activeTab === 'batches' ? '#00ff88' : '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        📦 Batches ({filteredBatches.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('checkpoints')
                            setViewMode('batches')
                            setSelectedBatch(null)
                        }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'checkpoints' ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'checkpoints' ? '2px solid #00ff88' : '2px solid transparent',
                            color: activeTab === 'checkpoints' ? '#00ff88' : '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        📍 Checkpoints ({filteredCheckpoints.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('tablets')
                            setViewMode('batches')
                            setSelectedBatch(null)
                        }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === 'tablets' ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'tablets' ? '2px solid #00ff88' : '2px solid transparent',
                            color: activeTab === 'tablets' ? '#00ff88' : '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        💊 Tablets ({filteredTablets.length})
                    </button>
                </div>

                {/* Batches Table */}
                {activeTab === 'batches' && viewMode === 'batches' && (
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem' }}>📦 Batches</h3>
                        {filteredBatches.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No batches found</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Batch ID</th>
                                            <th>Medicine</th>
                                            <th>Temp Range</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBatches.map((batch) => (
                                            <tr key={batch.batchId}>
                                                <td><code>{batch.batchId}</code></td>
                                                <td><strong>{batch.medicineName}</strong></td>
                                                <td>{batch.optimalTempMin}°C - {batch.optimalTempMax}°C</td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '6px',
                                                        background: `${getStatusColor(batch.status)}20`,
                                                        color: getStatusColor(batch.status),
                                                        fontSize: '0.85rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {batch.status}
                                                    </span>
                                                </td>
                                                <td>{formatDate(batch.createdAt)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBatch(batch)
                                                                setViewMode('checkpoints')
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: 'rgba(0, 255, 136, 0.2)',
                                                                border: '1px solid #00ff88',
                                                                borderRadius: '6px',
                                                                color: '#00ff88',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.background = 'rgba(0, 255, 136, 0.3)'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.background = 'rgba(0, 255, 136, 0.2)'
                                                            }}
                                                        >
                                                            View Checkpoints →
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/batch/${batch.batchId}`)}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: 'rgba(99, 102, 241, 0.2)',
                                                                border: '1px solid #6366f1',
                                                                borderRadius: '6px',
                                                                color: '#818cf8',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.background = 'rgba(99, 102, 241, 0.3)'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.background = 'rgba(99, 102, 241, 0.2)'
                                                            }}
                                                        >
                                                            📦 View QR & Sticker
                                                        </button>
                                                        <button
                                                            onClick={() => generateTabletsForBatch(batch.batchId, 10)}
                                                            disabled={generatingTablets === batch.batchId}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: generatingTablets === batch.batchId
                                                                    ? 'rgba(139, 92, 246, 0.3)'
                                                                    : 'rgba(139, 92, 246, 0.2)',
                                                                border: '1px solid #8b5cf6',
                                                                borderRadius: '6px',
                                                                color: '#a78bfa',
                                                                cursor: generatingTablets === batch.batchId ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                transition: 'all 0.2s ease',
                                                                opacity: generatingTablets === batch.batchId ? 0.6 : 1
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (generatingTablets !== batch.batchId) {
                                                                    e.target.style.background = 'rgba(139, 92, 246, 0.3)'
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (generatingTablets !== batch.batchId) {
                                                                    e.target.style.background = 'rgba(139, 92, 246, 0.2)'
                                                                }
                                                            }}
                                                        >
                                                            {generatingTablets === batch.batchId ? 'Generating...' : '💊 Generate Tablets'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Batch Checkpoints View */}
                {activeTab === 'batches' && viewMode === 'checkpoints' && selectedBatch && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    setSelectedBatch(null)
                                    setViewMode('batches')
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                ← Back to Batches
                            </button>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0 }}>📍 Checkpoints for {selectedBatch.batchId}</h3>
                                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                                    {selectedBatch.medicineName} • Temp Range: {selectedBatch.optimalTempMin}°C - {selectedBatch.optimalTempMax}°C
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMapModal(true)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(236, 72, 153, 0.2)',
                                    border: '1px solid #ec4899',
                                    borderRadius: '6px',
                                    color: '#f472b6',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s ease',
                                    marginRight: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(236, 72, 153, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(236, 72, 153, 0.2)'
                                }}
                            >
                                🗺️ Visualize Map
                            </button>
                            <button
                                onClick={() => navigate(`/batch/${selectedBatch.batchId}`)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    border: '1px solid #6366f1',
                                    borderRadius: '6px',
                                    color: '#818cf8',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(99, 102, 241, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(99, 102, 241, 0.2)'
                                }}
                            >
                                📦 View QR & Sticker
                            </button>
                        </div>
                        {batchCheckpoints.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No checkpoints found for this batch</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Checkpoint</th>
                                            <th>Sticker Color</th>
                                            <th>Location</th>
                                            <th>Temperature</th>
                                            <th>Status</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batchCheckpoints.map((cp, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{cp.checkpoint}</strong></td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            background: getColorBadge(cp.stickerColor),
                                                            border: '2px solid rgba(255, 255, 255, 0.2)'
                                                        }} />
                                                        <span style={{ textTransform: 'capitalize' }}>{cp.stickerColor}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {cp.latitude && cp.longitude ? (
                                                        <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                                                            <div>{Number(cp.latitude).toFixed(4)} N</div>
                                                            <div>{Number(cp.longitude).toFixed(4)} E</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.3 }}>-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {cp.temperature !== null && cp.temperature !== undefined ? (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            color: cp.temperature > (selectedBatch.optimalTempMax + 5) ? '#ff0000' :
                                                                cp.temperature > selectedBatch.optimalTempMax ? '#ffdd00' : '#00ff88',
                                                            fontWeight: cp.temperature > selectedBatch.optimalTempMax ? 600 : 400
                                                        }}>
                                                            <span>🌡️</span>
                                                            <span>{cp.temperature}°C</span>
                                                            {cp.temperature > (selectedBatch.optimalTempMax + 5) && (
                                                                <span style={{ fontSize: '0.75rem', color: '#ff0000' }}>⚠️ Exceeded</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.5 }}>N/A</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '6px',
                                                        background: cp.withinRange ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                                                        color: cp.withinRange ? '#00ff88' : '#ff0000',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {cp.withinRange ? 'SAFE' : 'ALERT'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(cp.timestamp)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Checkpoints Table (Legacy - all checkpoints view) */}
                {activeTab === 'checkpoints' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>📍 All Checkpoints</h3>
                            <button
                                onClick={() => {
                                    setSelectedBatch(null)
                                    setShowMapModal(true)
                                }}
                                className="btn-primary"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                    fontSize: '0.9rem',
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                🗺️ Visualize All Data
                            </button>
                        </div>
                        {filteredCheckpoints.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No checkpoints found</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Batch ID</th>
                                            <th>Medicine</th>
                                            <th>Checkpoint</th>
                                            <th>Sticker Color</th>
                                            <th>Location</th>
                                            <th>Temperature</th>
                                            <th>Status</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCheckpoints.map((cp, idx) => (
                                            <tr key={idx}>
                                                <td><code>{cp.batchId}</code></td>
                                                <td><strong>{cp.medicineName}</strong></td>
                                                <td>{cp.checkpoint}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            background: getColorBadge(cp.stickerColor),
                                                            border: '2px solid rgba(255, 255, 255, 0.2)'
                                                        }} />
                                                        <span style={{ textTransform: 'capitalize' }}>{cp.stickerColor}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {cp.latitude && cp.longitude ? (
                                                        <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                                                            <div>{Number(cp.latitude).toFixed(4)} N</div>
                                                            <div>{Number(cp.longitude).toFixed(4)} E</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.3 }}>-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {cp.temperature !== null && cp.temperature !== undefined ? (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            color: cp.optimalTempMax && cp.temperature > (cp.optimalTempMax + 5) ? '#ff0000' :
                                                                cp.optimalTempMax && cp.temperature > cp.optimalTempMax ? '#ffdd00' : '#00ff88',
                                                            fontWeight: cp.optimalTempMax && cp.temperature > cp.optimalTempMax ? 600 : 400
                                                        }}>
                                                            <span>🌡️</span>
                                                            <span>{cp.temperature}°C</span>
                                                            {cp.optimalTempMax && cp.temperature > (cp.optimalTempMax + 5) && (
                                                                <span style={{ fontSize: '0.75rem', color: '#ff0000' }}>⚠️</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ opacity: 0.5 }}>N/A</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '6px',
                                                        background: cp.withinRange ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                                                        color: cp.withinRange ? '#00ff88' : '#ff0000',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {cp.withinRange ? 'SAFE' : 'ALERT'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(cp.timestamp)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tablets Table */}
                {activeTab === 'tablets' && (
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem' }}>💊 Tablets</h3>
                        {filteredTablets.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No tablets found</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tablet ID</th>
                                            <th>Batch ID</th>
                                            <th>Medicine</th>
                                            <th>Batch Status</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTablets.map((tablet) => (
                                            <tr key={tablet.tabletId}>
                                                <td><code>{tablet.tabletId}</code></td>
                                                <td><code>{tablet.batchId}</code></td>
                                                <td><strong>{tablet.medicineName}</strong></td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '6px',
                                                        background: `${getStatusColor(tablet.batchStatus)}20`,
                                                        color: getStatusColor(tablet.batchStatus),
                                                        fontSize: '0.85rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {tablet.batchStatus}
                                                    </span>
                                                </td>
                                                <td>{formatDate(tablet.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Generated Tablets Modal */}
                {generatedTablets && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }}>
                        <div className="card" style={{
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2>💊 Generated Tablet QR Codes</h2>
                                <button
                                    onClick={() => setGeneratedTablets(null)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '1rem'
                                    }}
                                >
                                    ✕ Close
                                </button>
                            </div>
                            <p className="text-secondary mb-3">
                                Batch: <code>{generatedTablets.batchId}</code> • {generatedTablets.tablets.length} tablets generated
                            </p>
                            <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
                                These QR codes can be scanned by consumers to verify medicine safety.
                            </p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '1rem',
                                marginTop: '1.5rem'
                            }}>
                                {generatedTablets.tablets.map((tablet) => (
                                    <div key={tablet.tabletId} className="card" style={{
                                        padding: '1rem',
                                        textAlign: 'center',
                                        background: 'var(--bg-card)'
                                    }}>
                                        <div style={{
                                            background: 'white',
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            marginBottom: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={tablet.qrCode}
                                                alt={`Tablet ${tablet.tabletId}`}
                                                style={{ width: '100%', maxWidth: '120px', height: 'auto' }}
                                            />
                                        </div>
                                        <p className="mono" style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            wordBreak: 'break-all'
                                        }}>
                                            {tablet.tabletId}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Map Modal */}
                {showMapModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }} onClick={() => setShowMapModal(false)}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: '95vw',
                            height: '100%',
                            maxHeight: '90vh',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>
                                        🗺️ {selectedBatch ? `Batch: ${selectedBatch.batchId}` : 'All Checkpoints Map'}
                                    </h2>
                                    <p style={{ margin: '0 0 0.5rem 0', opacity: 0.7 }}>
                                        {selectedBatch
                                            ? 'Visualizing journey flow'
                                            : 'Visualizing all checkpoint activity across Nepal'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowMapModal(false)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕ Close
                                </button>
                            </div>

                            <div style={{
                                flex: 1,
                                background: '#f9fafb',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Filter Controls */}
                                <div style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '25px',
                                    zIndex: 10000,
                                    display: 'flex',
                                    gap: '8px',
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    {[
                                        { id: 'all', label: 'All', color: '#4b5563' },
                                        { id: 'safe', label: 'Safe', color: '#10b981' },
                                        { id: 'warning', label: 'Warning', color: '#f59e0b' },
                                        { id: 'critical', label: 'Critical', color: '#ef4444' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={(e) => { e.stopPropagation(); setMapFilter(f.id); }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: mapFilter === f.id ? f.color : '#f3f4f6',
                                                color: mapFilter === f.id ? 'white' : '#374151',
                                                fontWeight: '600',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                boxShadow: mapFilter === f.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <MapContainer
                                    center={[28.3, 84.1]}
                                    zoom={7}
                                    style={{ height: '100%', width: '100%', background: '#ffffff' }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    />
                                    <MapClickHandler onClick={() => setHighlightedBatchId(null)} />

                                    {/* Data Logic */}
                                    {(() => {
                                        // Helper for colors
                                        const stringToColor = (str) => {
                                            let hash = 0;
                                            for (let i = 0; i < str.length; i++) {
                                                hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                            }
                                            const hue = Math.abs(hash % 360);
                                            return `hsl(${hue}, 70%, 50%)`;
                                        };

                                        const pointsToShow = selectedBatch
                                            ? batchCheckpoints
                                            : data.checkpoints;

                                        // Group by Batch ID
                                        const batches = {};
                                        pointsToShow.forEach(cp => {
                                            if (!cp.latitude || !cp.longitude) return;
                                            if (!batches[cp.batchId]) batches[cp.batchId] = [];
                                            batches[cp.batchId].push(cp);
                                        });

                                        const renderElements = [];

                                        Object.entries(batches).forEach(([batchId, points]) => {
                                            // Sort by time
                                            points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                            const lineColor = selectedBatch ? '#6366f1' : stringToColor(batchId);

                                            // Highlight Logic
                                            const isDimmed = highlightedBatchId && batchId !== highlightedBatchId;
                                            const isHighlighted = highlightedBatchId === batchId;

                                            // Line
                                            if (points.length > 1) {
                                                renderElements.push(
                                                    <Polyline
                                                        key={`line-${batchId}`}
                                                        positions={points.map(cp => [cp.latitude, cp.longitude])}
                                                        pathOptions={{
                                                            color: lineColor,
                                                            dashArray: selectedBatch ? '10, 10' : '5, 5',
                                                            weight: isHighlighted ? 5 : (selectedBatch ? 3 : 2),
                                                            opacity: isDimmed ? 0.2 : 0.8
                                                        }}
                                                    />
                                                );
                                            }

                                            // Markers
                                            points.forEach((cp, i) => {
                                                // Determine effective status
                                                // If sticker is red OR temp exceeds limit, treat as Alert
                                                const maxTemp = cp.optimalTempMax || 25;
                                                const isTempExceeded = cp.temperature > (maxTemp + 5);
                                                const isCritical = cp.stickerColor === 'red' || isTempExceeded;

                                                const effectiveStatus = isCritical ? 'red' : cp.stickerColor;

                                                // Filter Check
                                                if (mapFilter !== 'all') {
                                                    if (mapFilter === 'safe' && effectiveStatus !== 'green') return;
                                                    if (mapFilter === 'warning' && effectiveStatus !== 'yellow') return;
                                                    if (mapFilter === 'critical' && effectiveStatus !== 'red') return;
                                                }

                                                const badgeColor = getColorBadge(effectiveStatus);

                                                const customIcon = L.divIcon({
                                                    className: 'custom-icon',
                                                    html: `<div style="
                                                        width: 24px; 
                                                        height: 24px; 
                                                        background: ${badgeColor}; 
                                                        border-radius: 50%; 
                                                        border: 2px solid ${lineColor};
                                                        box-shadow: 0 0 10px ${badgeColor};
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        font-weight: bold;
                                                        font-size: 12px;
                                                        color: #000;
                                                        opacity: ${isDimmed ? 0.6 : 1};
                                                    ">${isCritical ? '!' : i + 1}</div>`,
                                                    iconSize: [28, 28],
                                                    iconAnchor: [14, 14]
                                                });

                                                renderElements.push(
                                                    <Marker
                                                        key={`marker-${batchId}-${i}`}
                                                        position={[cp.latitude, cp.longitude]}
                                                        icon={customIcon}
                                                        opacity={isDimmed ? 0.4 : 1.0}
                                                        zIndexOffset={isHighlighted ? 1000 : 0}
                                                        eventHandlers={{
                                                            click: () => setHighlightedBatchId(batchId)
                                                        }}
                                                    >
                                                        <Popup>
                                                            <div style={{ color: '#333' }}>
                                                                <strong>#{i + 1} {cp.checkpoint}</strong><br />
                                                                <span style={{ color: '#666', fontSize: '0.8rem' }}>Batch: <span style={{ color: lineColor, fontWeight: 'bold' }}>{batchId}</span></span><br />
                                                                Status: <span style={{
                                                                    color: isCritical ? '#dc2626' : effectiveStatus === 'yellow' ? '#d97706' : '#16a34a',
                                                                    fontWeight: 'bold',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {isCritical ? '🚨 ALERT' : effectiveStatus === 'yellow' ? '⚠️ WARNING' : '✅ SAFE'}
                                                                </span><br />
                                                                {isTempExceeded && <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 'bold' }}>(Temp Violation)<br /></span>}
                                                                Temperature: <strong>{cp.temperature ? `${cp.temperature}°C` : 'N/A'}</strong><br />
                                                                Time: {new Date(cp.timestamp).toLocaleTimeString()}
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            });
                                        });

                                        return <>{renderElements}</>;
                                    })()}
                                </MapContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={fetchData}>
                        🔄 Refresh Data
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        style={{
                            background: isAutoRefresh
                                ? 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'
                                : 'rgba(255, 255, 255, 0.1)',
                            borderColor: isAutoRefresh ? '#00ff88' : 'rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        {isAutoRefresh ? '⏸️ Pause Auto-Refresh' : '▶️ Resume Auto-Refresh'}
                    </button>
                    {data?.lastUpdated && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)'
                        }}>
                            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                        </div>
                    )}
                    <button
                        className="btn-primary"
                        onClick={clearDatabase}
                        style={{
                            background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
                            borderColor: '#ff0000'
                        }}
                    >
                        🗑️ Clear Database
                    </button>
                </div>
            </div >

            <style>{`
        .stat-card {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.1);
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: bold;
          color: #00ff88;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          padding: 1rem;
          text-align: left;
          border-bottom: 2px solid rgba(0, 255, 136, 0.3);
          color: #00ff88;
          font-weight: bold;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .data-table tbody tr {
          transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: rgba(0, 255, 136, 0.05);
        }

        .data-table code {
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: #00ff88;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(0, 255, 136, 0.2);
          border-top-color: #00ff88;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .error-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          text-align: center;
        }
      `}</style>
        </div >
    )
}

export default DatabaseViewer
