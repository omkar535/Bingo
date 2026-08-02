import { supabase } from '../lib/supabase'

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateCode() {
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const code = generateCode()
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique room code. Please try again.')
}

export async function createRoom(hostId) {
  const code = await generateUniqueCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: hostId, status: 'waiting', turn_order: [] })
    .select()
    .single()

  if (roomError) throw new Error(roomError.message)

  const { error: playerError } = await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: hostId,
    join_order: 0,
    is_host: true,
    is_ready: true,
  })

  if (playerError) throw new Error(playerError.message)

  return room
}

export async function findRoomByCode(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function joinRoom(code, userId) {
  const room = await findRoomByCode(code)
  if (!room) throw new Error('Room not found. Check the code and try again.')
  if (room.status !== 'waiting') {
    throw new Error('This room has already started and cannot be joined.')
  }

  const { data: existingPlayers, error: countError } = await supabase
    .from('room_players')
    .select('user_id, join_order')
    .eq('room_id', room.id)
    .order('join_order', { ascending: true })

  if (countError) throw new Error(countError.message)

  const alreadyIn = existingPlayers.find((p) => p.user_id === userId)
  if (alreadyIn) return room

  if (existingPlayers.length >= 10) {
    throw new Error('This room is full (10/10 players).')
  }

  const nextOrder = existingPlayers.length
    ? Math.max(...existingPlayers.map((p) => p.join_order)) + 1
    : 0

  const { error: insertError } = await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: userId,
    join_order: nextOrder,
    is_host: false,
    is_ready: false,
  })

  if (insertError) throw new Error(insertError.message)
  return room
}

export async function leaveRoom(roomId, userId) {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function kickPlayer(roomId, userId) {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function toggleReady(roomId, userId, isReady) {
  const { error } = await supabase
    .from('room_players')
    .update({ is_ready: isReady })
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('room_players')
    .select('*, profile:profiles(id, username, display_name, avatar_color)')
    .eq('room_id', roomId)
    .order('join_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function startGame(roomId, playerUserIds) {
  // Host is join_order 0; turn order follows join order.
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'setup',
      turn_order: playerUserIds,
      current_turn_index: 0,
      numbers_called: [],
      winners: [],
    })
    .eq('id', roomId)
  if (error) throw new Error(error.message)
}

export async function getRoom(roomId) {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  if (error) throw new Error(error.message)
  return data
}
