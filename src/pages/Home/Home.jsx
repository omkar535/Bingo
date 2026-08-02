import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { createRoom, joinRoom } from '../../services/roomService'
import RoomCard from '../../components/RoomCard/RoomCard'
import Modal from '../../components/Modal/Modal'
import Button from '../../components/Button/Button'
import './Home.css'

export default function Home() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async () => {
    setLoading(true)
    try {
      const room = await createRoom(user.id)
      showToast(`Room ${room.code} created!`, 'success')
      navigate(`/waiting-room/${room.id}`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 6) {
      setError('Room code must be exactly 6 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const room = await joinRoom(code, user.id)
      setJoinModalOpen(false)
      navigate(`/waiting-room/${room.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Hey {profile?.display_name || 'there'} 👋</h1>
      <p className="home-subtitle">Ready to play some Bingo?</p>

      <div className="flex-row home-cards">
        <RoomCard
          icon="🎉"
          title="Create Room"
          description="Start a new game and invite your friends with a room code."
          onClick={handleCreateRoom}
        />
        <RoomCard
          icon="🔑"
          title="Join Room"
          description="Enter a 6-character room code to join an existing game."
          onClick={() => setJoinModalOpen(true)}
        />
      </div>

      <Modal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join a Room"
        footer={
          <>
            <Button variant="ghost" onClick={() => setJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinRoom} disabled={loading}>
              {loading ? 'Joining...' : 'Join'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label htmlFor="roomCode">Room Code</label>
            <input
              id="roomCode"
              className="form-input room-code-input"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoFocus
            />
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
