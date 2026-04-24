import React, { useState, useEffect } from 'react';
import { loadPlayer, checkDailyReward, claimDailyReward, DAILY_REWARDS } from '../utils/playerData';

const HomeScreen = ({ onBattle, onCollection, player }) => {
  const [dailyReward, setDailyReward] = useState(null);
  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [claimedReward, setClaimedReward] = useState(null);

  useEffect(() => {
    const reward = checkDailyReward();
    if (reward) {
      setTimeout(() => {
        setDailyReward(reward);
        setShowDailyPopup(true);
      }, 800);
    }
  }, []);

  const handleClaim = () => {
    const reward = claimDailyReward();
    if (reward) {
      setClaimedReward(reward);
      setTimeout(() => { setShowDailyPopup(false); setClaimedReward(null); }, 1500);
    }
  };

  const winRate = player.totalMatches > 0 ? Math.round((player.wins / player.totalMatches) * 100) : 0;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0f0a 40%, #0a0a1a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0', overflow: 'hidden' }}>

      {/* Top Currency Bar */}
      <div style={{ width: '100%', padding: '10px 16px', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.9rem' }}>🪙 {player.coins}</div>
          <div style={{ color: '#00ccff', fontWeight: 'bold', fontSize: '0.9rem' }}>⭐ Lv.{player.level}</div>
        </div>
        <div style={{ color: '#888', fontSize: '0.75rem' }}>{player.xp} XP</div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#FFD700', margin: 0, textShadow: '0 0 30px rgba(255,215,0,0.3), 0 4px 8px rgba(0,0,0,0.8)', fontWeight: '900', letterSpacing: '2px' }}>
          KURUKSHETRA
        </h1>
        <div style={{ fontSize: '0.75rem', color: '#aa7733', letterSpacing: '6px', marginTop: '2px' }}>CARD WAR ARENA</div>
      </div>

      {/* Profile Card */}
      <div style={{ width: '90%', maxWidth: '380px', background: 'linear-gradient(135deg, rgba(40,25,15,0.9), rgba(20,10,5,0.95))', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '14px', padding: '16px', marginTop: '10px', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundImage: `url(${player.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #FFD700', boxShadow: '0 0 12px rgba(255,215,0,0.2)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.1rem' }}>{player.name}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.75rem' }}>
            <span style={{ color: '#00ff88' }}>W: {player.wins}</span>
            <span style={{ color: '#ff4444' }}>L: {player.losses}</span>
            <span style={{ color: '#aaa' }}>{winRate}%</span>
          </div>
          {player.currentStreak > 1 && (
            <div style={{ color: '#ff6600', fontSize: '0.7rem', marginTop: '3px', fontWeight: 'bold' }}>
              🔥 {player.currentStreak} Win Streak!
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', color: '#FFD700', fontWeight: 'bold', lineHeight: 1 }}>{player.totalKills}</div>
          <div style={{ color: '#888', fontSize: '0.6rem' }}>KILLS</div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ width: '90%', maxWidth: '380px', display: 'flex', gap: '8px', marginTop: '10px' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.2rem' }}>{player.totalMatches}</div>
          <div style={{ color: '#666', fontSize: '0.65rem' }}>BATTLES</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: '#00ccff', fontWeight: 'bold', fontSize: '1.2rem' }}>{player.bestStreak}</div>
          <div style={{ color: '#666', fontSize: '0.65rem' }}>BEST STREAK</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: '#ff6600', fontWeight: 'bold', fontSize: '1.2rem' }}>Lv.{player.level}</div>
          <div style={{ color: '#666', fontSize: '0.65rem' }}>RANK</div>
        </div>
      </div>

      {/* BATTLE Button */}
      <button onClick={() => onBattle('ai')} style={{
        width: '90%', maxWidth: '380px', marginTop: '20px', padding: '18px',
        background: 'linear-gradient(135deg, #cc3300, #ff6600)',
        border: '2px solid #FFD700', borderRadius: '14px',
        color: 'white', fontSize: '1.4rem', fontWeight: '900',
        letterSpacing: '4px', cursor: 'pointer',
        boxShadow: '0 0 30px rgba(255,100,0,0.3), 0 6px 20px rgba(0,0,0,0.4)',
        textTransform: 'uppercase', transition: 'all 0.2s'
      }}>
        ⚔️ BATTLE ⚔️
      </button>

      {/* Secondary Buttons */}
      <div style={{ width: '90%', maxWidth: '380px', display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button onClick={onCollection} style={{
          flex: 1, padding: '12px', background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)', borderRadius: '10px',
          color: '#FFD700', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
        }}>
          ⬆️ Upgrades
        </button>
        <button onClick={() => onBattle('multiplayer')} style={{
          flex: 1, padding: '12px', background: 'rgba(0,200,255,0.1)',
          border: '1px solid rgba(0,200,255,0.3)', borderRadius: '10px',
          color: '#00ccff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
        }}>
          🌐 Multiplayer
        </button>
      </div>

      {/* Daily Reward Popup */}
      {showDailyPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ width: '320px', background: 'linear-gradient(180deg, #2a1a0a, #1a0f05)', border: '2px solid #FFD700', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 0 60px rgba(255,215,0,0.2)' }}>
            <h2 style={{ color: '#FFD700', margin: '0 0 8px', fontSize: '1.3rem' }}>🎁 Daily Reward!</h2>
            <p style={{ color: '#aa8844', fontSize: '0.8rem', marginBottom: '16px' }}>Day {dailyReward?.day} of 7</p>

            {/* 7-day dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
              {DAILY_REWARDS.map((r, i) => {
                const p = loadPlayer();
                const claimed = p && p.dailyReward.currentDay > i;
                const isCurrent = i === (dailyReward?.day - 1);
                return (
                  <div key={i} style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    background: claimed ? '#228B22' : (isCurrent ? '#FFD700' : '#333'),
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontSize: '0.6rem', fontWeight: 'bold',
                    color: claimed ? 'white' : (isCurrent ? '#000' : '#666'),
                    border: isCurrent ? '2px solid #fff' : '1px solid #444'
                  }}>
                    {claimed ? '✓' : `D${i+1}`}
                  </div>
                );
              })}
            </div>

            {claimedReward ? (
              <div style={{ color: '#00ff88', fontSize: '1.3rem', fontWeight: 'bold', padding: '20px 0' }}>
                +{claimedReward.coins} Coins! 🎉
              </div>
            ) : (
              <>
                <div style={{ color: '#FFD700', fontSize: '1.5rem', fontWeight: 'bold', margin: '10px 0' }}>
                  🪙 {dailyReward?.label}
                </div>
                <button onClick={handleClaim} style={{
                  width: '100%', padding: '12px', marginTop: '10px',
                  background: 'linear-gradient(135deg, #228B22, #32CD32)',
                  border: '1px solid #00ff00', borderRadius: '10px',
                  color: 'white', fontSize: '1rem', fontWeight: 'bold',
                  cursor: 'pointer', letterSpacing: '2px'
                }}>
                  CLAIM
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
