import { Link } from 'react-router-dom'

export default function Home() {
  const roles = [
    {
      path: '/manufacturer',
      icon: '🏭',
      title: 'Manufacturer',
      description: 'Create new medicine batches and generate QR codes for tracking through the supply chain.',
      accent: '#6366f1'
    },
    {
      path: '/checkpoint',
      icon: '🚚',
      title: 'Checkpoint / Transport',
      description: 'Scan batch QR codes and sticker colors at each checkpoint to log temperature conditions.',
      accent: '#f59e0b'
    },
    {
      path: '/pharmacist',
      icon: '💊',
      title: 'Pharmacist',
      description: 'Verify batch status, view journey timeline, and generate tablet QR codes for consumers.',
      accent: '#10b981'
    },
    {
      path: '/consumer',
      icon: '👤',
      title: 'Consumer',
      description: 'Scan tablet QR to verify authenticity and check if medicine was properly stored.',
      accent: '#8b5cf6'
    }
  ]

  return (
    <div className="page">
      <div className="container">
        <header className="text-center mb-4" style={{ paddingTop: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ marginBottom: '0.5rem' }}>PharmaGuard</h1>
          <p className="text-secondary" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
            Camera-First Thermal Safety System
          </p>
          <p className="text-muted mt-2" style={{ maxWidth: '500px', margin: '1rem auto 0' }}>
            Protecting medicines from invisible damage. Because a drug can be <strong style={{ color: '#10b981' }}>genuine</strong> yet <strong style={{ color: '#ef4444' }}>unsafe</strong> due to heat exposure.
          </p>
        </header>

        <div className="role-grid">
          {roles.map((role) => (
            <Link 
              key={role.path} 
              to={role.path} 
              className="role-card"
              style={{ '--card-accent': role.accent }}
            >
              <div className="role-icon" style={{ background: `${role.accent}20` }}>
                {role.icon}
              </div>
              <h3 className="role-title">{role.title}</h3>
              <p className="role-desc">{role.description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-4" style={{ maxWidth: '700px', margin: '4rem auto' }}>
          <h2 className="text-center mb-3">How It Works</h2>
          
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot safe"></div>
              <div className="timeline-content">
                <div className="timeline-title">1. Batch Created</div>
                <p className="text-muted">Manufacturer creates batch with temperature-sensitive sticker. QR code generated.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-dot warning"></div>
              <div className="timeline-content">
                <div className="timeline-title">2. Checkpoints Scanned</div>
                <p className="text-muted">At each transit point, camera scans QR and sticker color. System logs conditions.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-dot safe"></div>
              <div className="timeline-content">
                <div className="timeline-title">3. Pharmacist Verifies</div>
                <p className="text-muted">Pharmacist scans batch, sees full journey, generates tablet QR codes.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-dot danger"></div>
              <div className="timeline-content">
                <div className="timeline-title">4. Consumer Checks</div>
                <p className="text-muted">Consumer scans tablet QR to verify: Genuine ✓ but was it kept safe?</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-muted" style={{ padding: '2rem 0', fontSize: '0.875rem' }}>
          <p>PharmaGuard - Detecting Substandard Drugs, Not Just Fake Ones</p>
          <p className="mt-1">Built for PharmaHack 2026</p>
        </footer>
      </div>
    </div>
  )
}

