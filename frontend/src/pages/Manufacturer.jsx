import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBatch } from '../utils/api'

export default function Manufacturer() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    medicineName: '',
    optimalTempMin: 2,
    optimalTempMax: 25
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const batch = await createBatch({
        medicineName: formData.medicineName,
        optimalTempMin: Number(formData.optimalTempMin),
        optimalTempMax: Number(formData.optimalTempMax)
      })
      // Navigate to the success page with the batch data
      navigate('/batch-created', { state: { batch } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '600px' }}>
        <header className="text-center mb-4">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏭</div>
          <h1>Manufacturer</h1>
          <p className="text-secondary">Create new medicine batches</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="medicineName">Medicine Name</label>
              <input
                type="text"
                id="medicineName"
                name="medicineName"
                className="input"
                placeholder="e.g., Insulin, Vaccine, Amoxicillin"
                value={formData.medicineName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex gap-2">
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="optimalTempMin">Min Temp (°C)</label>
                <input
                  type="number"
                  id="optimalTempMin"
                  name="optimalTempMin"
                  className="input"
                  value={formData.optimalTempMin}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="optimalTempMax">Max Temp (°C)</label>
                <input
                  type="number"
                  id="optimalTempMax"
                  name="optimalTempMax"
                  className="input"
                  value={formData.optimalTempMax}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="card" style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: '1.5rem'
            }}>
              <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
                <strong>🌡️ Temperature Sticker</strong><br />
                Each batch includes a color-changing sticker:
              </p>
              <div className="flex gap-2 mt-2" style={{ fontSize: '0.875rem' }}>
                <span>🟢 Safe</span>
                <span>🟡 Warning</span>
                <span>🔴 Overheated</span>
              </div>
            </div>

            {error && (
              <div className="card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: '1rem'
              }}>
                <p className="text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading || !formData.medicineName}
            >
              {loading ? (
                <>
                  <span className="loader" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                  Creating...
                </>
              ) : (
                <>🏭 Create Batch</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

