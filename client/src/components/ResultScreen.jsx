import React from 'react';

const ResultScreen = ({ result, onPlayAgain, onHome }) => {
  const { isWinner, kills, baseCoins, bonusCoins, totalCoins, xpEarned, currentStreak, level } = result;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: isWinner ? 'linear-gradient(180deg, #0a1a0a, #0a0a0a)' : 'linear-gradient(180deg, #1a0a0a, #0a0a0a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      
      {/* Result Title */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '5px' }}>{isWinner ? '🏆' : '💀'}</div>
        <h1 style={{
          fontSize: '2.8rem', margin: 0, fontWeight: '900', letterSpacing: '4px',
          color: isWinner ? '#00ff88' : '#ff4444',
          textShadow: isWinner ? '0 0 40px rgba(0,255,136,0.4)' : '0 0 40px rgba(255,68,68,0.4)'
        }}>
          {isWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '5px' }}>The battle has ended</div>
      </div>

      {/* Stats Card */}
      <div style={{ width: '100%', maxWidth: '340px', background: 'rgba(30,20,15,0.9)', border: `1px solid ${isWinner ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`, borderRadius: '14px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        
        {/* Kill Count */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ color: '#FFD700', fontSize: '2rem', fontWeight: 'bold' }}>⚔️ {kills}</div>
          <div style={{ color: '#888', fontSize: '0.7rem' }}>UNITS KILLED</div>
        </div>

        {/* Rewards */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Base Reward</span>
            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>🪙 +{baseCoins}</span>
          </div>
          {bonusCoins > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#ff6600', fontSize: '0.85rem' }}>🔥 Streak Bonus</span>
              <span style={{ color: '#ff6600', fontWeight: 'bold' }}>🪙 +{bonusCoins}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #333', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>Total</span>
            <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.1rem' }}>🪙 +{totalCoins}</span>
          </div>
        </div>

        {/* XP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#00ccff', fontSize: '0.85rem' }}>⭐ XP Earned</span>
          <span style={{ color: '#00ccff', fontWeight: 'bold' }}>+{xpEarned}</span>
        </div>

        {/* Streak */}
        {currentStreak > 1 && (
          <div style={{ textAlign: 'center', margin: '12px 0', padding: '8px', background: 'rgba(255,100,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,100,0,0.3)' }}>
            <span style={{ color: '#ff6600', fontWeight: 'bold', fontSize: '0.9rem' }}>
              🔥 {currentStreak} Win Streak!
            </span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button onClick={onPlayAgain} style={{
          flex: 2, padding: '14px', background: 'linear-gradient(135deg, #cc3300, #ff6600)',
          border: '2px solid #FFD700', borderRadius: '12px',
          color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '2px'
        }}>
          ⚔️ PLAY AGAIN
        </button>
        <button onClick={onHome} style={{
          flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid #555', borderRadius: '12px',
          color: '#aaa', fontSize: '0.9rem', cursor: 'pointer'
        }}>
          🏠
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;
