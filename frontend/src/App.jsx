import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Manufacturer from './pages/Manufacturer'
import Checkpoint from './pages/Checkpoint'
import Pharmacist from './pages/Pharmacist'
import Consumer from './pages/Consumer'

function App() {
  const location = useLocation()
  
  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <div className="nav-brand-icon">🛡️</div>
          <span className="nav-brand-text">PharmaGuard</span>
        </Link>
        <div className="nav-links">
          <Link 
            to="/manufacturer" 
            className={`nav-link ${location.pathname === '/manufacturer' ? 'active' : ''}`}
          >
            Manufacturer
          </Link>
          <Link 
            to="/checkpoint" 
            className={`nav-link ${location.pathname === '/checkpoint' ? 'active' : ''}`}
          >
            Checkpoint
          </Link>
          <Link 
            to="/pharmacist" 
            className={`nav-link ${location.pathname === '/pharmacist' ? 'active' : ''}`}
          >
            Pharmacist
          </Link>
          <Link 
            to="/consumer" 
            className={`nav-link ${location.pathname === '/consumer' ? 'active' : ''}`}
          >
            Consumer
          </Link>
        </div>
      </nav>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manufacturer" element={<Manufacturer />} />
        <Route path="/checkpoint" element={<Checkpoint />} />
        <Route path="/pharmacist" element={<Pharmacist />} />
        <Route path="/consumer" element={<Consumer />} />
      </Routes>
    </>
  )
}

export default App

