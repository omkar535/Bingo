import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useRoomRealtime } from '../../hooks/useRoomRealtime'
import { useCurrentPlayer } from '../../hooks/useCurrentPlayer'
import { generateRandomGrid, hasFullBingo, LETTERS } from '../../utils/bingoLogic'
import {
  allPlayersGridReady,
  beginPlaying,
  clickBingo,
  selectNumber,
  submitGrid,
} from '../../services/gameService'
import Grid from '../../components/Grid/Grid'
import Cell from '../../components/Cell/Cell'
import Button from '../../components/Button/Button'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import './Game.css'

export default function Game() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { room, players, loading } = useRoomRealtime(roomId)
  const me = useCurrentPlayer(players)

  const [draftGrid, setDraftGrid] = useState(null)
  const [placedCount, setPlacedCount] = useState(0)
  const startTriggered = useRef(false)

  useEffect(() => {
    if (room?.status === 'finished') {
      navigate(`/results/${roomId}`)
    }
  }, [room, roomId, navigate])

  // Host transitions the room from 'setup' to 'playing' once every
  // player has submitted a completed grid.
  useEffect(() => {
    async function tryBeginPlaying() {
      if (!room || room.status !== 'setup') return
      if (room.host_id !== user.id) return
      if (startTriggered.current) return
      const ready = await allPlayersGridReady(roomId)
      if (ready) {
        startTriggered.current = true
        try {
          await beginPlaying(roomId)
        } catch {
          startTriggered.current = false
        }
      }
    }
    tryBeginPlaying()
  }, [room, players, roomId, user.id])

  if (loading || !room || !me) {
    return <div className="center-screen">Loading game...</div>
  }

  // ---------- SETUP PHASE ----------
  if (room.status === 'setup') {
    const handleRandom = () => {
      setDraftGrid(generateRandomGrid())
      setPlacedCount(25)
    }

    const handleCreateOwnClick = (index) => {
      if (draftGrid && draftGrid[index] !== null) return
      const grid = draftGrid ? [...draftGrid] : Array(25).fill(null)
      grid[index] = placedCount + 1
      setDraftGrid(grid)
      setPlacedCount((c) => c + 1)
    }

    const startCreateOwn = () => {
      setDraftGrid(Array(25).fill(null))
      setPlacedCount(0)
    }

    const handleSubmit = async () => {
      try {
        await submitGrid(roomId, user.id, draftGrid)
        showToast('Grid submitted! Waiting for other players...', 'success')
      } catch (err) {
        showToast(err.message, 'error')
      }
    }

    const isComplete = draftGrid && draftGrid.every((n) => n !== null) && placedCount === 25

    if (me.grid_ready) {
      return (
        <div className="page-container center-screen">
          <p>Your grid is locked in. Waiting for other players to finish setting up...</p>
        </div>
      )
    }

    return (
      <div className="page-container">
        <h1 className="page-title">Set Up Your Grid</h1>
        {!draftGrid && (
          <div className="flex-row setup-choice">
            <Button onClick={handleRandom}>🎲 Random Grid</Button>
            <Button variant="secondary" onClick={startCreateOwn}>
              ✍️ Create Your Own
            </Button>
          </div>
        )}

        {draftGrid && (
          <>
            <p className="setup-hint">
              {placedCount < 25
                ? `Click an empty cell to place number ${placedCount + 1} of 25`
                : 'Grid complete! Ready to submit.'}
            </p>
            <div className="bingo-grid-wrap">
              <div className="bingo-letters">
                {LETTERS.map((letter) => (
                  <span key={letter} className="bingo-letter">
                    {letter}
                  </span>
                ))}
              </div>
              <div className="bingo-grid">
                {draftGrid.map((val, idx) => (
                  <Cell
                    key={idx}
                    number={val ?? ''}
                    isMarked={false}
                    isClickable={val === null}
                    onClick={() => handleCreateOwnClick(idx)}
                  />
                ))}
              </div>
            </div>
            <div className="setup-actions">
              <Button variant="ghost" onClick={() => { setDraftGrid(null); setPlacedCount(0) }}>
                Restart
              </Button>
              <Button onClick={handleSubmit} disabled={!isComplete}>
                Start
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------- PLAYING PHASE ----------
  const currentTurnUserId = room.turn_order[room.current_turn_index]
  const isMyTurn = currentTurnUserId === user.id && !me.has_bingo
  const numbersCalled = room.numbers_called || []
  const canClaimBingo = hasFullBingo(me.lines_struck || []) && !me.has_bingo

  const handleSelect = async (number) => {
    if (!isMyTurn) return
    try {
      await selectNumber(room, number)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleBingo = async () => {
    try {
      const rank = await clickBingo(roomId, user.id)
      showToast(`BINGO! You placed #${rank}`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="page-container">
      <div className="player-panel grid-list">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={{ ...p.profile, rank: p.rank }}
            isCurrentTurn={p.user_id === currentTurnUserId && !p.has_bingo}
          />
        ))}
      </div>

      <div className="game-status">
        {isMyTurn ? (
          <p className="game-status-active">Your turn — pick a number!</p>
        ) : (
          <p>
            Waiting for{' '}
            {players.find((p) => p.user_id === currentTurnUserId)?.profile?.display_name ||
              'next player'}
            ...
          </p>
        )}
      </div>

      <Grid
        grid={me.grid}
        markedNumbers={numbersCalled}
        struckLetters={me.lines_struck || []}
        isSelectable={isMyTurn}
        onSelectNumber={handleSelect}
      />

      {canClaimBingo && (
        <div className="bingo-claim">
          <Button variant="success" size="lg" onClick={handleBingo}>
            🎉 BINGO!
          </Button>
        </div>
      )}
    </div>
  )
}
