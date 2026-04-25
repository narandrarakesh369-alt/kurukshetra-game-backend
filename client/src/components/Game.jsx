import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../SocketContext';
import { getUnitStats } from '../utils/playerData';
import { startBattleMusic, stopBattleMusic, playDeploy, playSwordHit, playArrowShoot, playUnitDeath, playElephantStomp, playFreezeSound, playCardSelect, playHorseSound, initAudio } from '../utils/soundEngine';

const CARDS = {
  warrior: { id: 'warrior', name: 'Warrior', cost: 3, image: '/char_warrior.png', size: 48 },
  archer: { id: 'archer', name: 'Archer', cost: 2, image: '/char_archer.png', size: 44 },
  elephant: { id: 'elephant', name: 'Elephant', cost: 6, image: '/char_elephant.png', size: 58 },
  horse: { id: 'horse', name: 'Horse', cost: 4, image: '/char_horse.png', size: 52 },
  mage: { id: 'mage', name: 'Mage', cost: 5, image: '/char_mage.png', size: 46 }
};

const DECK = ['warrior', 'archer', 'horse'];
const BOARD_HEIGHT = 600;
const BOARD_WIDTH = 500;

// 10 unique battlefield backgrounds — random each match
const BACKGROUNDS = [
  '/bg_1.png', '/bg_2.png', '/bg_3.png', '/bg_4.png', '/bg_5.png',
  '/bg_6.png', '/bg_7.png', '/bg_8.png', '/bg_9.png', '/bg_10.png'
];
const RANDOM_BG = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];

// Generate static dust particles and wind streaks once
const DUST_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  dx: (Math.random() - 0.5) * 160,
  dy: -(20 + Math.random() * 60),
  dur: 3 + Math.random() * 5,
  delay: Math.random() * 5,
}));

const WIND_STREAKS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  top: 15 + Math.random() * 70,
  dur: 2.5 + Math.random() * 3,
  delay: Math.random() * 4,
}));

const Game = ({ initialGameData }) => {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState(initialGameData);
  const [hand, setHand] = useState(['warrior', 'archer', 'horse']);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isShaking, setIsShaking] = useState(false);
  const [localNow, setLocalNow] = useState(Date.now());
  const [vfxEffects, setVfxEffects] = useState([]);
  const [powerNotif, setPowerNotif] = useState(null); // { text, color }
  const prevEntitiesRef = useRef([]);
  const vfxIdRef = useRef(0);

  // Add a VFX effect that auto-removes
  const addVfx = useCallback((type, x, y, duration = 500) => {
    const id = ++vfxIdRef.current;
    setVfxEffects(prev => [...prev, { id, type, x, y }]);
    setTimeout(() => setVfxEffects(prev => prev.filter(e => e.id !== id)), duration);
  }, []);

  // Start music on mount, stop on unmount
  useEffect(() => {
    initAudio();
    startBattleMusic();
    return () => stopBattleMusic();
  }, []);

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(prev => {
        const oldIds = new Set((prev?.entities || []).map(e => e.id));
        const newIds = new Set((data.entities || []).map(e => e.id));
        
        for (const ent of (prev?.entities || [])) {
          if (!newIds.has(ent.id)) {
            const me = prev.players[socket.id];
            let vy = ent.y;
            if (me && me.side === 'top') vy = BOARD_HEIGHT - ent.y;
            addVfx('death', (ent.x / BOARD_WIDTH) * 100, (vy / BOARD_HEIGHT) * 100, 600);
            playUnitDeath();
          }
        }

        for (const ent of (data.entities || [])) {
          if (ent.state === 'attacking') {
            if (Math.random() < 0.15) {
              const me = prev?.players?.[socket.id];
              let vy = ent.y;
              if (me && me.side === 'top') vy = BOARD_HEIGHT - ent.y;
              addVfx('spark', (ent.x / BOARD_WIDTH) * 100, (vy / BOARD_HEIGHT) * 100, 350);
              // Play attack sound based on unit type
              const card = ent.cardId;
              if (card === 'archer') playArrowShoot();
              else if (card === 'elephant') { if (Math.random() < 0.4) playElephantStomp(); }
              else if (card === 'horse') { if (Math.random() < 0.5) playHorseSound(); else playSwordHit(); }
              else playSwordHit();
            }
          }
        }

        return { ...prev, ...data };
      });
    });

    socket.on('elephantStomp', () => {
      setIsShaking(true);
      addVfx('flash-red', 50, 50, 500);
      addVfx('shockwave', 50, 50, 900);
      playElephantStomp();
      setTimeout(() => setIsShaking(false), 800);
    });

    socket.on('powerActivated', (data) => {
      if (data.powerType === 'mage') {
        addVfx('flash-blue', 50, 50, 600);
        playFreezeSound();
      }
      // Show notification if opponent used the power
      if (data.playerId !== socket.id) {
        const powerName = data.powerType === 'mage' ? '❄️ MAGE FREEZE' : '💥 ELEPHANT STOMP';
        const color = data.powerType === 'mage' ? '#00ccff' : '#ff6600';
        setPowerNotif({ text: `Opponent used ${powerName}!`, color });
        setTimeout(() => setPowerNotif(null), 3000);
      }
    });

    return () => {
      socket.off('gameState');
      socket.off('elephantStomp');
      socket.off('powerActivated');
    };
  }, [socket, addVfx]);

  useEffect(() => {
    const int = setInterval(() => setLocalNow(Date.now()), 500);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (gameState?.powerSelectionState?.playerId === socket.id) {
      setTimeLeft(10);
      const int = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(int);
    }
  }, [gameState?.powerSelectionState, socket.id]);

  const me = gameState.players[socket.id];
  const opponentId = Object.keys(gameState.players).find(id => id !== socket.id);
  const opponent = gameState.players[opponentId];

  const [selectedCard, setSelectedCard] = useState(null);
  const deployCountRef = useRef(0);

  // Row-based formation positions
  const ROW_SLOTS = [80, 170, 250, 330, 420]; // 5 slots per row

  const handleDragStart = (e, cardId, index) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('handIndex', index);
  };

  // Auto-deploy in formation: fills row left-to-right, then next row behind
  const deployCard = (cardId, handIndex, xOverride) => {
    if (!cardId || me.mana < CARDS[cardId].cost) return;
    
    let x;
    if (xOverride !== undefined && xOverride !== null) {
      x = xOverride; // Manual placement from drag
    } else {
      // Auto-place in row formation
      const slotIndex = deployCountRef.current % ROW_SLOTS.length;
      x = ROW_SLOTS[slotIndex];
      deployCountRef.current++;
    }

    socket.emit('spawnUnit', { 
      gameId: gameState.id, cardId, x,
      hpBonus: getUnitStats(cardId).hpBonus,
      dmgBonus: getUnitStats(cardId).dmgBonus
    });
    // Unit-specific deploy sounds
    if (cardId === 'horse') playHorseSound();
    else playDeploy();
    addVfx('spark', (x / BOARD_WIDTH) * 100, 85, 400);
    const newHand = [...hand];
    const availableCards = DECK.filter(c => c !== cardId);
    newHand[handIndex] = availableCards[Math.floor(Math.random() * availableCards.length)];
    setHand(newHand);
    setSelectedCard(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const handIndex = parseInt(e.dataTransfer.getData('handIndex'), 10);
    if (!cardId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * BOARD_WIDTH;
    deployCard(cardId, handIndex, xPercent);
  };

  // Tap-to-deploy on mobile: tap battlefield after selecting a card
  const handleBattlefieldTap = (e) => {
    if (!selectedCard) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const xPercent = ((clientX - rect.left) / rect.width) * BOARD_WIDTH;
    deployCard(selectedCard.cardId, selectedCard.handIndex, xPercent);
  };

  const handleDragOver = (e) => e.preventDefault();

  // Calculate match time for energy ramp indicator
  const matchStartTime = gameState.startTime || Date.now();
  const matchSec = Math.floor((localNow - matchStartTime) / 1000);
  const isDoubleElixir = matchSec >= 120;
  const isFastElixir = matchSec >= 60 && matchSec < 120;

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', height: '100vh', height: '100dvh', background: '#0a0805', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      {/* Top Bar - Opponent */}
      <div style={{ padding: '6px 12px', background: 'linear-gradient(180deg, rgba(40,10,10,0.95), rgba(20,5,5,0.95))', borderBottom: '2px solid #ff4d4d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff3300', boxShadow: '0 0 6px #ff3300' }}></div>
          <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{opponent?.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '100px', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${((opponent?.baseHp || 0) / 1000) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #cc0000, #ff4d4d)', transition: 'width 0.3s' }}></div>
          </div>
          <span style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '0.75rem', minWidth: '30px' }}>{Math.floor(opponent?.baseHp || 0)}</span>
        </div>
      </div>

      {/* Battlefield */}
      <div 
        className={isShaking ? 'shake-animation' : ''}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleBattlefieldTap}
        onTouchEnd={(e) => { e.preventDefault(); const touch = e.changedTouches[0]; const rect = e.currentTarget.getBoundingClientRect(); if (selectedCard) { const xPercent = ((touch.clientX - rect.left) / rect.width) * BOARD_WIDTH; deployCard(selectedCard.cardId, selectedCard.handIndex, xPercent); } }}
        style={{ 
          flexGrow: 1, position: 'relative', overflow: 'hidden', 
          backgroundImage: `url(${RANDOM_BG})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          touchAction: 'none',
        }}
      >
        {/* Atmospheric vignette + fog overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.2) 100%)',
        }} />
        {/* Ambient dust particles */}
        {DUST_PARTICLES.map(p => (
          <div key={`dust-${p.id}`} className="dust-particle" style={{
            left: `${p.left}%`, top: `${p.top}%`,
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
            '--dur': `${p.dur}s`, '--delay': `${p.delay}s`
          }} />
        ))}

        {/* Wind streaks */}
        {WIND_STREAKS.map(w => (
          <div key={`wind-${w.id}`} className="wind-streak" style={{
            top: `${w.top}%`,
            '--dur': `${w.dur}s`, '--delay': `${w.delay}s`
          }} />
        ))}

        {/* Spawn Zone Indicators */}
        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '80px', background: 'linear-gradient(to top, rgba(0,204,255,0.15), transparent)', pointerEvents: 'none', borderTop: '1px solid rgba(0,204,255,0.1)' }}></div>
        <div style={{ position: 'absolute', top: 0, width: '100%', height: '80px', background: 'linear-gradient(to bottom, rgba(255,50,50,0.15), transparent)', pointerEvents: 'none', borderBottom: '1px solid rgba(255,50,50,0.1)' }}></div>

        {/* VFX Layer */}
        {vfxEffects.map(fx => {
          if (fx.type === 'death') {
            return <div key={fx.id} className="death-explosion" style={{ left: `${fx.x}%`, top: `${fx.y}%` }} />;
          }
          if (fx.type === 'spark') {
            return <div key={fx.id} className="combat-spark" style={{ left: `${fx.x}%`, top: `${fx.y}%` }} />;
          }
          if (fx.type === 'flash-red') {
            return <div key={fx.id} className="screen-flash" style={{ background: 'rgba(255,50,0,0.5)' }} />;
          }
          if (fx.type === 'flash-blue') {
            return <div key={fx.id} className="screen-flash" style={{ background: 'rgba(0,150,255,0.4)' }} />;
          }
          if (fx.type === 'shockwave') {
            return <div key={fx.id} className="shockwave" style={{ left: '50%', top: '50%' }} />;
          }
          return null;
        })}

        {/* Power Selection UI with Art */}
        {gameState?.powerSelectionState?.playerId === socket.id && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <h2 style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.6)', margin: 0, fontSize: '1.4rem', letterSpacing: '3px' }}>⚡ CHOOSE YOUR POWER ⚡</h2>
            <div style={{ color: 'white', marginTop: '6px', fontSize: '1.8rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>{timeLeft}s</div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              {/* Mage Card */}
              <div onClick={() => socket.emit('selectPower', { gameId: gameState.id, powerType: 'mage' })} 
                onTouchEnd={(e) => { e.preventDefault(); socket.emit('selectPower', { gameId: gameState.id, powerType: 'mage' }); }}
                style={{ width: '145px', height: '210px', borderRadius: '14px', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(0,200,255,0.6)', boxShadow: '0 0 30px rgba(0,150,255,0.4)', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(0,150,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,150,255,0.4)'; }}
              >
                <div style={{ width: '100%', height: '140px', backgroundImage: 'url(/power_mage.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ background: 'linear-gradient(180deg, #001144, #002266)', padding: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#00ccff', fontWeight: '900', fontSize: '1rem' }}>MAGE</div>
                  <div style={{ color: '#88ddff', fontSize: '0.7rem', fontWeight: 'bold' }}>❄️ FREEZE ALL</div>
                </div>
              </div>
              {/* Elephant Card */}
              <div onClick={() => socket.emit('selectPower', { gameId: gameState.id, powerType: 'elephant' })} 
                onTouchEnd={(e) => { e.preventDefault(); socket.emit('selectPower', { gameId: gameState.id, powerType: 'elephant' }); }}
                style={{ width: '145px', height: '210px', borderRadius: '14px', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(255,150,0,0.6)', boxShadow: '0 0 30px rgba(255,100,0,0.4)', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(255,100,0,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,100,0,0.4)'; }}
              >
                <div style={{ width: '100%', height: '140px', backgroundImage: 'url(/power_elephant.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ background: 'linear-gradient(180deg, #441100, #662200)', padding: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#ff9900', fontWeight: '900', fontSize: '1rem' }}>ELEPHANT</div>
                  <div style={{ color: '#ffcc88', fontSize: '0.7rem', fontWeight: 'bold' }}>💥 DESTROY ALL</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Power Activation Cinematic */}
        {powerNotif && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            zIndex: 800, pointerEvents: 'none'
          }}>
            {/* Cinematic character image */}
            <div style={{
              width: '120px', height: '120px',
              backgroundImage: `url(${powerNotif.color === '#00ccff' ? '/char_mage.png' : '/char_elephant.png'})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              borderRadius: '50%',
              border: `3px solid ${powerNotif.color}`,
              boxShadow: `0 0 40px ${powerNotif.color}80, 0 0 80px ${powerNotif.color}40`,
              animation: 'fadeIn 0.4s ease-out',
              marginBottom: '10px'
            }} />
            <div style={{
              background: 'rgba(0,0,0,0.85)', border: `2px solid ${powerNotif.color}`,
              borderRadius: '12px', padding: '10px 24px',
              boxShadow: `0 0 30px ${powerNotif.color}40`,
              textAlign: 'center'
            }}>
              <div style={{ color: powerNotif.color, fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px', textShadow: `0 0 10px ${powerNotif.color}` }}>
                {powerNotif.text}
              </div>
            </div>
          </div>
        )}

        {/* Entities - 3D Style with Per-Unit Animations */}
        {gameState.entities.map(ent => {
          let visualY = ent.y;
          if (me.side === 'top') visualY = BOARD_HEIGHT - ent.y;
          
          const topPercent = (visualY / BOARD_HEIGHT) * 100;
          const leftPercent = (ent.x / BOARD_WIDTH) * 100;
          const isMine = ent.ownerId === socket.id;
          const card = CARDS[ent.cardId];
          const unitSize = card.size || 48;
          const isFrozen = ent.frozenUntil && localNow < ent.frozenUntil;
          const unitClass = `unit-${ent.cardId}`;
          const stateClass = isFrozen ? 'frozen-unit' : (ent.state === 'attacking' ? 'anim-attack' : 'anim-walk');
          const lungeDir = ent.side === me.side ? '-20px' : '20px';
          const hpPercent = (ent.hp / ent.maxHp) * 100;
          const hpColor = hpPercent > 60 ? '#00ff00' : hpPercent > 30 ? '#ffaa00' : '#ff0000';
          const isAttacking = ent.state === 'attacking' && !isFrozen;

          return (
            <div key={ent.id} className={`${unitClass} ${stateClass}`} style={{
              position: 'absolute',
              top: `${topPercent}%`, left: `${leftPercent}%`,
              width: `${unitSize}px`, height: `${unitSize}px`,
              marginLeft: `-${unitSize/2}px`, marginTop: `-${unitSize/2}px`,
              borderRadius: ent.cardId === 'horse' ? '30%' : '50%',
              backgroundImage: `url(${card.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: `2px solid ${isMine ? 'rgba(0,200,255,0.7)' : 'rgba(255,50,0,0.7)'}`,
              boxShadow: isAttacking
                ? `0 0 15px ${isMine ? 'rgba(0,200,255,0.7)' : 'rgba(255,50,0,0.7)'}, 0 4px 8px rgba(0,0,0,0.6)`
                : `0 4px 12px rgba(0,0,0,0.7), 0 0 4px ${isMine ? 'rgba(0,200,255,0.2)' : 'rgba(255,50,0,0.2)'}`,
              transition: 'top 0.1s linear, left 0.1s linear',
              '--lunge-dir': lungeDir,
              zIndex: Math.floor(visualY / 10) + 10
            }}>
              {/* HP Bar */}
              <div style={{ position: 'absolute', top: '-10px', left: '-4px', width: `${unitSize + 8}px`, height: '5px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${hpPercent}%`, height: '100%', background: `linear-gradient(90deg, ${hpColor}, ${hpColor}aa)`, transition: 'width 0.2s', borderRadius: '3px' }}></div>
              </div>
              {/* Name label */}
              <div style={{ position: 'absolute', bottom: '-14px', width: '100%', textAlign: 'center', fontSize: '0.5rem', color: isMine ? '#88ddff' : '#ff8866', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                {card.name}
              </div>

              {/* === Per-unit VFX overlays (only when attacking) === */}
              {/* Warrior: golden slash arc */}
              {isAttacking && ent.cardId === 'warrior' && (
                <div className="slash-effect" />
              )}
              {/* Archer: arrow trail shooting out */}
              {isAttacking && ent.cardId === 'archer' && (
                <>
                  <div className={`arrow-trail ${ent.side === me.side ? '' : 'arrow-trail-down'}`} />
                  <div className={`arrow-trail ${ent.side === me.side ? '' : 'arrow-trail-down'}`} style={{ left: '55%', animationDelay: '0.2s' }} />
                </>
              )}
              {/* Horse: dust kicked up behind */}
              {ent.cardId === 'horse' && !isFrozen && (
                <>
                  <div className="dust-trail" />
                  <div className="dust-trail" />
                </>
              )}
              {/* Elephant: ground crack on attack */}
              {isAttacking && ent.cardId === 'elephant' && (
                <div className="stomp-crack" />
              )}
              {/* Mage: orbiting magic orbs */}
              {isAttacking && ent.cardId === 'mage' && (
                <>
                  <div className="magic-orb" />
                  <div className="magic-orb" />
                  <div className="magic-orb" />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Bar - Player */}
      <div style={{ padding: '8px 12px', background: 'linear-gradient(0deg, #0a1a2a, #0d1117)', borderTop: '2px solid #00ccff', color: 'white', zIndex: 10 }}>
        
        {/* Status Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ccff', boxShadow: '0 0 6px #00ccff' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>HP</span>
            <div style={{ width: '80px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${((me?.baseHp || 0) / 1000) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #0088ff)', transition: 'width 0.3s' }}></div>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#00ccff' }}>{Math.floor(me?.baseHp || 0)}</span>
          </div>

          {/* Kill progress toward power */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.75rem' }}>⚔️</span>
            <div style={{ width: '50px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(Math.min(me?.kills || 0, 3) / 3) * 100}%`, height: '100%', background: (me?.kills || 0) >= 3 ? 'linear-gradient(90deg, #FFD700, #ff8800)' : 'linear-gradient(90deg, #FFD700, #cc9900)', transition: 'width 0.3s', borderRadius: '3px' }}></div>
            </div>
            <span style={{ color: (me?.kills || 0) >= 3 ? '#FFD700' : '#999', fontSize: '0.7rem', fontWeight: 'bold' }}>{Math.min(me?.kills || 0, 3)}/3</span>
          </div>

          <div style={{ color: me?.powerUses >= 2 ? '#666' : '#00ff88', fontWeight: 'bold', fontSize: '0.7rem' }}>
            ⚡ {me?.powerUses >= 2 ? 'Powers Used' : `${2 - (me?.powerUses || 0)} Powers Left`}
          </div>
        </div>

        {/* Energy Bar */}
        <div className={isDoubleElixir ? 'energy-surge' : ''} style={{ background: '#222', height: '14px', borderRadius: '7px', overflow: 'hidden', position: 'relative', marginBottom: '8px', border: isFastElixir ? '1px solid rgba(255,0,255,0.4)' : '1px solid #333' }}>
          <div style={{ width: `${((me?.mana || 0) / 10) * 100}%`, height: '100%', background: isDoubleElixir ? 'linear-gradient(90deg, #ff00ff, #ff66ff)' : 'linear-gradient(90deg, #8800cc, #cc00ff)', transition: 'width 0.15s linear' }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            ENERGY: {Math.floor(me?.mana || 0)}/10 {isDoubleElixir ? '⚡2X' : isFastElixir ? '⚡1.5X' : ''}
          </div>
        </div>
        
        {/* 3D Character Cards */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '0 4px' }}>
          {hand.map((cardId, index) => {
            const card = CARDS[cardId];
            const canAfford = me.mana >= card.cost;
            const isSelected = selectedCard && selectedCard.cardId === card.id && selectedCard.handIndex === index;
            const unitClass = `unit-${cardId}`;
            const previewAnim = isSelected ? 'anim-attack' : 'anim-walk';
            return (
              <div 
                key={`${card.id}-${index}`}
                draggable={canAfford}
                onDragStart={(e) => handleDragStart(e, card.id, index)}
                onClick={() => { if (canAfford) { playCardSelect(); deployCard(card.id, index); } }}
                onTouchEnd={(e) => { e.preventDefault(); if (canAfford) { playCardSelect(); deployCard(card.id, index); } }}
                style={{
                  width: '90px', height: '105px',
                  background: 'linear-gradient(180deg, rgba(20,15,10,0.9), rgba(10,8,5,0.95))',
                  border: canAfford ? '1px solid rgba(255,215,0,0.25)' : '1px solid #222',
                  borderRadius: '12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  opacity: canAfford ? 1 : 0.3,
                  boxShadow: canAfford ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Animated character preview */}
                <div 
                  className={`${unitClass} ${canAfford ? previewAnim : ''}`}
                  style={{
                    width: `${card.size + 8}px`, height: `${card.size + 8}px`,
                    backgroundImage: `url(${card.image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    borderRadius: '50%',
                    marginBottom: '4px',
                    filter: canAfford ? 'none' : 'grayscale(0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.6)'
                  }}
                />

                {/* Pedestal glow (ground shadow under character) */}
                <div style={{
                  width: '60%', height: '4px',
                  background: 'radial-gradient(ellipse, rgba(0,200,255,0.2), transparent)',
                  borderRadius: '50%',
                  marginBottom: '2px'
                }} />

                {/* Name + Cost bar */}
                <div style={{
                  width: '100%', padding: '3px 4px',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '0 0 10px 10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#ccc' }}>{card.name}</span>
                  <span style={{
                    background: canAfford ? 'linear-gradient(135deg, #cc00cc, #8800aa)' : '#333',
                    color: 'white', borderRadius: '4px',
                    padding: '1px 5px', fontSize: '0.6rem', fontWeight: 'bold',
                    boxShadow: canAfford ? '0 0 6px rgba(200,0,200,0.4)' : 'none'
                  }}>{card.cost}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.6rem', color: '#555', marginTop: '3px' }}>
          👆 Tap a card to deploy in formation
        </div>
      </div>
    </div>
  );
};

export default Game;
