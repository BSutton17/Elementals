import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { connectSocket, disconnectSocket, socket } from './sockets/socket'
import { identify } from './sockets/session'
import { useLobby } from './game/useLobby'
import { resumeMatch } from './game/lobbyStore'
import { StartupScreen } from './pages/StartupScreen'
import { JoinScreen } from './pages/JoinScreen'
import { SearchingScreen } from './pages/SearchingScreen'
import { LobbyScreen } from './pages/LobbyScreen'
import { BattlefieldScreen } from './pages/BattlefieldScreen'
import { GameOverScreen } from './pages/GameOverScreen'
import { ProfileScreen } from './pages/ProfileScreen'
import { StoreScreen } from './pages/StoreScreen'

/**
 * Two navigation systems, on purpose.
 *
 * ROUTES (`/`, `/profile`, `/shop`) are places a player chooses to go and
 * expects to come back from — so they get real URLs, and the phone's back
 * gesture leaves the shop rather than the site.
 *
 * SCREENS are steps inside a flow, not destinations: joining by code, and the
 * matchmaking hand-off. Giving those URLs would let someone deep-link into a
 * half-finished flow, and would put a back button in the middle of it.
 *
 * A match outranks both — see below.
 */
type PreLobbyScreen = 'menu' | 'join' | 'searching'

function App() {
  const { match } = useLobby()
  const [screen, setScreen] = useState<PreLobbyScreen>('menu')
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Open the shared connection on mount and (re)identify our session on connect.
  useEffect(() => {
    const onConnect = () => {
      // Identify our session, then resume a persisted match if there is one.
      void identify(socket).then(() => resumeMatch())
    }
    socket.on('connect', onConnect)
    connectSocket()
    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
      disconnectSocket()
    }
  }, [])

  // ⚠️ SEARCHING OUTRANKS `match`, and it has to. Matchmaking sets `match` the
  // moment the server seats us, and the check below would swap straight to the
  // lobby — skipping the hand-off beat entirely. Holding this screen until
  // `onSeated` fires is what gives "found one" somewhere to land.
  if (screen === 'searching') {
    return (
      <SearchingScreen
        name={name}
        onSeated={() => setScreen('menu')}
        onCancel={() => setScreen('menu')}
      />
    )
  }

  // ⚠️ A MATCH OUTRANKS THE URL. Being in a game is a fact about the server, not
  // a place in the browser: the match screens are driven by phase and cannot be
  // navigated away from with a back gesture. If a player is standing on /profile
  // when their lobby starts, they belong on the battlefield.
  if (match) {
    if (match.phase === 'ended') return <GameOverScreen />
    return match.phase === 'active' ? <BattlefieldScreen /> : <LobbyScreen />
  }

  if (screen === 'join') {
    return <JoinScreen name={name} onName={setName} onBack={() => setScreen('menu')} />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <StartupScreen
            name={name}
            onName={setName}
            onJoin={() => setScreen('join')}
            onJoinPublic={() => setScreen('searching')}
          />
        }
      />
      <Route path="/profile" element={<ProfileScreen onBack={() => navigate('/')} />} />
      <Route path="/shop" element={<StoreScreen onBack={() => navigate('/')} />} />
      {/* Anything else is a typo or a stale link, not an error worth a page. */}
      <Route path="*" element={<Navigate to="/" replace state={{ from: location.pathname }} />} />
    </Routes>
  )
}

export default App
