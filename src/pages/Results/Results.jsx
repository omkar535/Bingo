import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useRoomRealtime } from '../../hooks/useRoomRealtime'
import { rankLabel } from '../../utils/bingoLogic'
import { resetRoomForRematch } from '../../services/gameService'
import Button from '../../components/Button/Button'
import './Results.css'

const MEDAL_ICON = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Results() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { room, players, loading } = useRoomRealtime(roomId)

  if (loading || !room) {
    return <div className="center-screen">Loading results...</div>
  }

  const ranked = players.slice().sort((a, b) => (a.rank || 99) - (b.rank || 99))
  const isHost = room.host_id === user.id

  const handlePlayAgain = async () => {
    try {
      await resetRoomForRematch(roomId)
      navigate(`/waiting-room/${roomId}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Final Results 🏆</h1>

      <div className="results-list">
        {ranked.map((p) => (
          <div key={p.id} className={`results-row ${p.user_id === user.id ? 'results-row-me' : ''}`}>
            <div className="results-rank">
              {MEDAL_ICON[p.rank] || `#${p.rank ?? '-'}`}
            </div>
            <div className="results-avatar" style={{ background: p.profile?.avatar_color || '#6c3ce9' }}>
              {(p.profile?.display_name || '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="results-info">
              <span className="results-name">
                {p.profile?.username} <span className="results-display">({p.profile?.display_name})</span>
              </span>
              <span className="results-label">{p.rank ? rankLabel(p.rank) : 'Unranked'}</span>
            </div>
            <div className="results-stats">
              <span>{(p.lines_struck || []).length}/5 letters</span>
            </div>
          </div>
        ))}
      </div>

      <div className="results-actions">
        {isHost && <Button onClick={handlePlayAgain}>Play Again</Button>}
        <Button variant="secondary" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    </div>
  )
}
