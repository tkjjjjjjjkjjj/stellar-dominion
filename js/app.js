import {
  RESOURCE_KEYS, RESOURCE_META, BUILDINGS, UNITS, TERRITORIES,
  createInitialState, normalizeState, productionPerSecond, productionMultipliers,
  buildingCost, unitCost, isUnlocked, upgradeBuilding, recruitUnit, fleetPower,
  targetTerritory, battlePreview, resolveBattle, surge, missionList, claimMission,
  checkAchievements, availablePrestigeStars, canPrestige, prestige, tick,
  compactNumber, formatCost
} from "./game-core.js";

const SAVE_KEY = "stellar-dominion-save-v1";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let state = loadState();
let lastFrame = performance.now();
let lastRender = 0;
let lastSave = 0;
let audioCtx = null;
let prestigeInProgress = false;
let resetInProgress = false;
let selectedCommandTarget = { type: "building", key: "command" };

const BUILDING_SCENE_POSITIONS = {
  command: [50, 39],
  extractor: [20, 25],
  reactor: [79, 24],
  market: [18, 66],
  observatory: [80, 65],
  foundry: [50, 78],
};

const UNIT_SCENE_POSITIONS = {
  striker: [36, 55],
  guardian: [50, 59],
  siege: [64, 55],
};

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    const next = normalizeState(raw);
    const elapsed = Math.max(0, (Date.now() - (next.lastSeenAt || Date.now())) / 1000);
    if (elapsed > 5) {
      const capped = Math.min(elapsed, 8 * 3600);
      const result = tick(next, capped);
      queueMicrotask(() => toast(`おかえり！ オフライン${formatDuration(capped)}分を回収 +${compactNumber(result.produced)}`));
    }
    next.lastSeenAt = Date.now();
    return next;
  } catch {
    return createInitialState();
  }
}

function saveState() {
  if (resetInProgress) return;
  state.lastSeenAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function formatDuration(sec) {
  if (sec < 60) return `${Math.floor(sec)}秒`;
  if (sec < 3600) return `${Math.floor(sec / 60)}分`;
  return `${Math.floor(sec / 3600)}時間`;
}

function sound(kind = "tap") {
  if (!state.settings.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    const freq = kind === "win" ? 620 : kind === "fail" ? 120 : kind === "upgrade" ? 420 : 240;
    osc.type = kind === "win" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (kind === "win") osc.frequency.exponentialRampToValueAtTime(980, now + .14);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.08, now + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + .18);
  } catch {}
}

function haptic(ms = 20) { navigator.vibrate?.(ms); }

function toast(message) {
  const layer = $("#toastLayer");
  if (!layer) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  layer.append(el);
  setTimeout(() => el.remove(), 2700);
}

function showModal(html) {
  $("#modalBody").innerHTML = html;
  $("#modal").classList.remove("hidden");
}

function closeModal() { $("#modal").classList.add("hidden"); }

function resourceGlyph(key) {
  const glyphs = {
    credits: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z"/><path d="m9 9 3-2 3 2v6l-3 2-3-2V9Z"/></svg>',
    alloy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l4 8-4 8H7l-4-8 4-8Z"/><path d="M9 8h6l2 4-2 4H9l-2-4 2-4Z"/></svg>',
    energy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/></svg>',
    intel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12 12 3Z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  return glyphs[key] || "";
}

function facilityGlyph(key) {
  const glyphs = {
    command: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 25 9v14l-9 6-9-6V9l9-6Z"/><circle cx="16" cy="16" r="5"/><path d="M16 3v8M7 9l6 4M25 9l-6 4M7 23l6-4M25 23l-6-4M16 29v-8"/></svg>',
    extractor: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23h22l-3 5H8l-3-5Z"/><path d="m9 23 3-12h8l3 12"/><path d="M13 11 16 4l3 7M10 17h12"/></svg>',
    reactor: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l4 4M22 22l4 4M26 6l-4 4M10 22l-4 4"/></svg>',
    market: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9h20l-2 5H8L6 9Z"/><path d="M9 14v12h14V14M12 18h8M16 18v8"/></svg>',
    observatory: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 12c7-8 15-7 19-3-3 5-9 10-18 9"/><path d="m12 18-4 9M18 18l5 9M8 27h18"/><circle cx="22" cy="9" r="2.5"/></svg>',
    foundry: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25h22V12l-6 4v-6l-7 5V9L5 14v11Z"/><path d="M10 20h4M18 20h4M16 3v7"/></svg>',
  };
  return glyphs[key] || "";
}

function renderResources() {
  const rates = productionPerSecond(state);
  $("#resources").innerHTML = RESOURCE_KEYS.map(key => `
    <div class="resource resource-${key}">
      <span class="resource-top"><b class="resource-glyph">${resourceGlyph(key)}</b>${RESOURCE_META[key].name}</span>
      <span class="resource-value">${compactNumber(state.resources[key])}</span>
      <span class="resource-rate">+${compactNumber(rates[key])}/秒</span>
    </div>`).join("");
}

function canAffordCost(cost) { return Object.entries(cost).every(([k, v]) => state.resources[k] >= v); }

function sceneShipClass(key) {
  return `fleet-ship fleet-ship-${key}`;
}

function renderFleetCluster(key, count) {
  const visible = Math.min(count, 6);
  const ships = Array.from({ length: visible }, (_, index) =>
    `<i class="${sceneShipClass(key)} scene-fleet-ship" style="--ship-index:${index}" aria-hidden="true"></i>`
  ).join("");
  const overflow = count > visible ? `<b class="scene-fleet-overflow">+${count - visible}</b>` : "";
  return ships + overflow;
}

function buildingSceneNode(key, def) {
  const unlocked = isUnlocked(state, def);
  const [x, y] = BUILDING_SCENE_POSITIONS[key];
  const level = state.buildings[key] || 0;
  const selected = selectedCommandTarget.type === "building" && selectedCommandTarget.key === key;
  return `<button class="command-node building-node node-${key} ${unlocked ? "" : "locked"} ${selected ? "selected" : ""}" data-scene-building="${key}" style="left:${x}%;top:${y}%" aria-label="${def.name}">
    <span class="command-node-icon">${facilityGlyph(key)}</span>
    <span class="command-node-name">${def.name}</span>
    <span class="command-node-level">${unlocked ? `Lv.${level}` : "LOCK"}</span>
  </button>`;
}

function unitSceneNode(key, def) {
  const unlocked = isUnlocked(state, def);
  const [x, y] = UNIT_SCENE_POSITIONS[key];
  const count = state.units[key] || 0;
  const selected = selectedCommandTarget.type === "unit" && selectedCommandTarget.key === key;
  return `<button class="command-node unit-node node-unit-${key} ${unlocked ? "" : "locked"} ${selected ? "selected" : ""}" data-scene-unit="${key}" style="left:${x}%;top:${y}%" aria-label="${def.name} ${count}隻">
    <span class="scene-fleet">${renderFleetCluster(key, count)}</span>
    <span class="command-node-name">${def.name}</span>
    <span class="command-node-level">${unlocked ? `${count}隻` : "LOCK"}</span>
  </button>`;
}

function renderCommandDetail() {
  const detail = $("#commandDetail");
  if (!detail) return;

  if (selectedCommandTarget.type === "unit") {
    const key = selectedCommandTarget.key;
    const def = UNITS[key];
    const unlocked = isUnlocked(state, def);
    const count = state.units[key] || 0;
    const cost = unitCost(state, key, 1);
    detail.innerHTML = `<div class="detail-copy">
      <span class="eyebrow">ARMADA</span>
      <div class="detail-title"><span class="detail-icon unit-detail-icon"><i class="${sceneShipClass(key)}"></i></span><div><h3>${def.name}</h3><small>${def.role} · 保有 ${count}隻 · 1隻 ${def.power}戦力</small></div></div>
      <p>${unlocked ? `${UNITS[def.strongAgainst]?.role || ""}タイプに強い艦種。建造するほど基地上の艦影も増えます。` : `司令中枢 Lv${def.unlock?.command} で解禁`}</p>
    </div>
    <button class="detail-action recruit-btn" data-recruit-unit="${key}" ${!unlocked || !canAffordCost(cost) ? "disabled" : ""}>+1 建造<small>${formatCost(cost)}</small></button>`;
    return;
  }

  const key = selectedCommandTarget.key;
  const def = BUILDINGS[key];
  const unlocked = isUnlocked(state, def);
  const level = state.buildings[key] || 0;
  const cost = buildingCost(state, key);
  const rates = productionPerSecond(state);
  const effect = Object.entries(def.production).length
    ? Object.keys(def.production).map(resource => `${RESOURCE_META[resource].icon} ${compactNumber(rates[resource])}/秒`).join(" · ")
    : key === "foundry" ? `全生産 +${level * 18}% / 艦隊補正 +${level * 10}%`
    : `帝国補正 +${Math.max(0, level - 1) * 5}%`;

  detail.innerHTML = `<div class="detail-copy">
    <span class="eyebrow">FACILITY</span>
    <div class="detail-title"><span class="detail-icon facility-detail-icon">${facilityGlyph(key)}</span><div><h3>${def.name}</h3><small>Lv.${level} · ${unlocked ? effect : `司令中枢 Lv${def.unlock?.command} で解禁`}</small></div></div>
    <p>${def.description}</p>
  </div>
  <button class="detail-action upgrade-btn" data-upgrade-building="${key}" ${!unlocked || !canAffordCost(cost) ? "disabled" : ""}>強化<small>${formatCost(cost)}</small></button>`;
}

function renderCommandScene() {
  const mult = productionMultipliers(state);
  const avg = RESOURCE_KEYS.reduce((sum, key) => sum + mult[key], 0) / RESOURCE_KEYS.length;
  $("#globalMultiplier").textContent = `総合 ×${avg.toFixed(2)}`;
  $("#fleetPower").textContent = `戦力 ${compactNumber(fleetPower(state))}`;
  $("#surgeValue").textContent = `+${30 + state.buildings.command * 2}秒分`;

  const buildingNodes = Object.entries(BUILDINGS).map(([key, def]) => buildingSceneNode(key, def)).join("");
  const unitNodes = Object.entries(UNITS).map(([key, def]) => unitSceneNode(key, def)).join("");
  $("#commandScene").innerHTML = buildingNodes + unitNodes;
  renderCommandDetail();
}
function nodeIcon(t) {
  const icons = {
    mining: '<svg viewBox="0 0 24 24"><path d="M7 5h10l4 7-4 7H7l-4-7 4-7Z"/></svg>',
    trade: '<svg viewBox="0 0 24 24"><path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z"/><path d="M8 12h8M12 8v8"/></svg>',
    energy: '<svg viewBox="0 0 24 24"><path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/></svg>',
    intel: '<svg viewBox="0 0 24 24"><path d="M12 3 20 12 12 21 4 12 12 3Z"/><circle cx="12" cy="12" r="3"/></svg>',
    fortress: '<svg viewBox="0 0 24 24"><path d="M5 20V8l3 2 4-6 4 6 3-2v12H5Z"/><path d="M9 20v-5h6v5"/></svg>',
    boss: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></svg>',
  };
  return icons[t.type] || "";
}

function renderMap() {
  const target = targetTerritory(state);
  $("#streakChip").textContent = `連勝 ${state.battle.streak}`;
  $("#territoryNodes").innerHTML = TERRITORIES.map((t, i) => {
    const done = state.conquered.includes(t.id);
    const current = target?.id === t.id;
    const locked = !done && !current;
    return `<button class="territory-node ${done ? "done" : current ? "current" : "locked"} ${t.type === "boss" ? "boss" : ""}" style="left:${t.x}%;top:${t.y}%" aria-label="${t.name}" ${locked ? "disabled" : ""}><span>${done ? "✓" : nodeIcon(t)}</span><small>${t.name}</small></button>`;
  }).join("");
  if (!target) {
    $("#battleCard").innerHTML = `<div class="battle-top"><div><h3>全星域制圧！</h3><p>超越して恒久強化し、新たな銀河へ。</p></div><span class="odds">100%</span></div>`;
    $("#mapBadge").classList.add("hidden");
    return;
  }
  const preview = battlePreview(state, target);
  const pct = Math.round(preview.winChance * 100);
  const ratio = Math.min(100, preview.effective / target.power * 55);
  $("#battleCard").innerHTML = `<div class="battle-top"><div><h3>${target.name}</h3><p>${target.enemy} · 推奨戦力 ${target.power}</p></div><span class="odds">${pct}%</span></div>
    <div class="power-bar"><i style="width:${ratio}%"></i></div><div class="battle-meta"><span>実効戦力 ${preview.effective}</span><span>敵 ${target.power}</span></div>
    <button class="battle-btn" data-battle="${target.id}">⚔ 作戦開始</button>`;
  $("#mapBadge").classList.toggle("hidden", pct < 58);
}

function renderGoals() {
  const missions = missionList(state);
  const claimable = missions.some(m => m.progress >= m.goal && !state.missionClaims.includes(m.id));
  $("#goalBadge").classList.toggle("hidden", !claimable);
  $("#starsChip").textContent = `★ ${state.prestige.stars}`;
  $("#missionList").innerHTML = missions.map(m => {
    const claimed = state.missionClaims.includes(m.id);
    const done = m.progress >= m.goal;
    const p = Math.min(100, m.progress / m.goal * 100);
    return `<article class="mission"><div><b>${m.label}</b><span class="mission-reward">報酬 ${formatCost(m.reward)}</span><div class="progress-track"><i style="width:${p}%"></i></div></div>
      <button class="claim-btn" data-mission="${m.id}" ${!done || claimed ? "disabled" : ""}>${claimed ? "受取済" : done ? "受取" : `${Math.floor(p)}%`}</button></article>`;
  }).join("");
  const ready = canPrestige(state);
  const stars = Math.max(4, availablePrestigeStars(state));
  $("#prestigeCard").innerHTML = `<h3>銀河超越</h3><p>基地・艦隊・征服状況をリセットし、恒久ボーナスの<strong>覇王星</strong>を獲得。星1個ごとに資源生産+8%、艦隊戦力+3.5%。</p>
    <div class="prestige-stats"><div class="prestige-stat"><b>${state.prestige.count}</b><small>超越回数</small></div><div class="prestige-stat"><b>${state.prestige.bestTerritories}/6</b><small>最高制圧</small></div><div class="prestige-stat"><b>+${stars}</b><small>次回獲得</small></div></div>
    <button class="prestige-btn" data-prestige-open ${ready ? "" : "disabled"}>${ready ? `超越して ★${stars} 獲得` : "王冠ゲートまで制圧 + 司令Lv7で解禁"}</button>`;
}

function renderAll() {
  renderResources(); renderCommandScene(); renderMap(); renderGoals();
  const unlocks = checkAchievements(state);
  if (unlocks.length) {
    for (const a of unlocks) toast(`実績「${a.name}」解除！ ★${a.reward}`);
    burst(window.innerWidth * .5, window.innerHeight * .35, 35, "gold");
    sound("win");
  }
}

function floatGain(text) {
  const layer = $("#floatingLayer");
  const el = document.createElement("span");
  el.className = "float-gain"; el.textContent = text;
  el.style.left = `${18 + Math.random() * 24}%`;
  layer.append(el); setTimeout(() => el.remove(), 950);
}

function switchPanel(name) {
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.panel === name));
  window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? "auto" : "smooth" });
  sound("tap");
}

function openResetModal() {
  showModal(`<h2>最初からやり直す？</h2><p>このゲームのセーブデータだけを削除し、資源・施設・艦隊・征服・実績・超越回数をすべて初期状態に戻します。この操作は元に戻せません。</p><button class="danger-btn" data-reset-confirm>セーブデータを削除して最初から</button>`);
}

function confirmReset() {
  if (resetInProgress) return;
  resetInProgress = true;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function openPrestigeModal() {
  if (prestigeInProgress || !canPrestige(state)) return;
  showModal(`<h2>銀河超越を実行？</h2><p>基地・資源・艦隊・征服状況は初期化されます。実績と覇王星は保持され、次周はより高速に成長します。</p><button id="confirmPrestige" class="prestige-btn" data-prestige-confirm>超越を確定</button>`);
}

function confirmPrestige() {
  if (prestigeInProgress || !canPrestige(state)) return;

  prestigeInProgress = true;
  const confirmButton = $("#confirmPrestige");
  if (confirmButton) confirmButton.disabled = true;

  const result = prestige(state);
  if (!result.ok) {
    prestigeInProgress = false;
    return;
  }

  closeModal();
  burst(innerWidth * .5, innerHeight * .5, 80, "purple");
  sound("win");
  toast(`超越成功！ 覇王星 +${result.earned}`);
  saveState();
  renderAll();
  switchPanel("base");
  prestigeInProgress = false;
}
function handleClick(e) {
  const sceneBuilding = e.target.closest("[data-scene-building]");
  if (sceneBuilding) {
    selectedCommandTarget = { type: "building", key: sceneBuilding.dataset.sceneBuilding };
    sound("tap"); haptic(8); renderCommandScene();
    return;
  }

  const sceneUnit = e.target.closest("[data-scene-unit]");
  if (sceneUnit) {
    selectedCommandTarget = { type: "unit", key: sceneUnit.dataset.sceneUnit };
    sound("tap"); haptic(8); renderCommandScene();
    return;
  }

  const upgrade = e.target.closest("[data-upgrade-building]");
  if (upgrade) {
    const key = upgrade.dataset.upgradeBuilding;
    const result = upgradeBuilding(state, key);
    if (result.ok) { sound("upgrade"); haptic(); burstAt(upgrade, 14); toast(`${BUILDINGS[key].name} Lv.${state.buildings[key]}！`); renderAll(); saveState(); }
    return;
  }

  const recruit = e.target.closest("[data-recruit-unit]");
  if (recruit) {
    const key = recruit.dataset.recruitUnit;
    const result = recruitUnit(state, key);
    if (result.ok) { sound("upgrade"); haptic(12); burstAt(recruit, 10); renderAll(); saveState(); }
    return;
  }

  const resetConfirm = e.target.closest("[data-reset-confirm]");
  if (resetConfirm) { confirmReset(); return; }

  const resetOpen = e.target.closest("[data-reset-open]");
  if (resetOpen) { openResetModal(); return; }

  const prestigeConfirm = e.target.closest("[data-prestige-confirm]");
  if (prestigeConfirm) { confirmPrestige(); return; }

  const prestigeOpen = e.target.closest("[data-prestige-open]");
  if (prestigeOpen) { openPrestigeModal(); return; }

  const mission = e.target.closest("[data-mission]");
  if (mission) {
    const result = claimMission(state, mission.dataset.mission);
    if (result.ok) { sound("win"); burstAt(mission, 22, "gold"); toast(`ミッション報酬 ${formatCost(result.mission.reward)}`); renderAll(); }
    return;
  }
  const battle = e.target.closest("[data-battle]");
  if (battle) { playBattle(battle.dataset.battle); return; }
  const nav = e.target.closest("[data-panel]"); if (nav) switchPanel(nav.dataset.panel);
}

function playBattle(id) {
  const btn = $(`[data-battle="${id}"]`); if (btn) btn.disabled = true;
  document.body.classList.add("battle-flash"); haptic([30, 45, 40]); sound("upgrade");
  setTimeout(() => {
    const result = resolveBattle(state, id);
    document.body.classList.remove("battle-flash");
    if (!result.ok) return;
    if (result.win) {
      sound("win"); haptic([40, 30, 70]); burst(window.innerWidth * .5, window.innerHeight * .45, 55, "gold");
      toast(`制圧成功！ ${result.territory.name} + ${formatCost(result.reward)}`);
    } else {
      sound("fail"); haptic(100); toast(`撤退… 戦力を増強して再挑戦！`);
    }
    renderAll(); saveState();
  }, 430);
}

function setupEvents() {
  document.addEventListener("click", handleClick);
  $("#surgeBtn").addEventListener("click", e => {
    const gains = surge(state); sound("upgrade"); haptic(18); burstAt(e.currentTarget, 18);
    floatGain(`+${compactNumber(Object.values(gains).reduce((a,b)=>a+b,0))}`); renderResources(); renderCommandScene(); renderGoals();
  });
  $("#soundBtn").addEventListener("click", () => {
    state.settings.sound = !state.settings.sound;
    $("#soundBtn").dataset.muted = state.settings.sound ? "false" : "true";
    $("#soundBtn").setAttribute("aria-label", state.settings.sound ? "サウンドをオフ" : "サウンドをオン");
    saveState();
  });
  $("#helpBtn").addEventListener("click", () => showModal(`<h2>遊び方</h2><p><strong>1. 司令基地を操作</strong><br>基地画面の施設や艦隊を直接タップすると、下に強化・建造パネルが表示されます。資源サージで序盤を加速できます。</p><p><strong>2. 艦隊を増強</strong><br>3兵種には得意分野があり、建造するほど基地上の艦影も増えます。</p><p><strong>3. 星域を順番に征服</strong><br>後半ほど敵戦力が大きく伸びます。勝率を見ながら艦隊を増強して進軍しましょう。</p><p><strong>4. 超越で周回</strong><br>終盤まで進めると覇王星を獲得してニューゲーム。恒久倍率で次周はさらに高速化。</p><p>進行状況は端末内に自動保存され、最大8時間分のオフライン生産を回収できます。</p><hr class="modal-divider"><h3>データ管理</h3><p>完全に最初から遊び直す場合は、下のボタンからこのゲームのセーブだけを削除できます。</p><button class="danger-btn" data-reset-open>最初からやり直す</button>`));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); else { const now=Date.now(); const sec=(now-state.lastSeenAt)/1000; if(sec>3){tick(state,sec);toast(`${formatDuration(sec)}ぶん生産！`);renderAll();} state.lastSeenAt=now; } });
  window.addEventListener("beforeunload", saveState);
  window.addEventListener("resize", resizeCanvas);
}

const canvas = $("#fxCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
function resizeCanvas(){const dpr=Math.min(2,devicePixelRatio||1);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0)}
function burstAt(el,n=12,theme="cyan"){const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,n,theme)}
function burst(x,y,n=20,theme="cyan"){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || state.settings.reducedMotion) return;
  const palette=theme==="gold"?["#ffd85a","#fff4b4","#ff8b4d"]:theme==="purple"?["#bd7bff","#6f8cff","#ffffff"]:["#4de6ff","#5affb3","#ffffff"];
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*7;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:1,size:2+Math.random()*3,color:palette[i%palette.length]})}
}
function drawFx(){ctx.clearRect(0,0,innerWidth,innerHeight);particles=particles.filter(p=>p.life>0.02);for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.14;p.vx*=.985;p.life*=.955;ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;requestAnimationFrame(drawFx)}

function loop(now) {
  const dt = Math.min(.25, (now - lastFrame) / 1000); lastFrame = now;
  tick(state, dt);
  if (now - lastRender > 420) { renderResources(); renderCommandScene(); renderMap(); renderGoals(); lastRender = now; }
  if (now - lastSave > 5000) { saveState(); lastSave = now; }
  requestAnimationFrame(loop);
}

resizeCanvas(); setupEvents(); renderAll(); drawFx(); requestAnimationFrame(loop);
$("#soundBtn").dataset.muted = state.settings.sound ? "false" : "true";
$("#soundBtn").setAttribute("aria-label", state.settings.sound ? "サウンドをオフ" : "サウンドをオン");
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
window.__STELLAR_DOMINION_READY__ = true;
