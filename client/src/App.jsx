import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSocket } from './SocketContext';
import Game from './components/Game';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import CollectionScreen from './components/CollectionScreen';
import ResultScreen from './components/ResultScreen';
import { loadPlayer, createPlayer, isLoggedIn, recordMatchResult } from './utils/playerData';
import { playVictory, playDefeat } from './utils/soundEngine';

const Home = () => {
  const { socket, isConnected, reconnect } = useSocket();
  const [screen, setScreen] = useState('loading'); // loading, login, home, collection, playing, result
  const [gameData, setGameData] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [player, setPlayer] = useState(null);

  // Load player on mount
  useEffect(() => {
    if (isLoggedIn()) {
      setPlayer(loadPlayer());
      setScreen('home');
    } else {
      setScreen('login');
    }
  }, []);

  const refreshPlayer = useCallback(() => {
    setPlayer(loadPlayer());
  }, []);

  // When app resumes and socket reconnects, go back to home if stuck
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // If we were in a game but the socket died, go back to home
        if (screen === 'playing' && !isConnected) {
          console.log('Game connection lost, returning to home');
          setGameData(null);
          setScreen('home');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [screen, isConnected]);

  // Android back button handling
  useEffect(() => {
    const handleBackButton = (e) => {
      if (screen === 'playing') {
        e.preventDefault();
        // Leave the game and go home
        setGameData(null);
        setScreen('home');
      } else if (screen === 'collection' || screen === 'result') {
        e.preventDefault();
        refreshPlayer();
        setMatchResult(null);
        setScreen('home');
      }
      // On home screen, let the default back behavior happen (minimize app)
    };

    // Handle browser back button / Android back
    window.addEventListener('popstate', handleBackButton);
    
    // Push a state so we can intercept back
    if (screen === 'playing' || screen === 'collection' || screen === 'result') {
      window.history.pushState({ screen }, '');
    }

    return () => window.removeEventListener('popstate', handleBackButton);
  }, [screen, refreshPlayer]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('gameStart', (data) => {
      setScreen('playing');
      setGameData(data);
    });

    socket.on('gameOver', (data) => {
      const isWinner = data.winner === socket.id;
      const kills = isWinner ? (data.winnerKills || 0) : (data.loserKills || 0);
      const result = recordMatchResult(isWinner, kills, 0);
      setMatchResult(result);
      setGameData(null);
      refreshPlayer();
      setScreen('result');
      if (isWinner) playVictory();
      else playDefeat();
    });

    socket.on('queueStatus', () => {});

    return () => {
      socket.off('gameStart');
      socket.off('gameOver');
      socket.off('queueStatus');
    };
  }, [socket, refreshPlayer]);

  // Handle login
  const handleLogin = (name, avatar) => {
    createPlayer(name, avatar);
    setPlayer(loadPlayer());
    setScreen('home');
  };

  // Handle battle
  const handleBattle = (mode) => {
    if (socket && isConnected) {
      socket.emit('joinQueue', { playerName: player.name, mode });
    } else {
      // Socket not connected, try to reconnect
      console.log('Socket not connected, reconnecting...');
      reconnect();
      // Try again after a short delay
      setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('joinQueue', { playerName: player.name, mode });
        }
      }, 2000);
    }
  };

  // Render screens
  if (screen === 'loading') {
    return <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFD700', fontSize: '1.2rem' }}>Loading...</div>;
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'playing' && gameData) {
    return <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}><Game initialGameData={gameData} /></div>;
  }

  if (screen === 'result' && matchResult) {
    return (
      <ResultScreen
        result={matchResult}
        onPlayAgain={() => { handleBattle('ai'); }}
        onHome={() => { refreshPlayer(); setScreen('home'); setMatchResult(null); }}
      />
    );
  }

  if (screen === 'collection' && player) {
    return (
      <CollectionScreen
        player={player}
        onBack={() => { refreshPlayer(); setScreen('home'); }}
        onPlayerUpdate={refreshPlayer}
      />
    );
  }

  if (screen === 'home' && player) {
    return (
      <HomeScreen
        player={player}
        onBattle={handleBattle}
        onCollection={() => setScreen('collection')}
      />
    );
  }

  return null;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
