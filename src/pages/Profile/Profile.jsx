import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  changePassword,
  changeUsername,
  deleteAccount,
  reauthenticate,
  updateProfile,
} from '../../services/authService'
import Button from '../../components/Button/Button'
import Modal from '../../components/Modal/Modal'
import './Profile.css'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      if (username.trim().toLowerCase() !== profile.username) {
        await changeUsername(profile.id, username)
      }
      if (displayName.trim() !== profile.display_name) {
        await updateProfile(profile.id, { display_name: displayName.trim() })
      }
      await refreshProfile()
      showToast('Profile updated', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error')
      return
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Passwords do not match.', 'error')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(newPassword)
      setNewPassword('')
      setConfirmNewPassword('')
      showToast('Password changed', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    try {
      await reauthenticate(profile.username, deletePassword)
      await deleteAccount()
      showToast('Account deleted', 'info')
      navigate('/login')
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (!profile) return <div className="center-screen">Loading profile...</div>

  return (
    <div className="page-container">
      <h1 className="page-title">Profile</h1>

      <div className="card profile-card">
        <h3>Account Details</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>

      <div className="card profile-card">
        <h3>Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              type="password"
              className="form-input"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>

      <div className="card profile-card profile-danger">
        <h3>Danger Zone</h3>
        <p className="profile-danger-text">
          Deleting your account is permanent and cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          Delete Account
        </Button>
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm Account Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </>
        }
      >
        <p className="profile-danger-text">
          Enter your password to permanently delete your account.
        </p>
        <div className="form-group">
          <label htmlFor="deletePassword">Password</label>
          <input
            id="deletePassword"
            type="password"
            className="form-input"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </div>
        {deleteError && <p className="form-error">{deleteError}</p>}
      </Modal>
    </div>
  )
}
