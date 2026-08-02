import { rankLabel } from '../../utils/bingoLogic'
import './PlayerCard.css'

export default function PlayerCard({
  player,
  isCurrentTurn = false,
  isHost = false,
  showReady = false,
  showKick = false,
  onKick,
}) {
  const initials = (player.display_name || player.username || '?').slice(0, 2).toUpperCase()

  return (
    <div className={`player-card ${isCurrentTurn ? 'player-card-active' : ''}`}>
      <div className="player-avatar" style={{ background: player.avatar_color || '#6c3ce9' }}>
        {initials}
      </div>
      <div className="player-info">
        <span className="player-name">
          {player.username} <span className="player-display">({player.display_name})</span>
        </span>
        <div className="player-tags">
          {isHost && <span className="tag tag-host">Host</span>}
          {showReady && (
            <span className={`tag ${player.is_ready ? 'tag-ready' : 'tag-not-ready'}`}>
              {player.is_ready ? 'Ready' : 'Not Ready'}
            </span>
          )}
          {player.rank && <span className="tag tag-rank">{rankLabel(player.rank)}</span>}
          {isCurrentTurn && !player.rank && <span className="tag tag-turn">Current Turn</span>}
        </div>
      </div>
      {showKick && (
        <button className="player-kick" onClick={onKick} aria-label="Kick player">
          Kick
        </button>
      )}
    </div>
  )
}
