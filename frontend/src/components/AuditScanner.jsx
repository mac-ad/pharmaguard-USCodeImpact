
import { useRef, useState } from 'react'
import { performAudit } from '../utils/api'

export default function AuditScanner({ onClose }) {
    const videoRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [capturedImage, setCapturedImage] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Start Camera
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err) {
            setError('Could not access camera. Please allow permission or upload a file.')
        }
    }

    // Capture Image
    const captureImage = () => {
        if (!videoRef.current) return
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(videoRef.current, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(dataUrl)
        stopCamera()
    }

    // File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setCapturedImage(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    // Stop Camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }

    // Perform Audit
    const runAudit = async () => {
        if (!capturedImage) return
        setLoading(true)
        setError(null)

        try {
            const result = await performAudit(capturedImage)
            if (result.error) {
                setError(result.error + (result.reason ? `: ${result.reason}` : ''))
            } else {
                setAnalysis(result)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Reset
    const reset = () => {
        setCapturedImage(null)
        setAnalysis(null)
        setError(null)
        startCamera()
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
                <div className="flex-between mb-3">
                    <h3>🔍 Verify TTI Safety</h3>
                    <button onClick={onClose} className="btn-icon">✕</button>
                </div>

                {!capturedImage ? (
                    <div className="text-center">
                        <div className="camera-container mb-3" style={{ height: '300px', background: '#000' }}>
                            {stream ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div className="flex-center h-100 flex-col">
                                    <p className="text-white mb-2">Camera not active</p>
                                    <button onClick={startCamera} className="btn btn-primary">Start Camera</button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={captureImage}
                                disabled={!stream}
                                className="btn btn-primary"
                                style={{ minWidth: '150px' }}
                            >
                                Capture Photo
                            </button>
                            <div className="file-upload-btn btn btn-outline" style={{ position: 'relative', overflow: 'hidden' }}>
                                Upload Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0 }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-3" style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border)' }}>
                            <img src={capturedImage} alt="Captured" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                        </div>

                        {!analysis ? (
                            <div className="text-center">
                                <button
                                    onClick={runAudit}
                                    disabled={loading}
                                    className="btn btn-primary btn-lg btn-block mb-2"
                                >
                                    {loading ? '🤖 AI Auditing...' : 'Verify Image with AI'}
                                </button>
                                <button onClick={reset} className="btn btn-outline btn-block">Retake Photo</button>
                            </div>
                        ) : (
                            <div className="audit-results animate-fade-in">
                                <div className={`result-card ${analysis.audit_results.safety_verdict === 'DISCARD' ? 'danger' : analysis.audit_results.safety_verdict === 'SAFE' ? 'safe' : 'warning'}`}>
                                    <div className="result-icon">
                                        {analysis.audit_results.safety_verdict === 'DISCARD' ? '🛑' : analysis.audit_results.safety_verdict === 'SAFE' ? '✅' : '⚠️'}
                                    </div>
                                    <div className="result-title">
                                        Verdict: {analysis.audit_results.safety_verdict}
                                    </div>
                                </div>

                                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                                    <div className="grid-2">
                                        <div>
                                            <label className="text-muted text-xs">SERIAL NO</label>
                                            <div className="font-bold">{analysis.audit_results.indicator_serial || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <label className="text-muted text-xs">THRESHOLD</label>
                                            <div className="font-bold">{analysis.audit_results.temp_threshold || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <label className="text-muted text-xs">ACTIVATED</label>
                                            <div className={analysis.audit_results.is_active ? 'text-primary font-bold' : 'text-muted'}>
                                                {analysis.audit_results.is_active ? 'YES' : 'NO'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-muted text-xs">BREACH DETECTED</label>
                                            <div className={analysis.audit_results.breach_detected ? 'text-danger font-bold' : 'text-success font-bold'}>
                                                {analysis.audit_results.breach_detected ? 'YES' : 'NO'}
                                            </div>
                                        </div>
                                        {analysis.audit_results.breach_detected && (
                                            <div className="col-span-2">
                                                <label className="text-muted text-xs">MAX EXPOSURE TIME</label>
                                                <div className="text-danger font-bold text-lg">
                                                    {analysis.audit_results.max_exposure_hours} hours
                                                </div>
                                                <div className="text-xs text-muted">Time above threshold</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <button onClick={onClose} className="btn btn-primary flex-1">Done</button>
                                    <button onClick={reset} className="btn btn-outline flex-1">Scan Another</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="card mt-3" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}
