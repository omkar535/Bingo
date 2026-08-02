import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logoutUser } from '../../services/authService'
import { useToast } from '../../context/ToastContext'
import './Sidebar.css'

const links = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/profile', label: 'Profile', icon: '👤' },
  { to: '/friends', label: 'Friends', icon: '🤝' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const handleLogout = async () => {
    try {
      await logoutUser()
      showToast('Logged out successfully', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {(profile?.display_name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="sidebar-username">{profile?.username}</p>
            <p className="sidebar-displayname">{profile?.display_name}</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
          <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            Logout
          </button>
        </nav>
      </aside>
    </>
  )
}
