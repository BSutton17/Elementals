import { useEffect, useState } from 'react'
import { connectSocket, disconnectSocket, socket } from './sockets/socket'
import { identify } from './sockets/session'
import { useLobby } from './game/useLobby'
import { resumeMatch } from './game/lobbyStore'
import { StartupScreen } from './pages/StartupScreen'
import { JoinScreen } from './pages/JoinScreen'
import { LobbyScreen } from './pages/LobbyScreen'
import { BattlefieldScreen } from './pages/BattlefieldScreen'
import { GameOverScreen } from './pages/GameOverScreen'

type PreLobbyScreen = 'menu' | 'join'

function App() {
  const { match } = useLobby()
  const [screen, setScreen] = useState<PreLobbyScreen>('menu')
  const [name, setName] = useState('')

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

  // Once in a match, the phase decides the screen: an active match moves every
  // player to the battlefield automatically (ticket #39); a finished match
  // shows the game-over screen until the player returns to the menu.
  if (match) {
    if (match.phase === 'ended') return <GameOverScreen />
    return match.phase === 'active' ? <BattlefieldScreen /> : <LobbyScreen />
  }

  return screen === 'join' ? (
    <JoinScreen name={name} onName={setName} onBack={() => setScreen('menu')} />
  ) : (
    <StartupScreen name={name} onName={setName} onJoin={() => setScreen('join')} />
  )
}

export default App
