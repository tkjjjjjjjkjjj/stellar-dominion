export const VERSION = 1;

export const RESOURCE_KEYS = ["credits", "alloy", "energy", "intel"];

export const RESOURCE_META = {
  credits: { name: "クレジット", icon: "◈" },
  alloy: { name: "合金", icon: "⬢" },
  energy: { name: "エネルギー", icon: "⚡" },
  intel: { name: "情報", icon: "◆" },
};

export const BUILDINGS = {
  command: {
    name: "司令中枢",
    icon: "⌂",
    description: "帝国全体の基盤。レベルで新システムが解禁される。",
    baseCost: { credits: 220, alloy: 100 },
    growth: 1.68,
    production: {},
  },
  extractor: {
    name: "採掘プラント",
    icon: "⛏",
    description: "合金を大量生産。建築ラッシュの主役。",
    baseCost: { credits: 110, energy: 35 },
    growth: 1.54,
    production: { alloy: 3.5 },
  },
  reactor: {
    name: "量子リアクター",
    icon: "⚡",
    description: "エネルギー供給。高Tier施設の加速装置。",
    baseCost: { credits: 130, alloy: 50 },
    growth: 1.56,
    production: { energy: 4.2 },
  },
  market: {
    name: "軌道市場",
    icon: "◈",
    description: "クレジットを自動生成。征服地が多いほど伸びる。",
    baseCost: { alloy: 100, energy: 65 },
    growth: 1.6,
    production: { credits: 6.2 },
  },
  observatory: {
    name: "深宇宙観測所",
    icon: "◆",
    description: "情報を生成。兵器研究と作戦補正に使う。",
    baseCost: { credits: 310, alloy: 180, energy: 150 },
    growth: 1.64,
    production: { intel: 1.1 },
    unlock: { command: 3 },
  },
  foundry: {
    name: "自動造船所",
    icon: "✦",
    description: "全資源の生産倍率と艦隊戦力を底上げする。",
    baseCost: { credits: 900, alloy: 560, energy: 440, intel: 80 },
    growth: 1.72,
    production: {},
    unlock: { command: 5 },
  },
};

export const UNITS = {
  striker: {
    name: "ストライカー",
    icon: "➤",
    role: "機動",
    power: 13,
    cost: { credits: 90, alloy: 28 },
    strongAgainst: "siege",
  },
  guardian: {
    name: "ガーディアン",
    icon: "⬡",
    role: "防衛",
    power: 22,
    cost: { credits: 150, alloy: 58, energy: 30 },
    strongAgainst: "striker",
    unlock: { command: 2 },
  },
  siege: {
    name: "シージ級",
    icon: "✹",
    role: "火力",
    power: 38,
    cost: { credits: 300, alloy: 125, energy: 92 },
    strongAgainst: "guardian",
    unlock: { command: 4 },
  },
};

export const TERRITORIES = [
  { id: "t1", name: "灰色衛星帯", type: "mining", enemy: "漂流海賊", power: 90, reward: { credits: 500, alloy: 240 }, bonus: { alloy: 0.12 }, x: 18, y: 67 },
  { id: "t2", name: "黎明コロニー", type: "trade", enemy: "辺境同盟", power: 165, reward: { credits: 900, energy: 340 }, bonus: { credits: 0.14 }, x: 35, y: 35 },
  { id: "t3", name: "青晶星雲", type: "energy", enemy: "星雲群体", power: 320, reward: { energy: 1100, intel: 90 }, bonus: { energy: 0.16 }, x: 55, y: 72 },
  { id: "t4", name: "断層ステーション", type: "intel", enemy: "無人防衛網", power: 560, reward: { credits: 1800, intel: 170 }, bonus: { intel: 0.18 }, x: 69, y: 42 },
  { id: "t5", name: "王冠ゲート", type: "fortress", enemy: "王冠艦隊", power: 950, reward: { credits: 4200, alloy: 1800, intel: 350 }, bonus: { all: 0.12 }, x: 84, y: 69 },
  { id: "t6", name: "ゼロポイント核", type: "boss", enemy: "虚空統制体", power: 1600, reward: { credits: 9000, energy: 4200, intel: 800 }, bonus: { all: 0.18 }, x: 91, y: 27 },
];

const ACHIEVEMENTS = [
  { id: "first-up", name: "文明の第一歩", test: s => totalBuildingLevels(s) >= 6, reward: 2 },
  { id: "overflow", name: "資源の洪水", test: s => s.lifetime.totalProduced >= 100000, reward: 4 },
  { id: "conqueror", name: "星域制圧", test: s => s.conquered.length >= 4, reward: 5 },
  { id: "armada", name: "艦隊司令官", test: s => fleetPower(s) >= 1000, reward: 6 },
  { id: "ascendant", name: "超越者", test: s => s.prestige.count >= 1, reward: 8 },
];

const DEFAULT_STATE = {
  version: VERSION,
  createdAt: 0,
  lastSeenAt: 0,
  resources: { credits: 520, alloy: 180, energy: 110, intel: 0 },
  buildings: { command: 1, extractor: 1, reactor: 1, market: 0, observatory: 0, foundry: 0 },
  units: { striker: 3, guardian: 0, siege: 0 },
  conquered: [],
  battle: { streak: 0, victories: 0, losses: 0 },
  prestige: { count: 0, stars: 0, bestTerritories: 0 },
  achievements: [],
  missionClaims: [],
  lifetime: { totalProduced: 0, totalSpent: 0, totalTaps: 0 },
  settings: { sound: true, reducedMotion: false },
};

const MAX_TICK_SECONDS = 8 * 3600;
const PRODUCTION_RATE_SCALE = 0.5;
// Each ascension makes every enemy a little tougher (linear, so later laps stay winnable).
export const ENEMY_SCALE_PER_PRESTIGE = 0.1;
const AFFORD_EPSILON = 1e-9;
const PREFERRED_UNIT_BY_TERRITORY_TYPE = {
  mining: "striker",
  energy: "striker",
  trade: "guardian",
  intel: "guardian",
};
const COMPACT_NUMBER_UNITS = [
  [1e15, "Q"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"],
];

export function createInitialState(now = Date.now()) {
  return structuredClone({ ...DEFAULT_STATE, createdAt: now, lastSeenAt: now });
}

export function normalizeState(raw, now = Date.now()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== "object") return base;
  const out = {
    ...base,
    ...raw,
    resources: { ...base.resources, ...(raw.resources || {}) },
    buildings: { ...base.buildings, ...(raw.buildings || {}) },
    units: { ...base.units, ...(raw.units || {}) },
    battle: { ...base.battle, ...(raw.battle || {}) },
    prestige: { ...base.prestige, ...(raw.prestige || {}) },
    lifetime: { ...base.lifetime, ...(raw.lifetime || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
  out.conquered = Array.isArray(raw.conquered) ? raw.conquered.filter(id => TERRITORIES.some(t => t.id === id)) : [];
  out.achievements = Array.isArray(raw.achievements) ? [...new Set(raw.achievements)] : [];
  out.missionClaims = Array.isArray(raw.missionClaims) ? [...new Set(raw.missionClaims)] : [];
  return out;
}

export function totalBuildingLevels(state) {
  return Object.values(state.buildings).reduce((a, b) => a + b, 0);
}

export function isUnlocked(state, def) {
  if (!def.unlock) return true;
  return Object.entries(def.unlock).every(([key, level]) => (state.buildings[key] || 0) >= level);
}

export function scaledCost(baseCost, growth, level, count = 1) {
  const out = {};
  for (const [key, base] of Object.entries(baseCost)) {
    let total = 0;
    for (let i = 0; i < count; i += 1) total += base * Math.pow(growth, level + i);
    out[key] = Math.ceil(total);
  }
  return out;
}

export function buildingCost(state, key, count = 1) {
  const def = BUILDINGS[key];
  return scaledCost(def.baseCost, def.growth, state.buildings[key] || 0, count);
}

export function unitCost(state, key, count = 1) {
  const def = UNITS[key];
  const owned = state.units[key] || 0;
  const scale = 1 + owned * 0.025;
  return Object.fromEntries(Object.entries(def.cost).map(([r, value]) => [r, Math.ceil(value * count * scale)]));
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([key, value]) => (state.resources[key] || 0) + AFFORD_EPSILON >= value);
}

function scaleResources(values, multiplier) {
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, values[key] * multiplier]));
}

function grantResources(state, amounts) {
  let total = 0;
  for (const [key, value] of Object.entries(amounts)) {
    state.resources[key] += value;
    total += value;
  }
  return total;
}

export function spend(state, cost) {
  if (!canAfford(state, cost)) return false;
  let total = 0;
  for (const [key, value] of Object.entries(cost)) {
    state.resources[key] -= value;
    total += value;
  }
  state.lifetime.totalSpent += total;
  return true;
}

export function productionMultipliers(state) {
  const territory = { credits: 1, alloy: 1, energy: 1, intel: 1 };
  for (const id of state.conquered) {
    const bonus = TERRITORIES.find(t => t.id === id)?.bonus || {};
    for (const key of RESOURCE_KEYS) territory[key] *= 1 + (bonus[key] || 0) + (bonus.all || 0);
  }
  const command = 1 + Math.max(0, state.buildings.command - 1) * 0.05;
  const foundry = 1 + state.buildings.foundry * 0.18;
  const prestige = 1 + state.prestige.stars * 0.08;
  const conquest = 1 + state.conquered.length * 0.035;
  return Object.fromEntries(RESOURCE_KEYS.map(k => [k, territory[k] * command * foundry * prestige * conquest]));
}

export function productionPerSecond(state) {
  const raw = { credits: 2, alloy: 1, energy: 1, intel: 0 };
  for (const [key, level] of Object.entries(state.buildings)) {
    const def = BUILDINGS[key];
    if (!def) continue;
    for (const [resource, amount] of Object.entries(def.production)) {
      const levelScale = level * (1 + Math.max(0, level - 1) * 0.035);
      raw[resource] += amount * levelScale;
    }
  }
  raw.credits += state.buildings.market * state.conquered.length * 1.8;
  const mult = productionMultipliers(state);
  return Object.fromEntries(RESOURCE_KEYS.map(k => [k, raw[k] * mult[k] * PRODUCTION_RATE_SCALE]));
}

export function tick(state, seconds) {
  const dt = Math.max(0, Math.min(seconds, MAX_TICK_SECONDS));
  const rates = productionPerSecond(state);
  const produced = grantResources(state, scaleResources(rates, dt));
  state.lifetime.totalProduced += produced;
  return { rates, produced, seconds: dt };
}

export function upgradeBuilding(state, key, count = 1) {
  const def = BUILDINGS[key];
  if (!def || !isUnlocked(state, def)) return { ok: false, reason: "locked" };
  const cost = buildingCost(state, key, count);
  if (!spend(state, cost)) return { ok: false, reason: "resources", cost };
  state.buildings[key] += count;
  return { ok: true, key, count, cost };
}

export function recruitUnit(state, key, count = 1) {
  const def = UNITS[key];
  if (!def || !isUnlocked(state, def)) return { ok: false, reason: "locked" };
  const cost = unitCost(state, key, count);
  if (!spend(state, cost)) return { ok: false, reason: "resources", cost };
  state.units[key] += count;
  return { ok: true, key, count, cost };
}

export function fleetPower(state) {
  const base = Object.entries(state.units).reduce((sum, [key, count]) => sum + (UNITS[key]?.power || 0) * count, 0);
  const command = 1 + state.buildings.command * 0.03;
  const foundry = 1 + state.buildings.foundry * 0.1;
  const prestige = 1 + state.prestige.stars * 0.035;
  return Math.floor(base * command * foundry * prestige);
}

export function targetTerritory(state) {
  return TERRITORIES.find(t => !state.conquered.includes(t.id)) || null;
}

function compositionEdge(state, target) {
  const total = Object.values(state.units).reduce((sum, count) => sum + count, 0) || 1;
  const preferred = PREFERRED_UNIT_BY_TERRITORY_TYPE[target.type] || "siege";
  const preferredRatio = (state.units[preferred] || 0) / total;
  return 1 + Math.min(0.18, preferredRatio * 0.24);
}

function applyBattleVictory(state, territory) {
  state.conquered.push(territory.id);
  state.battle.streak += 1;
  state.battle.victories += 1;
  grantResources(state, territory.reward);
  state.prestige.bestTerritories = Math.max(state.prestige.bestTerritories, state.conquered.length);
}

function applyBattleDefeat(state, preview) {
  state.battle.streak = 0;
  state.battle.losses += 1;
  const lossRate = Math.max(0.04, Math.min(0.14, 0.11 - preview.winChance * 0.05));
  const casualties = {};
  for (const key of Object.keys(state.units)) {
    const loss = Math.min(state.units[key], Math.floor(state.units[key] * lossRate));
    state.units[key] -= loss;
    casualties[key] = loss;
  }
  return casualties;
}

export function enemyScale(state) {
  return 1 + (state.prestige?.count || 0) * ENEMY_SCALE_PER_PRESTIGE;
}

export function enemyPower(state, territory) {
  return Math.round(territory.power * enemyScale(state));
}

export function battlePreview(state, territory = targetTerritory(state)) {
  if (!territory) return null;
  const own = fleetPower(state);
  const enemy = enemyPower(state, territory);
  const streakBoost = 1 + Math.min(0.15, state.battle.streak * 0.025);
  const effective = own * compositionEdge(state, territory) * streakBoost;
  const ratio = effective / enemy;
  const winChance = Math.max(0.12, Math.min(0.92, 0.5 + Math.log(Math.max(0.01, ratio)) * 0.3));
  return { own, enemy, effective: Math.round(effective), winChance };
}

export function resolveBattle(state, territoryId, random = Math.random) {
  const territory = TERRITORIES.find(t => t.id === territoryId);
  if (!territory || state.conquered.includes(territoryId)) return { ok: false, reason: "invalid" };

  const expected = targetTerritory(state);
  if (!expected || expected.id !== territoryId) return { ok: false, reason: "route" };

  const preview = battlePreview(state, territory);
  const roll = random();
  const win = roll < preview.winChance;
  if (win) {
    applyBattleVictory(state, territory);
    return { ok: true, win: true, roll, preview, territory, reward: territory.reward };
  }

  const casualties = applyBattleDefeat(state, preview);
  return { ok: true, win: false, roll, preview, territory, casualties };
}

export function surge(state) {
  const rates = productionPerSecond(state);
  const multiplier = 28 + state.buildings.command * 2;
  const gains = scaleResources(rates, multiplier);
  state.lifetime.totalProduced += grantResources(state, gains);
  state.lifetime.totalTaps += 1;
  return gains;
}

export function missionList(state) {
  return [
    { id: "m-build-12", label: "施設Lv合計12", progress: totalBuildingLevels(state), goal: 12, reward: { credits: 1500, alloy: 450 } },
    { id: "m-fleet-350", label: "艦隊戦力350", progress: fleetPower(state), goal: 350, reward: { credits: 1800, energy: 700 } },
    { id: "m-conquer-3", label: "3星域を制圧", progress: state.conquered.length, goal: 3, reward: { intel: 240, alloy: 1200 } },
    { id: "m-produce-50k", label: "累計50K生産", progress: state.lifetime.totalProduced, goal: 50000, reward: { credits: 5000, intel: 300 } },
  ];
}

export function claimMission(state, missionId) {
  const mission = missionList(state).find(m => m.id === missionId);
  if (!mission || mission.progress < mission.goal || state.missionClaims.includes(missionId)) return { ok: false };
  state.missionClaims.push(missionId);
  grantResources(state, mission.reward);
  return { ok: true, mission };
}

export function checkAchievements(state) {
  const newly = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id) && achievement.test(state)) {
      state.achievements.push(achievement.id);
      state.prestige.stars += achievement.reward;
      newly.push(achievement);
    }
  }
  return newly;
}

export function availablePrestigeStars(state) {
  const territoryScore = state.conquered.length * 2;
  const commandScore = Math.max(0, state.buildings.command - 6);
  const economyScore = Math.floor(Math.log10(Math.max(1, state.lifetime.totalProduced)) - 4);
  return Math.max(0, territoryScore + commandScore + economyScore - state.prestige.stars);
}

export function canPrestige(state) {
  return state.conquered.length >= 5 && state.buildings.command >= 7;
}

export function prestige(state, now = Date.now()) {
  if (!canPrestige(state)) return { ok: false };
  const earned = Math.max(4, availablePrestigeStars(state));
  const keep = {
    count: state.prestige.count + 1,
    stars: state.prestige.stars + earned,
    bestTerritories: Math.max(state.prestige.bestTerritories, state.conquered.length),
  };
  const achievements = [...state.achievements];
  const settings = { ...state.settings };
  const fresh = createInitialState(now);
  Object.assign(state, fresh);
  state.prestige = keep;
  state.achievements = achievements;
  state.settings = settings;
  return { ok: true, earned };
}

function compactDecimals(absValue, unit) {
  if (absValue >= unit * 100) return 0;
  if (absValue >= unit * 10) return 1;
  return 2;
}

export function compactNumber(value) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  for (const [unit, suffix] of COMPACT_NUMBER_UNITS) {
    if (abs >= unit) return `${(value / unit).toFixed(compactDecimals(abs, unit))}${suffix}`;
  }
  return value >= 100
    ? Math.floor(value).toLocaleString("ja-JP")
    : value.toFixed(value >= 10 ? 1 : 2).replace(/\.00$/, "");
}

export function formatCost(cost) {
  return Object.entries(cost).map(([key, value]) => `${RESOURCE_META[key]?.icon || ""}${compactNumber(value)}`).join(" ");
}
