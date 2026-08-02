import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

export function useCurrentPlayer(players) {
  const { user } = useAuth()
  return useMemo(() => players.find((p) => p.user_id === user?.id) || null, [players, user])
}
