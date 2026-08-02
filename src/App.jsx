import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Home from './pages/Home/Home'
import Profile from './pages/Profile/Profile'
import Friends from './pages/Friends/Friends'
import WaitingRoom from './pages/WaitingRoom/WaitingRoom'
import Game from './pages/Game/Game'
import Results from './pages/Results/Results'

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route
        path="/friends"
        element={
          <Protected>
            <Friends />
          </Protected>
        }
      />
      <Route
        path="/waiting-room/:roomId"
        element={
          <Protected>
            <WaitingRoom />
          </Protected>
        }
      />
      <Route
        path="/game/:roomId"
        element={
          <Protected>
            <Game />
          </Protected>
        }
      />
      <Route
        path="/results/:roomId"
        element={
          <Protected>
            <Results />
          </Protected>
        }
      />

      <Route path="*" element={<Login />} />
    </Routes>
  )
}
