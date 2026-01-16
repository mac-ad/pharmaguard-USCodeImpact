import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../utils/api'

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

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/database/all`)
            if (!response.ok) throw new Error('Failed to fetch database data')
            const result = await response.json()
            setData(result)
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

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div className="page-icon">🗄️</div>
                    <div>
                        <h1 className="page-title">Database Viewer</h1>
                        <p className="page-subtitle">Complete view of all system data</p>
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
                        <h3 style={{ marginBottom: '1.5rem' }}>📍 All Checkpoints</h3>
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

                {/* Action Buttons */}
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={fetchData}>
                        🔄 Refresh Data
                    </button>
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
            </div>

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

        .error-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          text-align: center;
        }
      `}</style>
        </div>
    )
}

export default DatabaseViewer
