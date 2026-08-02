import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/authService'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/Button/Button'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    if (!USERNAME_RE.test(form.username.trim())) {
      return 'Username must be 3-20 characters (letters, numbers, underscores only).'
    }
    if (!form.displayName.trim()) {
      return 'Display name is required.'
    }
    if (form.password.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.'
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      await registerUser({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
      })
      showToast('Account created! Welcome to BINGO.', 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>BINGO</h1>
        <p className="auth-subtitle">Create your account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              value={form.username}
              onChange={update('username')}
              placeholder="unique_username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              className="form-input"
              value={form.displayName}
              onChange={update('displayName')}
              placeholder="Shown to other players"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={form.password}
              onChange={update('password')}
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Re-enter password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
