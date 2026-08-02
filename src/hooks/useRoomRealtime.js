import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getRoom, getRoomPlayers } from '../services/roomService'

/**
 * Subscribes to a room and its players via Supabase Realtime
 * (Postgres Changes). Keeps `room` and `players` in sync live so
 * the UI never needs a manual refresh.
 */
export function useRoomRealtime(roomId) {
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      const [roomData, playersData] = await Promise.all([
        getRoom(roomId),
        getRoomPlayers(roomId),
      ])
      setRoom(roomData)
      setPlayers(playersData)
    } catch (err) {
      console.error('Failed to refresh room state', err)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) return undefined

    refresh()

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => refresh()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, refresh])

  return { room, players, loading, refresh }
}
