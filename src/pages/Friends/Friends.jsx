import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  acceptFriendRequest,
  getFriendsList,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from '../../services/friendService'
import Button from '../../components/Button/Button'
import './Friends.css'

export default function Friends() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(true)

  const loadFriends = useCallback(async () => {
    try {
      const list = await getFriendsList(user.id)
      setFriends(list)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingFriends(false)
    }
  }, [user.id, showToast])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const data = await searchUsers(query, user.id)
      setResults(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async (addresseeId) => {
    try {
      await sendFriendRequest(user.id, addresseeId)
      showToast('Friend request sent', 'success')
      loadFriends()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleAccept = async (friendRowId) => {
    try {
      await acceptFriendRequest(friendRowId)
      showToast('Friend request accepted', 'success')
      loadFriends()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleRemove = async (friendRowId) => {
    try {
      await removeFriend(friendRowId)
      showToast('Friend removed', 'info')
      loadFriends()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const existingIds = new Set(friends.map((f) => f.user.id))
  const accepted = friends.filter((f) => f.status === 'accepted')
  const incoming = friends.filter((f) => f.isIncomingRequest)
  const outgoing = friends.filter((f) => f.status === 'pending' && !f.isIncomingRequest)

  return (
    <div className="page-container">
      <h1 className="page-title">Friends</h1>

      <form className="friends-search" onSubmit={handleSearch}>
        <input
          className="form-input"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {results.length > 0 && (
        <section className="friends-section">
          <h3>Search Results</h3>
          <div className="grid-list">
            {results.map((r) => (
              <div className="friend-row" key={r.id}>
                <div className="friend-info">
                  <span className="friend-name">{r.username}</span>
                  <span className="friend-display">{r.display_name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(r.id)}
                  disabled={existingIds.has(r.id)}
                >
                  {existingIds.has(r.id) ? 'Added' : 'Add Friend'}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="friends-section">
          <h3>Friend Requests</h3>
          <div className="grid-list">
            {incoming.map((f) => (
              <div className="friend-row" key={f.friendRowId}>
                <div className="friend-info">
                  <span className="friend-name">{f.user.username}</span>
                  <span className="friend-display">{f.user.display_name}</span>
                </div>
                <div className="friend-actions">
                  <Button size="sm" onClick={() => handleAccept(f.friendRowId)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(f.friendRowId)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="friends-section">
        <h3>Your Friends {loadingFriends ? '' : `(${accepted.length})`}</h3>
        {loadingFriends ? (
          <p className="friends-empty">Loading...</p>
        ) : accepted.length === 0 ? (
          <p className="friends-empty">No friends yet. Search above to add some!</p>
        ) : (
          <div className="grid-list">
            {accepted.map((f) => (
              <div className="friend-row" key={f.friendRowId}>
                <div className="friend-info">
                  <span className="friend-name">{f.user.username}</span>
                  <span className="friend-display">{f.user.display_name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(f.friendRowId)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="friends-section">
          <h3>Pending Requests Sent</h3>
          <div className="grid-list">
            {outgoing.map((f) => (
              <div className="friend-row" key={f.friendRowId}>
                <div className="friend-info">
                  <span className="friend-name">{f.user.username}</span>
                  <span className="friend-display">{f.user.display_name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(f.friendRowId)}>
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
