import { supabase } from '../lib/supabase'

export async function searchUsers(query, currentUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_color')
    .ilike('username', `%${query.trim()}%`)
    .neq('id', currentUserId)
    .limit(20)

  if (error) throw new Error(error.message)
  return data
}

export async function sendFriendRequest(requesterId, addresseeId) {
  const { error } = await supabase.from('friends').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
}

export async function acceptFriendRequest(friendRowId) {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', friendRowId)
  if (error) throw new Error(error.message)
}

export async function removeFriend(friendRowId) {
  const { error } = await supabase.from('friends').delete().eq('id', friendRowId)
  if (error) throw new Error(error.message)
}

export async function getFriendsList(userId) {
  const { data, error } = await supabase
    .from('friends')
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!friends_requester_id_fkey(id, username, display_name, avatar_color),
       addressee:profiles!friends_addressee_id_fkey(id, username, display_name, avatar_color)`
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (error) throw new Error(error.message)

  return data.map((row) => {
    const isRequester = row.requester_id === userId
    const other = isRequester ? row.addressee : row.requester
    return {
      friendRowId: row.id,
      status: row.status,
      isIncomingRequest: !isRequester && row.status === 'pending',
      user: other,
    }
  })
}
