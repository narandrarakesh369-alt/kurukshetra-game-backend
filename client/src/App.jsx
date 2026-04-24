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
  const { socket, isConnected } = useSocket();
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
