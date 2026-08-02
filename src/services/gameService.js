import { supabase } from '../lib/supabase'
import { computeStruckLetters, hasFullBingo } from '../utils/bingoLogic'

export async function submitGrid(roomId, userId, grid) {
  const { error } = await supabase
    .from('room_players')
    .update({ grid, grid_ready: true })
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function allPlayersGridReady(roomId) {
  const { data, error } = await supabase
    .from('room_players')
    .select('grid_ready')
    .eq('room_id', roomId)
  if (error) throw new Error(error.message)
  return data.length > 0 && data.every((p) => p.grid_ready)
}

export async function beginPlaying(roomId) {
  const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
  if (error) throw new Error(error.message)
}

/**
 * Called when the current player selects a number on their turn.
 * Adds the number to the room's global numbers_called list,
 * recomputes struck letters for every player, and advances the
 * turn to the next player in turn_order.
 */
export async function selectNumber(room, number) {
  const numbersCalled = [...room.numbers_called, number]

  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('id, user_id, grid, lines_struck, has_bingo, rank')
    .eq('room_id', room.id)

  if (playersError) throw new Error(playersError.message)

  const updates = players.map(async (player) => {
    if (!player.grid) return
    const struck = computeStruckLetters(player.grid, numbersCalled)
    const payload = { lines_struck: struck }
    await supabase.from('room_players').update(payload).eq('id', player.id)
  })
  await Promise.all(updates)

  const finishedUserIds = new Set(
    players.filter((p) => p.has_bingo).map((p) => p.user_id)
  )
  const turnOrder = room.turn_order
  let nextIndex = (room.current_turn_index + 1) % turnOrder.length
  let safety = 0
  while (finishedUserIds.has(turnOrder[nextIndex]) && safety < turnOrder.length) {
    nextIndex = (nextIndex + 1) % turnOrder.length
    safety += 1
  }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({
      numbers_called: numbersCalled,
      current_turn_index: nextIndex,
    })
    .eq('id', room.id)

  if (roomError) throw new Error(roomError.message)
}

/**
 * Called when a player clicks the BINGO button after completing
 * all five letters. Ranking is determined by click order, not
 * completion order — so we simply take the next available rank
 * number based on how many players already have a rank.
 */
export async function clickBingo(roomId, userId) {
  const { data: players, error } = await supabase
    .from('room_players')
    .select('id, user_id, rank, has_bingo, lines_struck')
    .eq('room_id', roomId)

  if (error) throw new Error(error.message)

  const me = players.find((p) => p.user_id === userId)
  if (!me) throw new Error('Player not found in room.')
  if (!hasFullBingo(me.lines_struck)) {
    throw new Error('You have not completed all five letters yet.')
  }
  if (me.has_bingo) return // already claimed

  const rankedCount = players.filter((p) => p.has_bingo).length
  const rank = rankedCount + 1

  const { error: updateError } = await supabase
    .from('room_players')
    .update({ has_bingo: true, bingo_clicked_at: new Date().toISOString(), rank })
    .eq('id', me.id)

  if (updateError) throw new Error(updateError.message)

  const remaining = players.filter((p) => !p.has_bingo && p.user_id !== userId)
  if (remaining.length <= 1) {
    // Assign the last remaining player the final rank and close the game
    if (remaining.length === 1) {
      const lastPlayer = remaining[0]
      await supabase
        .from('room_players')
        .update({ rank: rank + 1, has_bingo: true, bingo_clicked_at: new Date().toISOString() })
        .eq('id', lastPlayer.id)
    }
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
  }

  return rank
}

export async function resetRoomForRematch(roomId) {
  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', roomId)

  if (playersError) throw new Error(playersError.message)

  await Promise.all(
    players.map((p) =>
      supabase
        .from('room_players')
        .update({
          grid: null,
          grid_ready: false,
          lines_struck: [],
          has_bingo: false,
          bingo_clicked_at: null,
          rank: null,
          is_ready: true,
        })
        .eq('id', p.id)
    )
  )

  const { error: roomError } = await supabase
    .from('rooms')
    .update({
      status: 'waiting',
      numbers_called: [],
      winners: [],
      current_turn_index: 0,
    })
    .eq('id', roomId)

  if (roomError) throw new Error(roomError.message)
}
