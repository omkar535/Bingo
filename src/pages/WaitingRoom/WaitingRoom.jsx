import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useRoomRealtime } from '../../hooks/useRoomRealtime'
import { useCurrentPlayer } from '../../hooks/useCurrentPlayer'
import { kickPlayer, leaveRoom, startGame, toggleReady } from '../../services/roomService'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import Button from '../../components/Button/Button'
import './WaitingRoom.css'

export default function WaitingRoom() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { room, players, loading } = useRoomRealtime(roomId)
  const me = useCurrentPlayer(players)
  const [copyText, setCopyText] = useState('Copy Code')

  useEffect(() => {
    if (room?.status === 'setup' || room?.status === 'playing') {
      navigate(`/game/${roomId}`)
    }
  }, [room, roomId, navigate])

  if (loading || !room) {
    return <div className="center-screen">Loading room...</div>
  }

  const isHost = room.host_id === user.id
  const allReady = players.length > 0 && players.every((p) => p.is_ready)
  const canStart = players.length >= 2 && allReady

  const handleReadyToggle = async () => {
    try {
      await toggleReady(roomId, user.id, !me.is_ready)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleKick = async (userId) => {
    try {
      await kickPlayer(roomId, userId)
      showToast('Player removed from room', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleStart = async () => {
    try {
      const orderedIds = players
        .slice()
        .sort((a, b) => a.join_order - b.join_order)
        .map((p) => p.user_id)
      await startGame(roomId, orderedIds)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveRoom(roomId, user.id)
      navigate('/')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(room.code)
    setCopyText('Copied!')
    setTimeout(() => setCopyText('Copy Code'), 1500)
  }

  return (
    <div className="page-container">
      <div className="waiting-header">
        <div>
          <h1 className="page-title">Waiting Room</h1>
          <p className="waiting-sub">
            {players.length}/10 players &middot; minimum 2 to start
          </p>
        </div>
        <div className="room-code-box">
          <span>Room Code</span>
          <strong>{room.code}</strong>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copyText}
          </Button>
        </div>
      </div>

      <div className="grid-list waiting-players">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={{ ...p.profile, is_ready: p.is_ready }}
            isHost={p.is_host}
            showReady
            showKick={isHost && !p.is_host}
            onKick={() => handleKick(p.user_id)}
          />
        ))}
      </div>

      <div className="waiting-actions">
        {!isHost && (
          <Button variant={me?.is_ready ? 'secondary' : 'success'} onClick={handleReadyToggle}>
            {me?.is_ready ? 'Not Ready' : 'Ready Up'}
          </Button>
        )}
        {isHost && (
          <Button onClick={handleStart} disabled={!canStart}>
            {canStart ? 'Start Game' : 'Waiting for players...'}
          </Button>
        )}
        <Button variant="ghost" onClick={handleLeave}>
          Leave Room
        </Button>
      </div>
    </div>
  )
}
