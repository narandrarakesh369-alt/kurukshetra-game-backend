const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve the frontend build
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const GAMES = {};
let matchQueue = [];

const CARDS = {
  warrior: { id: 'warrior', cost: 3, hp: 300, maxHp: 300, dmg: 15, range: 30, speed: 12, attackSpeed: 1000, type: 'melee', splash: false },
  archer: { id: 'archer', cost: 2, hp: 80, maxHp: 80, dmg: 15, range: 150, speed: 15, attackSpeed: 1200, type: 'ranged', splash: false },
  elephant: { id: 'elephant', cost: 6, hp: 600, maxHp: 600, dmg: 30, range: 40, speed: 6, attackSpeed: 1500, type: 'melee', splash: true },
  horse: { id: 'horse', cost: 4, hp: 200, maxHp: 200, dmg: 20, range: 30, speed: 25, attackSpeed: 800, type: 'melee', splash: false },
  mage: { id: 'mage', cost: 5, hp: 100, maxHp: 100, dmg: 20, range: 120, speed: 12, attackSpeed: 1500, type: 'ranged', splash: true }
};

const createGame = (p1, p2, isVsAi = false) => {
  const gameId = Math.random().toString(36).substring(2, 8);
  GAMES[gameId] = {
    id: gameId,
    status: 'playing',
    isVsAi,
    startTime: Date.now(),
    timeScale: 1.0,
    powerSelectionState: null,
    players: {
      [p1.id]: { id: p1.id, name: p1.name, baseHp: 1000, maxBaseHp: 1000, mana: 5, side: 'bottom', isBot: false, kills: 0, powerUses: 0, powerCooldownTime: 0, lastDropTime: 0 },
      [p2.id]: { id: p2.id, name: p2.name, baseHp: 1000, maxBaseHp: 1000, mana: 5, side: 'top', isBot: isVsAi, lastBotAction: 0, botWaitTime: 2000, kills: 0, powerUses: 0, powerCooldownTime: 0, lastDropTime: 0 }
    },
    entities: [],
    lastTick: Date.now()
  };
  
  if (p1.socket) p1.socket.join(gameId);
  if (p2.socket) p2.socket.join(gameId);

  io.to(gameId).emit('gameStart', GAMES[gameId]);
  return gameId;
};

// Physics constants
const BOARD_HEIGHT = 600;
const BOARD_WIDTH = 500;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinQueue', (data) => {
    const { playerName, mode } = data; // mode: 'multiplayer' or 'ai'
    
    if (mode === 'ai') {
       const p1 = { id: socket.id, name: playerName || 'Player', socket };
       const bot = { id: 'bot_' + Math.random().toString(), name: 'AI Overlord', socket: null };
       createGame(p1, bot, true);
       return;
    }

    matchQueue = matchQueue.filter(p => p.id !== socket.id);
    matchQueue.push({ id: socket.id, name: playerName || 'Guest', socket });
    socket.emit('queueStatus', { status: 'waiting' });

    if (matchQueue.length >= 2) {
      const p1 = matchQueue.shift();
      const p2 = matchQueue.shift();
      createGame(p1, p2, false);
    }
  });

  socket.on('spawnUnit', (data) => {
    const { gameId, cardId, x, y } = data; 
    const game = GAMES[gameId];
    if (!game || game.status !== 'playing') return;

    const player = game.players[socket.id];
    if (!player) return;

    const now = Date.now();
    if (now - player.lastDropTime < 500) return; // 0.5s anti-spam placement delay

    const card = CARDS[cardId];
    if (!card || player.mana < card.cost) return;

    player.mana -= card.cost;
    player.lastDropTime = now;

    const entity = {
      id: Math.random().toString(36).substring(2),
      ownerId: socket.id,
      side: player.side,
      cardId,
      hp: card.hp + (data.hpBonus || 0),
      maxHp: card.maxHp + (data.hpBonus || 0),
      dmg: card.dmg + (data.dmgBonus || 0),
      x: x || 250, 
      y: player.side === 'bottom' ? BOARD_HEIGHT - 30 : 30,
      lastAttack: 0,
      state: 'moving'
    };

    game.entities.push(entity);
  });

  socket.on('selectPower', (data) => {
    const { gameId, powerType } = data;
    const game = GAMES[gameId];
    if (!game || game.status !== 'playing') return;
    const player = game.players[socket.id];
    if (!player) return;

    if (game.powerSelectionState && game.powerSelectionState.playerId === socket.id) {
      activatePower(game, player, powerType);
    }
  });

  socket.on('disconnect', () => {
    matchQueue = matchQueue.filter(p => p.id !== socket.id);
    for (const gid in GAMES) {
      const game = GAMES[gid];
      if (game.players[socket.id] && game.status === 'playing') {
        game.status = 'finished';
        const opponentId = Object.keys(game.players).find(id => id !== socket.id);
        game.winner = opponentId;
        io.to(gid).emit('gameOver', { winner: opponentId, reason: 'Opponent disconnected' });
      }
    }
  });
});

const spawnBotUnit = (game, botPlayer, cardId, x) => {
    if (botPlayer.mana < CARDS[cardId].cost) return false;
    botPlayer.mana -= CARDS[cardId].cost;
    game.entities.push({
      id: Math.random().toString(36).substring(2),
      ownerId: botPlayer.id,
      side: botPlayer.side,
      cardId,
      hp: CARDS[cardId].hp,
      maxHp: CARDS[cardId].maxHp,
      x: x, 
      y: 30,
      lastAttack: 0,
      state: 'moving'
    });
    return true;
};

const checkPowerTrigger = (game, player, now) => {
  if (player.kills >= 3 && player.powerUses < 2 && now >= player.powerCooldownTime && !game.powerSelectionState) {
    game.powerSelectionState = { playerId: player.id, expiresAt: now + 10000 };
    game.timeScale = 0.1;
    io.to(game.id).emit('triggerPowerSelection', { playerId: player.id, expiresAt: now + 10000 });
  }
};

const activatePower = (game, player, powerType) => {
  game.timeScale = 1.0;
  game.powerSelectionState = null;
  player.kills = 0;
  player.powerUses += 1;
  
  const now = Date.now();
  if (powerType === 'mage') {
    player.powerCooldownTime = now + 20000;
    for (const ent of game.entities) {
      if (ent.side !== player.side) ent.frozenUntil = now + 10000;
    }
  } else if (powerType === 'elephant') {
    player.powerCooldownTime = now + 30000;
    for (const ent of game.entities) {
      if (ent.side !== player.side) ent.hp = 0;
    }
    io.to(game.id).emit('elephantStomp', { playerId: player.id });
  }
  
  io.to(game.id).emit('powerActivated', { playerId: player.id, powerType });
};

// Main Game Loop (10 ticks per second)
setInterval(() => {
  const now = Date.now();
  for (const gid in GAMES) {
    const game = GAMES[gid];
    if (game.status !== 'playing') continue;

    const dt = ((now - game.lastTick) / 1000) * game.timeScale;
    game.lastTick = now;

    if (game.powerSelectionState && now >= game.powerSelectionState.expiresAt) {
      const powerType = Math.random() > 0.5 ? 'mage' : 'elephant';
      activatePower(game, game.players[game.powerSelectionState.playerId], powerType);
    }

    const matchDuration = (now - game.startTime) / 1000;
    let regenMultiplier = 1;
    if (matchDuration >= 120) regenMultiplier = 2; // Double Elixir
    else if (matchDuration >= 60) regenMultiplier = 1.5; // Fast Elixir

    // Mana regen (1 mana per 2 seconds = 0.5 per second base)
    for (const pid in game.players) {
      const p = game.players[pid];
      if (p.mana < 10) {
        p.mana = Math.min(10, p.mana + (0.5 * regenMultiplier) * dt);
      }
    }

    // AI Logic
    if (game.isVsAi) {
       const botId = Object.keys(game.players).find(id => game.players[id].isBot);
       const bot = game.players[botId];
       if (now - bot.lastBotAction > bot.botWaitTime) {
          bot.lastBotAction = now;
          bot.botWaitTime = 1000 + Math.random() * 2000; // 1-3 seconds delay

          // Find biggest threat anywhere on the board
          let threat = null;
          let highestThreatScore = -1;
          for(const ent of game.entities) {
             if (ent.side !== bot.side) {
                let score = ent.hp;
                if (score > highestThreatScore) {
                   highestThreatScore = score;
                   threat = ent;
                }
             }
          }

          if (threat) {
             // Counter strategy
             if (threat.cardId === 'horse' && bot.mana >= 3) spawnBotUnit(game, bot, 'warrior', threat.x); // Warrior tanks horse
             else if (threat.cardId === 'archer' && bot.mana >= 4) spawnBotUnit(game, bot, 'horse', threat.x); // Horse kills archer
             else if (threat.cardId === 'warrior' && bot.mana >= 2) spawnBotUnit(game, bot, 'archer', threat.x); // Archer chips warrior
             else if (bot.mana >= 3) spawnBotUnit(game, bot, 'warrior', threat.x);
          } else {
             // Attack
             if (bot.mana >= 4) {
                const attackCards = ['warrior', 'horse']; // Only basic attack cards
                const card = attackCards[Math.floor(Math.random() * attackCards.length)];
                spawnBotUnit(game, bot, card, 150 + Math.random() * 200);
             }
          }
       }
    }

    // Process entities
    for (let i = 0; i < game.entities.length; i++) {
      const ent = game.entities[i];
      if (ent.frozenUntil && now < ent.frozenUntil) continue;

      const card = CARDS[ent.cardId];

      let target = null;
      let targetDist = Infinity;

      for (let j = 0; j < game.entities.length; j++) {
        const other = game.entities[j];
        if (other.side !== ent.side && other.hp > 0) {
          // Calculate Euclidean distance
          const dx = other.x - ent.x;
          const dy = other.y - ent.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < targetDist) {
            targetDist = dist;
            target = other;
          }
        }
      }

      const isAttackingBase = targetDist > card.range && ((ent.side === 'bottom' && ent.y <= 50) || (ent.side === 'top' && ent.y >= BOARD_HEIGHT - 50));

      if (targetDist <= card.range || isAttackingBase) {
        ent.state = 'attacking';
        if (now - ent.lastAttack >= card.attackSpeed) {
          ent.lastAttack = now;
          const entDmg = ent.dmg || card.dmg;
          if (isAttackingBase) {
            const enemyId = Object.keys(game.players).find(id => game.players[id].side !== ent.side);
            game.players[enemyId].baseHp -= entDmg;
            if (game.players[enemyId].baseHp <= 0 && game.status === 'playing') {
              game.status = 'finished';
              game.winner = ent.ownerId;
              
              // Give coins and XP based on win/loss
              const winnerId = ent.ownerId;
              const loserId = enemyId;
              io.to(game.id).emit('gameOver', { 
                winner: winnerId,
                winnerKills: game.players[winnerId]?.kills || 0,
                loserKills: game.players[loserId]?.kills || 0,
                rewards: {
                  winner: { coins: 50, xp: 100 },
                  loser: { coins: 10, xp: 20 }
                }
              });
            }
          } else {
            // Apply damage
            const prevHp = target.hp;
            target.hp -= entDmg;
            if (target.hp <= 0 && prevHp > 0) {
              game.players[ent.ownerId].kills += 1;
              checkPowerTrigger(game, game.players[ent.ownerId], now);
            }

            // Splash damage
            if (card.splash) {
               for(const other of game.entities) {
                  if (other.id !== target.id && other.side === target.side && other.hp > 0) {
                     const dx = other.x - target.x;
                     const dy = other.y - target.y;
                     if (Math.sqrt(dx*dx + dy*dy) < 50) { // 50px splash radius
                        const oPrevHp = other.hp;
                        other.hp -= entDmg;
                        if (other.hp <= 0 && oPrevHp > 0) {
                           game.players[ent.ownerId].kills += 1;
                           checkPowerTrigger(game, game.players[ent.ownerId], now);
                        }
                     }
                  }
               }
            }
          }
        }
      } else {
        ent.state = 'moving';
        // Move towards target or base
        let dirX = 0;
        let dirY = ent.side === 'bottom' ? -1 : 1;

        if (target && targetDist < 300) { // lock on to target if relatively close
           const angle = Math.atan2(target.y - ent.y, target.x - ent.x);
           dirX = Math.cos(angle);
           dirY = Math.sin(angle);
        }

        ent.x += dirX * card.speed * dt * 5;
        ent.y += dirY * card.speed * dt * 5;
      }
    }

    // Collision Spacing (Repel forces)
    for (let i = 0; i < game.entities.length; i++) {
      const e1 = game.entities[i];
      if (e1.state !== 'moving') continue;
      for (let j = 0; j < game.entities.length; j++) {
        if (i === j) continue;
        const e2 = game.entities[j];
        if (e1.side === e2.side) {
          const dx = e1.x - e2.x;
          const dy = e1.y - e2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0 && dist < 35) { // 35px unit radius
            const force = (35 - dist) / 35;
            e1.x += (dx / dist) * force * 3; // Push apart gently
            e1.y += (dy / dist) * force * 3;
          }
        }
      }
      // Keep inside horizontal bounds
      e1.x = Math.max(20, Math.min(BOARD_WIDTH - 20, e1.x));
    }

    game.entities = game.entities.filter(e => e.hp > 0);

    io.to(game.id).emit('gameState', {
      players: game.players,
      entities: game.entities,
      powerSelectionState: game.powerSelectionState,
      startTime: game.startTime
    });
  }
}, 100);

// Catch-all: serve index.html for any non-API route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Kurkshtra Server running on port ${PORT}`);
});
