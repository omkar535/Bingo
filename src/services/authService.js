import { supabase } from '../lib/supabase'

// Supabase Auth requires an email. The product only exposes a
// username to the user, so we deterministically derive a
// non-routable synthetic email from the username. Usernames are
// unique (enforced in DB), so the derived email is unique too.
const EMAIL_DOMAIN = 'bingo.internal'

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export async function checkUsernameAvailable(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username.trim())
    .maybeSingle()

  if (error) throw error
  return !data
}

export async function registerUser({ username, displayName, password }) {
  const cleanUsername = username.trim().toLowerCase()

  const available = await checkUsernameAvailable(cleanUsername)
  if (!available) {
    throw new Error('Username is already taken.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(cleanUsername),
    password,
    options: {
      data: {
        username: cleanUsername,
        display_name: displayName.trim(),
      },
    },
  })

  if (error) throw new Error(error.message)
  return data
}

export async function loginUser({ username, password }) {
  const cleanUsername = username.trim().toLowerCase()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(cleanUsername),
    password,
  })

  if (error) throw new Error('Invalid username or password.')
  return data
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function changeUsername(userId, newUsername) {
  const cleanUsername = newUsername.trim().toLowerCase()
  const available = await checkUsernameAvailable(cleanUsername)
  if (!available) {
    throw new Error('Username is already taken.')
  }

  // Update auth email to keep login working with the new username
  const { error: authError } = await supabase.auth.updateUser({
    email: usernameToEmail(cleanUsername),
  })
  if (authError) throw new Error(authError.message)

  return updateProfile(userId, { username: cleanUsername })
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function reauthenticate(username, password) {
  const cleanUsername = username.trim().toLowerCase()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(cleanUsername),
    password,
  })
  if (error) throw new Error('Password is incorrect.')
}

export async function deleteAccount() {
  // Deleting the auth.users row requires elevated privileges not
  // available client-side. We delete the profile row (which
  // cascades room memberships/friends) and sign the user out; a
  // Supabase Edge Function with the service role key should be
  // deployed to fully purge the auth.users record. See README.
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) throw new Error('Not authenticated.')

  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) throw new Error(error.message)

  await supabase.auth.signOut()
}
