import { useNavigate } from 'react-router-dom'
import './Navbar.css'

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <button
        className="navbar-hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>
      <button className="navbar-logo" onClick={() => navigate('/')}>
        BINGO
      </button>
    </header>
  )
}
