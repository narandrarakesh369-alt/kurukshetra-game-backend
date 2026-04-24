import React, { useState } from 'react';

const AVATARS = [
  { id: 'warrior', src: '/sprite_soldier_1776914300848.png', name: 'Warrior' },
  { id: 'archer', src: '/sprite_archer_1776914321439.png', name: 'Archer' },
  { id: 'cavalry', src: '/sprite_cavalry_1776914340287.png', name: 'Cavalry' },
  { id: 'giant', src: '/sprite_giant_1776914359721.png', name: 'Giant' },
];

const LoginScreen = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].src);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    onLogin(name.trim(), avatar);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0f0a 50%, #0a0a1a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#FFD700', marginBottom: '5px', textTransform: 'uppercase' }}>Welcome to</div>
        <h1 style={{ fontSize: '2.8rem', color: '#FFD700', margin: 0, textShadow: '0 0 30px rgba(255,215,0,0.4), 0 4px 8px rgba(0,0,0,0.8)', fontWeight: '900', letterSpacing: '3px' }}>
          KURUKSHETRA
        </h1>
        <div style={{ fontSize: '0.9rem', color: '#cc8800', letterSpacing: '5px' }}>CARD WAR ARENA</div>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '360px', background: 'rgba(30,20,15,0.9)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(10px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        
        <h3 style={{ color: '#FFD700', textAlign: 'center', margin: '0 0 20px', fontSize: '1.1rem' }}>Create Your Legend</h3>

        {/* Name Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#aa8844', fontSize: '0.8rem', marginBottom: '6px', letterSpacing: '1px' }}>WARRIOR NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Enter your name..."
            maxLength={16}
            style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '8px', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <div style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '4px' }}>{error}</div>}
        </div>

        {/* Avatar Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#aa8844', fontSize: '0.8rem', marginBottom: '10px', letterSpacing: '1px' }}>CHOOSE AVATAR</label>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {AVATARS.map(a => (
              <div
                key={a.id}
                onClick={() => setAvatar(a.src)}
                style={{
                  width: '65px', height: '65px', borderRadius: '50%',
                  backgroundImage: `url(${a.src})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  border: avatar === a.src ? '3px solid #FFD700' : '3px solid #333',
                  boxShadow: avatar === a.src ? '0 0 15px rgba(255,215,0,0.4)' : 'none',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #8B4513, #D2691E)', color: 'white', border: '1px solid #FFD700', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(255,215,0,0.2)', transition: 'all 0.2s' }}
        >
          ENTER THE ARENA
        </button>
      </div>

      <div style={{ color: '#444', fontSize: '0.7rem', marginTop: '20px' }}>Your progress is saved locally</div>
    </div>
  );
};

export default LoginScreen;
