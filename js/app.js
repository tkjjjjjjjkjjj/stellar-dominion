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

function renderResources() {
  const rates = productionPerSecond(state);
  $("#resources").innerHTML = RESOURCE_KEYS.map(key => `
    <div class="resource">
      <span class="resource-top"><b>${RESOURCE_META[key].icon}</b>${RESOURCE_META[key].name}</span>
      <span class="resource-value">${compactNumber(state.resources[key])}</span>
      <span class="resource-rate">+${compactNumber(rates[key])}/秒</span>
    </div>`).join("");
}

function renderBuildings() {
  const rates = productionPerSecond(state);
  const mult = productionMultipliers(state);
  const avg = RESOURCE_KEYS.reduce((sum, key) => sum + mult[key], 0) / RESOURCE_KEYS.length;
  $("#globalMultiplier").textContent = `総合 ×${avg.toFixed(2)}`;
  $("#surgeValue").textContent = `+${30 + state.buildings.command * 2}秒分`;
  $("#buildingList").innerHTML = Object.entries(BUILDINGS).map(([key, def]) => {
    const unlocked = isUnlocked(state, def);
    const level = state.buildings[key] || 0;
    const cost = buildingCost(state, key);
    const prodText = Object.entries(def.production).length
      ? Object.entries(def.production).map(([r]) => `${RESOURCE_META[r].icon} ${compactNumber(rates[r])}/秒`).join(" · ")
      : key === "foundry" ? `全生産 +${level * 18}%` : `帝国補正 +${Math.max(0, level - 1) * 5}%`;
    const lockText = def.unlock ? `司令中枢 Lv${def.unlock.command} で解禁` : "";
    return `<article class="building-card ${unlocked ? "" : "locked"}">
      <div class="building-icon">${def.icon}</div>
      <div class="building-main"><div class="building-title"><b>${def.name}</b><span class="level">Lv.${level}</span></div>
      <p>${unlocked ? def.description : lockText}</p><span class="production">${unlocked ? prodText : "LOCKED"}</span></div>
      <button class="upgrade-btn" data-building="${key}" ${!unlocked || !canAffordCost(cost) ? "disabled" : ""}>強化<small>${formatCost(cost)}</small></button>
    </article>`;
  }).join("");
}

function canAffordCost(cost) { return Object.entries(cost).every(([k, v]) => state.resources[k] >= v); }

function renderFleet() {
  const power = fleetPower(state);
  $("#fleetPower").textContent = `戦力 ${compactNumber(power)}`;
  $("#unitList").innerHTML = Object.entries(UNITS).map(([key, def]) => {
    const unlocked = isUnlocked(state, def);
    const count = state.units[key] || 0;
    const cost = unitCost(state, key, 1);
    return `<article class="unit-card ${unlocked ? "" : "locked"}">
      <div class="unit-icon">${def.icon}</div><h3>${def.name}</h3><span class="unit-role">${unlocked ? `${def.role} / ${UNITS[def.strongAgainst]?.role || ""}に強い` : `司令Lv${def.unlock?.command}`}</span>
      <b class="unit-count">${count}</b><span class="unit-power">+${def.power} 戦力/隻</span>
      <button class="recruit-btn" data-unit="${key}" ${!unlocked || !canAffordCost(cost) ? "disabled" : ""}>+1 建造<small>${formatCost(cost)}</small></button>
    </article>`;
  }).join("");
}

function nodeIcon(t) {
  return ({ mining: "⬢", trade: "◈", energy: "⚡", intel: "◆", fortress: "✦", boss: "✹" })[t.type] || "●";
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
    <button class="prestige-btn" ${ready ? "" : "disabled"}>${ready ? `超越して ★${stars} 獲得` : "王冠ゲートまで制圧 + 司令Lv7で解禁"}</button>`;
}

function renderAll() {
  renderResources(); renderBuildings(); renderFleet(); renderMap(); renderGoals();
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

function handleClick(e) {
  const building = e.target.closest("[data-building]");
  if (building) {
    const key = building.dataset.building;
    const result = upgradeBuilding(state, key);
    if (result.ok) { sound("upgrade"); haptic(); burstAt(building, 14); toast(`${BUILDINGS[key].name} Lv.${state.buildings[key]}！`); renderAll(); }
    return;
  }
  const unit = e.target.closest("[data-unit]");
  if (unit) {
    const key = unit.dataset.unit; const result = recruitUnit(state, key);
    if (result.ok) { sound("upgrade"); haptic(12); burstAt(unit, 9); renderAll(); }
    return;
  }
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
    floatGain(`+${compactNumber(Object.values(gains).reduce((a,b)=>a+b,0))}`); renderResources(); renderBuildings(); renderGoals();
  });
  $("#soundBtn").addEventListener("click", () => { state.settings.sound = !state.settings.sound; $("#soundBtn").textContent = state.settings.sound ? "🔊" : "🔇"; saveState(); });
  $("#helpBtn").addEventListener("click", () => showModal(`<h2>遊び方</h2><p><strong>1. 基地を強化</strong><br>資源は毎秒自動で増加。資源サージも使って序盤を一気に加速。</p><p><strong>2. 艦隊を編成</strong><br>3兵種には得意分野があり、星域ごとに編成比率で実効戦力が上がります。</p><p><strong>3. 星域を順番に征服</strong><br>勝率を見ながら攻めるか、経済に戻って強化するかを判断。連勝中は戦力補正あり。</p><p><strong>4. 超越で周回</strong><br>終盤まで進めると覇王星を獲得してニューゲーム。恒久倍率で次周はさらに高速化。</p><p>進行状況は端末内に自動保存され、最大8時間分のオフライン生産を回収できます。</p>`));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); else { const now=Date.now(); const sec=(now-state.lastSeenAt)/1000; if(sec>3){tick(state,sec);toast(`${formatDuration(sec)}ぶん生産！`);renderAll();} state.lastSeenAt=now; } });
  window.addEventListener("beforeunload", saveState);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("click", e => {
    if (e.target.closest(".prestige-btn") && canPrestige(state)) {
      showModal(`<h2>銀河超越を実行？</h2><p>基地・資源・艦隊・征服状況は初期化されます。実績と覇王星は保持され、次周はより高速に成長します。</p><button id="confirmPrestige" class="prestige-btn">超越を確定</button>`);
      requestAnimationFrame(() => $("#confirmPrestige")?.addEventListener("click", () => { const result=prestige(state); if(result.ok){ closeModal(); burst(innerWidth*.5,innerHeight*.5,80,"purple"); sound("win"); toast(`超越成功！ 覇王星 +${result.earned}`); saveState(); renderAll(); switchPanel("base"); } }));
    }
  });
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
  if (now - lastRender > 420) { renderResources(); renderBuildings(); renderFleet(); renderMap(); renderGoals(); lastRender = now; }
  if (now - lastSave > 5000) { saveState(); lastSave = now; }
  requestAnimationFrame(loop);
}

resizeCanvas(); setupEvents(); renderAll(); drawFx(); requestAnimationFrame(loop);
$("#soundBtn").textContent = state.settings.sound ? "🔊" : "🔇";
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
window.__STELLAR_DOMINION_READY__ = true;
