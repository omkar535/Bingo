# BINGO — Realtime Multiplayer Bingo Game

A production-ready multiplayer Bingo game built with **React + Vite**, **Supabase**
(PostgreSQL, Auth, Realtime, RLS), and deployed on **Render**.

Fully responsive — playable from desktop, laptop, tablet, and mobile, with every
player seeing live updates with no page refresh.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Vite, CSS3 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Linting | OxLint |
| Deployment | Render (Static Site) |
| Version Control | GitHub |

---

## 2. Project Structure

```
src/
  assets/
  components/
    Navbar/  Sidebar/  PlayerCard/  RoomCard/
    Grid/    Cell/      Modal/       Button/   Toast/
    AppLayout.jsx  ProtectedRoute.jsx
  pages/
    Login/  Register/  Home/  Friends/  Profile/
    WaitingRoom/  Game/  Results/
  hooks/
    useRoomRealtime.js  useCurrentPlayer.js
  context/
    AuthContext.jsx  ToastContext.jsx
  services/
    authService.js  roomService.js  gameService.js  friendService.js
  utils/
    bingoLogic.js
  lib/
    supabase.js
  styles/
    index.css
  App.jsx
  main.jsx
supabase/
  schema.sql
```

---

## 3. Supabase Setup

### 3.1 Project

This project is pre-configured to use the following Supabase project:

- **Project URL:** `https://lmomlcrihpzydhrppzcj.supabase.co`
- **Project Reference:** `lmomlcrihpzydhrppzcj`

### 3.2 Run the database schema

1. Open the Supabase SQL Editor for this project.
2. Paste the entire contents of `supabase/schema.sql` and run it.
   This creates:
   - `profiles`, `friends`, `rooms`, `room_players` tables
   - All primary keys, foreign keys, unique constraints, and indexes
   - Row Level Security (RLS) policies for every table
   - Triggers: auto-create profile on signup, uppercase room codes, room capacity limit
   - Adds `rooms` and `room_players` to the `supabase_realtime` publication

### 3.3 Enable Realtime

Realtime is enabled automatically by the `alter publication supabase_realtime add table ...`
statements at the bottom of `schema.sql`. Verify under **Database → Replication** in the
Supabase dashboard that `rooms` and `room_players` are listed.

### 3.4 Auth configuration

This app collects only a **username + password** from users, but Supabase Auth requires
an email internally. The app derives a synthetic, non-routable email
(`<username>@bingo.internal`) from the username during sign-up — see
`src/services/authService.js`. No real email is ever sent or required.

In **Authentication → Providers → Email**, you can safely **disable "Confirm email"**
since these addresses are not real inboxes (Authentication → Settings → Email Auth →
turn off "Enable email confirmations").

### 3.5 Account deletion (optional, for full purge)

Client-side, "Delete Account" removes the user's `profiles` row (which cascades to
`friends` and `room_players`) and signs them out. To also purge the underlying
`auth.users` row, deploy a Supabase Edge Function using the **service role key**
(never exposed to the client) that calls `supabase.auth.admin.deleteUser(id)`.

---

## 4. Environment Variables

Create `.env.local` in the project root (already included for local development):

```
VITE_SUPABASE_URL=https://lmomlcrihpzydhrppzcj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_VGd4kHx0Afn2T4_ZbwmMfA_8vLH7lDc
```

`.env.local` is git-ignored. Use `.env.example` as a template for other environments.
**Never commit real secrets to GitHub.**

---

## 5. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Ensure .env.local has your Supabase URL + anon key (see above)

# 3. Start the dev server
npm run dev
```

The app runs at `http://localhost:5173` and listens on `0.0.0.0`, so you can also open
it from another device on the same network at `http://<your-computer-ip>:5173` to test
multiplayer across devices.

### Linting

```bash
npm run lint
```

---

## 6. GitHub Deployment

```bash
git init
git add .
git commit -m "Initial commit: Bingo multiplayer game"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Make sure `.env.local` is **not** committed (it's in `.gitignore` by default).

---

## 7. Render Deployment

1. Push your code to GitHub (see above).
2. In the Render Dashboard, click **New → Static Site**.
3. Connect your GitHub repository.
4. Configure the build:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. Add environment variables under **Environment**:
   - `VITE_SUPABASE_URL` = `https://lmomlcrihpzydhrppzcj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_VGd4kHx0Afn2T4_ZbwmMfA_8vLH7lDc`
6. Add a rewrite rule so client-side routing works on refresh:
   - **Redirects/Rewrites:** source `/*` → destination `/index.html`, action `Rewrite`
7. Click **Create Static Site**. Render will build and deploy automatically on every push.

---

## 8. Database Migrations

All schema changes live in `supabase/schema.sql`. For future migrations, create dated
files (e.g. `supabase/migrations/0002_add_avatars.sql`) and run them through the
Supabase SQL Editor or the Supabase CLI:

```bash
supabase link --project-ref lmomlcrihpzydhrppzcj
supabase db push
```

---

## 9. How the Game Works

1. **Create/Join Room** — Host creates a room and gets a unique 6-character code
   (letters + numbers, case-insensitive). Others join with that code.
2. **Waiting Room** — 2–10 players. Everyone but the host must toggle **Ready**. The
   host can kick players and starts the game once the minimum is met and everyone is ready.
3. **Grid Setup** — Each player picks **Random** (shuffled 1–25) or **Create Your Own**
   (click cells in order to place 1 → 25). The game begins once every player has submitted.
4. **Gameplay** — Turn order is Host → join order → repeat. On their turn, a player picks
   one unmarked number; it's instantly highlighted on **every** player's grid via Supabase
   Realtime. Completed rows/columns/diagonals strike a letter in **B-I-N-G-O**. Once all
   five are struck, the player must click the **BINGO** button — ranking is based on
   **click order**, not completion order.
5. **Results** — Final ranking (Gold / Silver / Bronze / 4th…) with stats, and options to
   **Play Again** (host resets the room) or **Return Home**.

All state changes (joins, leaves, ready status, kicks, grid completion, turn changes,
number selections, BINGO progress, and rankings) are propagated live via Supabase
Realtime Postgres Changes — no manual refresh required.

---

## 10. Security Notes

- Supabase Auth handles password hashing and session tokens; no custom password storage.
- Row Level Security is enabled on every table; policies restrict writes to the
  authenticated user's own rows (or the room host, where appropriate).
- The publishable/anon key is safe to expose client-side by design — it only grants
  access permitted by RLS policies.
- No secrets are hardcoded; all configuration is read from environment variables.
