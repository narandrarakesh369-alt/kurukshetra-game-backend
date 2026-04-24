import React from 'react';
import { loadPlayer, getUpgradeCost, upgradeUnit, UPGRADE_BONUSES } from '../utils/playerData';

const BASE_STATS = {
  warrior: { hp: 300, dmg: 15, cost: 3, image: '/char_warrior.png', desc: 'Tanky melee fighter' },
  archer:  { hp: 80,  dmg: 15, cost: 2, image: '/char_archer.png', desc: 'Ranged damage dealer' },
  horse:   { hp: 200, dmg: 20, cost: 4, image: '/char_horse.png', desc: 'Fast cavalry' },
};

const CollectionScreen = ({ onBack, player, onPlayerUpdate }) => {

  const handleUpgrade = (unitId) => {
    const success = upgradeUnit(unitId);
    if (success) onPlayerUpdate();
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a1a, #1a0f0a)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #555', borderRadius: '8px', color: '#aaa', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <div style={{ color: '#FFD700', fontWeight: 'bold' }}>🪙 {player.coins}</div>
      </div>

      <h2 style={{ color: '#FFD700', margin: '0 0 20px', fontSize: '1.3rem', letterSpacing: '3px' }}>⬆️ CARD UPGRADES</h2>

      {/* Unit Cards */}
      {Object.entries(BASE_STATS).map(([unitId, base]) => {
        const level = player.upgrades[unitId] || 1;
        const cost = getUpgradeCost(unitId);
        const bonus = UPGRADE_BONUSES[unitId];
        const maxed = level >= 5;
        const canAfford = cost !== null && player.coins >= cost;

        const currentHp = base.hp + (level - 1) * bonus.hpPerLevel;
        const currentDmg = base.dmg + (level - 1) * bonus.dmgPerLevel;
        const nextHp = maxed ? currentHp : currentHp + bonus.hpPerLevel;
        const nextDmg = maxed ? currentDmg : currentDmg + bonus.dmgPerLevel;

        return (
          <div key={unitId} style={{
            width: '100%', maxWidth: '400px', marginBottom: '12px',
            background: 'rgba(30,20,15,0.9)', border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: '12px', padding: '14px', display: 'flex', gap: '14px', alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            {/* Avatar */}
            <div style={{ width: '55px', height: '55px', borderRadius: '10px', backgroundImage: `url(${base.image})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #555', flexShrink: 0 }} />

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1rem', textTransform: 'capitalize' }}>{unitId}</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ color: s <= level ? '#FFD700' : '#333', fontSize: '0.7rem' }}>★</span>
                  ))}
                </div>
              </div>
              <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '2px' }}>{base.desc} • Cost: {base.cost}</div>
              
              {/* Stats */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: '#00ff88' }}>HP: {currentHp}</span>
                  {!maxed && <span style={{ color: '#00ff88', fontSize: '0.65rem' }}> → {nextHp}</span>}
                </div>
                <div>
                  <span style={{ color: '#ff6666' }}>DMG: {currentDmg}</span>
                  {!maxed && <span style={{ color: '#ff6666', fontSize: '0.65rem' }}> → {nextDmg}</span>}
                </div>
              </div>
            </div>

            {/* Upgrade Button */}
            {maxed ? (
              <div style={{ color: '#FFD700', fontSize: '0.75rem', fontWeight: 'bold', padding: '8px 12px', background: 'rgba(255,215,0,0.1)', borderRadius: '8px' }}>MAX</div>
            ) : (
              <button onClick={() => handleUpgrade(unitId)} disabled={!canAfford} style={{
                padding: '8px 14px', background: canAfford ? 'linear-gradient(135deg, #228B22, #32CD32)' : '#333',
                border: canAfford ? '1px solid #00ff00' : '1px solid #444',
                borderRadius: '8px', color: canAfford ? 'white' : '#666',
                fontSize: '0.75rem', fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
              }}>
                <span>⬆️</span>
                <span>🪙 {cost}</span>
              </button>
            )}
          </div>
        );
      })}

      <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '10px', textAlign: 'center' }}>
        Upgraded stats apply to your next battle
      </div>
    </div>
  );
};

export default CollectionScreen;
