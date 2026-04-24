// playerData.js — All localStorage persistence for Kurukshetra

const STORAGE_KEY = 'kurukshetra_player';

const DEFAULT_PLAYER = {
  name: '',
  avatar: '/sprite_soldier_1776914300848.png',
  coins: 0,
  xp: 0,
  level: 1,
  totalMatches: 0,
  wins: 0,
  losses: 0,
  totalKills: 0,
  currentStreak: 0,
  bestStreak: 0,
  favoriteUnit: 'warrior',
  unitUsage: { warrior: 0, archer: 0, horse: 0 },
  upgrades: { warrior: 1, archer: 1, horse: 1 },  // level 1-5
  dailyReward: {
    lastClaimDate: null,   // 'YYYY-MM-DD'
    currentDay: 0,         // 0-6 (7-day cycle)
    streak: 0
  },
  createdAt: null
};

const DAILY_REWARDS = [
  { day: 1, coins: 50,  label: '50 Coins' },
  { day: 2, coins: 100, label: '100 Coins' },
  { day: 3, coins: 150, label: '150 Coins' },
  { day: 4, coins: 200, label: '200 Coins' },
  { day: 5, coins: 250, label: '250 Coins' },
  { day: 6, coins: 300, label: '300 Coins' },
  { day: 7, coins: 500, label: '500 Coins 🎉' },
];

const UPGRADE_COSTS = {
  warrior: [0, 200, 400, 700, 1200],  // cost to go from level N to N+1
  archer:  [0, 150, 300, 550, 1000],
  horse:   [0, 250, 500, 800, 1400],
};

const UPGRADE_BONUSES = {
  warrior: { hpPerLevel: 50, dmgPerLevel: 3 },
  archer:  { hpPerLevel: 15, dmgPerLevel: 5 },
  horse:   { hpPerLevel: 30, dmgPerLevel: 4 },
};

export function loadPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PLAYER, ...JSON.parse(raw) };
  } catch (e) {}
  return null;
}

export function savePlayer(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createPlayer(name, avatar) {
  const player = {
    ...DEFAULT_PLAYER,
    name,
    avatar,
    createdAt: new Date().toISOString()
  };
  savePlayer(player);
  return player;
}

export function isLoggedIn() {
  const p = loadPlayer();
  return p && p.name && p.name.length > 0;
}

// Returns reward if claimable, null otherwise
export function checkDailyReward() {
  const player = loadPlayer();
  if (!player) return null;

  const today = new Date().toISOString().split('T')[0];
  if (player.dailyReward.lastClaimDate === today) return null; // Already claimed today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let nextDay = player.dailyReward.currentDay;

  if (player.dailyReward.lastClaimDate !== yesterday && player.dailyReward.lastClaimDate !== null) {
    nextDay = 0; // streak broken
  }

  if (nextDay >= 7) nextDay = 0; // cycle restarts

  return DAILY_REWARDS[nextDay];
}

export function claimDailyReward() {
  const player = loadPlayer();
  if (!player) return null;

  const today = new Date().toISOString().split('T')[0];
  if (player.dailyReward.lastClaimDate === today) return null;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let nextDay = player.dailyReward.currentDay;

  if (player.dailyReward.lastClaimDate !== yesterday && player.dailyReward.lastClaimDate !== null) {
    nextDay = 0;
  }
  if (nextDay >= 7) nextDay = 0;

  const reward = DAILY_REWARDS[nextDay];
  player.coins += reward.coins;
  player.dailyReward.lastClaimDate = today;
  player.dailyReward.currentDay = nextDay + 1;
  player.dailyReward.streak = nextDay + 1;

  savePlayer(player);
  return reward;
}

export function recordMatchResult(isWinner, kills, unitsDeployed) {
  const player = loadPlayer();
  if (!player) return {};

  player.totalMatches += 1;
  player.totalKills += kills;

  let streakBonus = 0;

  if (isWinner) {
    player.wins += 1;
    player.currentStreak += 1;
    if (player.currentStreak > player.bestStreak) player.bestStreak = player.currentStreak;

    if (player.currentStreak >= 5) streakBonus = 1.0;
    else if (player.currentStreak >= 3) streakBonus = 0.5;
    else if (player.currentStreak >= 2) streakBonus = 0.25;
  } else {
    player.losses += 1;
    player.currentStreak = 0;
  }

  const baseCoins = isWinner ? 50 : 10;
  const baseXp = isWinner ? 100 : 20;
  const bonusCoins = Math.floor(baseCoins * streakBonus);

  player.coins += baseCoins + bonusCoins;
  player.xp += baseXp;
  player.level = Math.floor(player.xp / 100) + 1;

  savePlayer(player);

  return {
    isWinner,
    kills,
    baseCoins,
    bonusCoins,
    totalCoins: baseCoins + bonusCoins,
    xpEarned: baseXp,
    currentStreak: player.currentStreak,
    level: player.level
  };
}

export function getUpgradeCost(unitId) {
  const player = loadPlayer();
  if (!player) return null;
  const currentLevel = player.upgrades[unitId] || 1;
  if (currentLevel >= 5) return null; // max level
  return UPGRADE_COSTS[unitId][currentLevel];
}

export function upgradeUnit(unitId) {
  const player = loadPlayer();
  if (!player) return false;
  const currentLevel = player.upgrades[unitId] || 1;
  if (currentLevel >= 5) return false;
  const cost = UPGRADE_COSTS[unitId][currentLevel];
  if (player.coins < cost) return false;

  player.coins -= cost;
  player.upgrades[unitId] = currentLevel + 1;
  savePlayer(player);
  return true;
}

export function getUnitStats(unitId) {
  const player = loadPlayer();
  const level = player ? (player.upgrades[unitId] || 1) : 1;
  const bonus = UPGRADE_BONUSES[unitId];
  if (!bonus) return { hpBonus: 0, dmgBonus: 0, level };
  return {
    hpBonus: (level - 1) * bonus.hpPerLevel,
    dmgBonus: (level - 1) * bonus.dmgPerLevel,
    level
  };
}

export { DAILY_REWARDS, UPGRADE_COSTS, UPGRADE_BONUSES };
