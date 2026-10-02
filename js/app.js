import {
  RESOURCE_KEYS, RESOURCE_META, BUILDINGS, UNITS, TERRITORIES,
  createInitialState, normalizeState,
  isUnlocked, upgradeBuilding, recruitUnit,
  targetTerritory, resolveBattle, enemyPower, enemyScale, ENEMY_SCALE_PER_PRESTIGE, surge, missionList, claimMission,
  checkAchievements, availablePrestigeStars, canPrestige, prestige, tick,
  compactNumber
} from "./game-core.js";
import { injectDefs, facilityArt, facilityTier, shipArt, planetArt, resourceIcon, starIcon, icon, brandMark } from "./art.js";
import { sfx, unlockAudio, setSoundEnabled } from "./audio.js";
import { initFx, burst, burstAt, flyResources } from "./fx.js";
import { createViewCache } from "./view-cache.js";

const SAVE_KEY = "stellar-dominion-save-v1";
const APP_VERSION = "1.2.2";
const OFFLINE_CAP = 8 * 3600;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const h = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const FACILITY_POS = {
  extractor: [19, 43], reactor: [81, 43], command: [50, 54],
  market: [19, 73], observatory: [80, 72], foundry: [50, 89],
};
const FLEET_POS = { striker: 20, guardian: 50, siege: 80 };
const FORMATION = [[0, 0], [-1, -1], [-1, 1], [-2, -2], [-2, 2], [-3, 0]];
const TIER_NAME = ["BLUEPRINT", "TIER I", "TIER II", "TIER III"];
const MISSION_ICON = { "m-build-12": "build", "m-fleet-350": "fleet", "m-conquer-3": "flag", "m-produce-50k": "trend" };
const BONUS_LABEL = { credits: "クレジット", alloy: "合金", energy: "エネルギー", intel: "情報", all: "全資源" };

let state = null;
let welcome = null;
let selected = { type: "building", key: "command" };
let activePanel = "base";
let detailKey = "";
let mapKey = "";
let battleKey = "";
let busy = false;
let covered = false;
let suppressClick = false;
const hold = Object.fromEntries(RESOURCE_KEYS.map(k => [k, 0]));
const shown = Object.fromEntries(RESOURCE_KEYS.map(k => [k, 0]));
const fresh = new Set();
const refs = { res: {}, facilities: {}, fleets: {}, missions: {} };
const viewCache = createViewCache();

// ---------------------------------------------------------------- state
function loadState() {
  let next;
  try { next = normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { next = createInitialState(); }
  const elapsed = Math.max(0, (Date.now() - (next.lastSeenAt || Date.now())) / 1000);
  if (elapsed > 5) welcome = collectOffline(next, Math.min(elapsed, OFFLINE_CAP));
  next.lastSeenAt = Date.now();
  return next;
}

function hasSave() {
  try { return localStorage.getItem(SAVE_KEY) !== null; } catch { return false; }
}

function collectOffline(target, seconds) {
  const before = { ...target.resources };
  const result = tick(target, seconds);
  const gains = Object.fromEntries(RESOURCE_KEYS.map(k => [k, target.resources[k] - before[k]]));
  return { seconds, gains, total: result.produced };
}

let resetting = false;
let started = false;
function saveState() {
  // nothing is written until the player starts, so a first-time visitor who leaves the prologue sees it again
  if (resetting || !started) return;
  state.lastSeenAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

const reducedMotion = () => state?.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- format helpers
function formatDuration(sec) {
  if (sec < 60) return `${Math.floor(sec)}秒`;
  if (sec < 3600) return `${Math.floor(sec / 60)}分`;
  const hrs = Math.floor(sec / 3600), min = Math.floor((sec % 3600) / 60);
  return min ? `${hrs}時間${min}分` : `${hrs}時間`;
}

function formatClock(sec) {
  if (!Number.isFinite(sec)) return "--:--";
  const s = Math.ceil(sec);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return hh ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
}

function etaFor(cost) {
  const { rates } = viewCache.production(state);
  let worst = 0;
  for (const [k, v] of Object.entries(cost)) {
    const lack = v - state.resources[k];
    if (lack <= 0) continue;
    if (rates[k] <= 0) return Infinity;
    worst = Math.max(worst, lack / rates[k]);
  }
  return worst;
}

const affordable = cost => Object.entries(cost).every(([k, v]) => state.resources[k] >= v);

// Whole numbers (fleet power, enemy power, counts) should never render as "40.0".
const fmtInt = v => (v < 1000 ? String(Math.floor(v)) : compactNumber(v));

function costChips(cost) {
  return Object.entries(cost).map(([k, v]) => `<span class="cost" data-cost="${k}">${resourceIcon(k)}<b>${fmtInt(v)}</b></span>`).join("");
}

function rewardChips(reward) {
  return Object.entries(reward).map(([k, v]) => `<span class="reward">${resourceIcon(k)}<b>${fmtInt(v)}</b></span>`).join("");
}

function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }
function setHTML(el, html) { if (el && el.dataset.sig !== html) { el.innerHTML = html; el.dataset.sig = html; } }
function setClass(el, cls, on) { if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }

function haptic(pattern = 12) { try { navigator.vibrate?.(pattern); } catch {} }

// ---------------------------------------------------------------- HUD
function buildHud() {
  $("#brandMark").innerHTML = `${brandMark()}<i id="cmdLevel" class="cmdr-lv">1</i>`;
  $(".brand-text").innerHTML = `<b>司令官</b><span class="cmdr-stats"><span>${icon("power")}<em id="powerVal">0</em></span><span>${icon("trend")}<em id="multVal">×1.00</em></span></span>`;
  $("#starIcon").innerHTML = starIcon();
  $("#soundBtn").innerHTML = icon("sound");
  $("#helpBtn").innerHTML = icon("help");
  $("#modalClose").innerHTML = icon("close");
  $$(".tab-ico").forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  $("#resources").innerHTML = RESOURCE_KEYS.map(k => `
    <div class="res res-${k}" data-res="${k}">
      <span class="res-ico">${resourceIcon(k)}</span>
      <span class="res-txt"><b class="res-val">0</b><small class="res-rate">+0/秒</small></span>
    </div>`).join("");
  for (const k of RESOURCE_KEYS) {
    const el = $(`[data-res="${k}"]`);
    refs.res[k] = { el, val: $(".res-val", el), rate: $(".res-rate", el) };
    shown[k] = Math.max(0, state.resources[k] - hold[k]);
  }
  refs.cmdLevel = $("#cmdLevel");
  refs.powerVal = $("#powerVal");
  refs.multVal = $("#multVal");
  refs.starCount = $("#starCount");
  syncSoundButton();
}

function updateHud(dt) {
  const k = 1 - Math.exp(-dt * 9);
  for (const key of RESOURCE_KEYS) {
    const target = Math.max(0, state.resources[key] - hold[key]);
    const diff = target - shown[key];
    const big = Math.abs(diff) > Math.max(1, Math.abs(target) * .004);
    shown[key] = big ? shown[key] + diff * k : target;
    setText(refs.res[key].val, compactNumber(shown[key]));
  }
}

function updateHudSlow() {
  const { rates, multipliers: mult } = viewCache.production(state);
  for (const key of RESOURCE_KEYS) setText(refs.res[key].rate, `+${compactNumber(rates[key])}/秒`);
  const avg = RESOURCE_KEYS.reduce((sum, key) => sum + mult[key], 0) / RESOURCE_KEYS.length;
  setText(refs.multVal, `×${avg.toFixed(2)}`);
  setText(refs.powerVal, fmtInt(viewCache.power(state)));
  setText(refs.cmdLevel, String(state.buildings.command));
  setText(refs.starCount, String(state.prestige.stars));
}

function bump(el) {
  if (!el || reducedMotion()) return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)", filter: "brightness(1.5)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
}

function flyGains(from, gains, { sound = "coin" } = {}) {
  const clean = Object.fromEntries(Object.entries(gains).filter(([k, v]) => RESOURCE_KEYS.includes(k) && v > 0));
  for (const [k, v] of Object.entries(clean)) hold[k] += v;
  let played = false;
  flyResources(from, clean, k => refs.res[k]?.el, k => {
    hold[k] = Math.max(0, hold[k] - clean[k]);
    bump(refs.res[k].el);
    if (!played) { played = true; sfx(sound); }
  });
}

// ---------------------------------------------------------------- base scene
function buildBaseScene() {
  const conduits = $(".conduits");
  conduits.innerHTML = Object.entries(FACILITY_POS).filter(([k]) => k !== "command")
    .map(([k, [x, y]]) => `<path data-conduit="${k}" d="M${FACILITY_POS.command[0]} ${FACILITY_POS.command[1]} L${x} ${y}"/>`).join("");

  $("#facilityLayer").innerHTML = Object.entries(BUILDINGS).map(([key, def]) => {
    const [x, y] = FACILITY_POS[key];
    return `<button class="facility ${key === "command" ? "facility-main" : ""}" data-facility="${key}" style="left:${x}%;top:${y}%" aria-label="${def.name}">
      <span class="facility-sel" aria-hidden="true"></span>
      <span class="facility-art-wrap"></span>
      <span class="up-badge" aria-hidden="true">${icon("up")}</span>
      <span class="facility-label"><b>${def.name}</b><em class="facility-lv"></em></span>
    </button>`;
  }).join("");

  $("#fleetLayer").innerHTML = Object.entries(UNITS).map(([key, def]) => `
    <button class="fleet-group fleet-${key}" data-unit="${key}" style="left:${FLEET_POS[key]}%" aria-label="${def.name}">
      <span class="formation"></span>
      <span class="fleet-label"><b>${def.name}</b><em class="fleet-count"></em></span>
    </button>`).join("");

  for (const key of Object.keys(BUILDINGS)) {
    const el = $(`[data-facility="${key}"]`);
    refs.facilities[key] = { el, art: $(".facility-art-wrap", el), lv: $(".facility-lv", el), conduit: $(`[data-conduit="${key}"]`), sig: "" };
  }
  for (const key of Object.keys(UNITS)) {
    const el = $(`[data-unit="${key}"]`);
    refs.fleets[key] = { el, formation: $(".formation", el), count: $(".fleet-count", el), sig: "" };
  }
  $("#surgeBtn .surge-core").innerHTML = icon("bolt");
}

function updateBaseScene() {
  for (const [key, def] of Object.entries(BUILDINGS)) {
    const r = refs.facilities[key];
    const unlocked = isUnlocked(state, def);
    const level = state.buildings[key] || 0;
    const sig = `${unlocked}:${facilityTier(level)}`;
    if (r.sig !== sig) { r.art.innerHTML = facilityArt(key, level, !unlocked); r.sig = sig; }
    setHTML(r.lv, unlocked ? (level ? `Lv.${level}` : "未建設") : `${icon("lock")}Lv.${def.unlock.command}`);
    setClass(r.el, "locked", !unlocked);
    setClass(r.el, "selected", selected.type === "building" && selected.key === key);
    setClass(r.el, "can-up", unlocked && affordable(viewCache.buildingCost(state, key)));
    setClass(r.el, "fresh", fresh.has(key));
    if (r.conduit) setClass(r.conduit, "live", level > 0);
  }
  for (const [key, def] of Object.entries(UNITS)) {
    const r = refs.fleets[key];
    const unlocked = isUnlocked(state, def);
    const count = state.units[key] || 0;
    const visible = Math.min(count, FORMATION.length);
    const sig = `${unlocked}:${visible}`;
    if (r.sig !== sig) {
      r.formation.innerHTML = !unlocked
        ? `<span class="fleet-lock">${icon("lock")}</span>`
        : visible === 0
          ? `<span class="ship-slot ghost" style="--dx:0;--dy:0">${shipArt(key)}</span>`
          : FORMATION.slice(0, visible).map(([dx, dy], i) => `<span class="ship-slot" style="--dx:${dx - Math.min(...FORMATION.slice(0, visible).map(f => f[0])) / 2};--dy:${dy};--i:${i}">${shipArt(key)}</span>`).join("");
      r.sig = sig;
    }
    setHTML(r.count, unlocked ? `×${count}` : `${icon("lock")}Lv.${def.unlock.command}`);
    setClass(r.el, "locked", !unlocked);
    setClass(r.el, "selected", selected.type === "unit" && selected.key === key);
    setClass(r.el, "can-up", unlocked && affordable(viewCache.unitCost(state, key)));
    setClass(r.el, "fresh", fresh.has(key));
  }
  setText($("#surgeValue"), `+${28 + state.buildings.command * 2}秒分`);
}

// ---------------------------------------------------------------- detail sheet
function nextUnlockText(level) {
  const items = [...Object.values(BUILDINGS), ...Object.values(UNITS)].filter(d => d.unlock?.command === level + 1).map(d => d.name);
  return items.length ? `次のLvで ${items.join("・")} 解禁` : "";
}

function facilityEffect(key, level, { now, next }) {
  const def = BUILDINGS[key];
  const produced = Object.keys(def.production);
  if (produced.length) {
    return produced.map(r => `${resourceIcon(r)}<span>${compactNumber(now[r])}/秒</span><i>${icon("up")}</i><em>${compactNumber(next[r])}/秒</em>`).join("");
  }
  if (key === "foundry") return `<span>全生産 +${level * 18}%</span><i>${icon("up")}</i><em>+${(level + 1) * 18}%</em>`;
  return `<span>帝国補正 +${Math.max(0, level - 1) * 5}%</span><i>${icon("up")}</i><em>+${level * 5}%</em>`;
}

function renderDetail() {
  const sheet = $("#commandDetail");
  const isUnit = selected.type === "unit";
  const def = isUnit ? UNITS[selected.key] : BUILDINGS[selected.key];
  const unlocked = isUnlocked(state, def);
  const key = `${selected.type}:${selected.key}:${unlocked}`;
  if (key !== detailKey) {
    detailKey = key;
    const art = isUnit ? `<span class="detail-ship">${shipArt(selected.key)}</span>` : `<span class="detail-facility"></span>`;
    const desc = isUnit
      ? `<span class="tag tag-${selected.key}">${def.role}</span><span class="tag">${UNITS[def.strongAgainst].name}に強い</span><span class="tag">1隻 ${def.power}戦力</span>`
      : `<span class="detail-desc-text">${h(def.description)}</span>`;
    sheet.innerHTML = `
      <div class="detail-head">
        <div class="detail-art">${art}</div>
        <div class="detail-info">
          <span class="kicker" data-d="kicker"></span>
          <h3><span>${def.name}</span><em data-d="level"></em></h3>
          <div class="detail-desc">${desc}</div>
          <div class="detail-effect" data-d="effect"></div>
        </div>
      </div>
      <div class="detail-action">
        <div class="cost-list" data-d="costs"></div>
        <button class="btn action-btn" data-action="${isUnit ? "recruit" : "upgrade"}" data-key="${selected.key}">
          <span class="btn-main" data-d="label"></span><small data-d="sub"></small>
        </button>
      </div>`;
    sheet.dataset.kind = selected.type;
    if (!reducedMotion()) sheet.animate([{ opacity: .4, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" });
    refs.detail = Object.fromEntries($$("[data-d]", sheet).map(el => [el.dataset.d, el]));
    refs.detail.btn = $(".action-btn", sheet);
    refs.detail.artHolder = $(".detail-facility", sheet);
    refs.detail.artSig = "";
    refs.detail.cost = null;
    refs.detail.effectSource = null;
  }
  updateDetail();
}

function updateDetail() {
  const d = refs.detail;
  if (!d) return;
  const isUnit = selected.type === "unit";
  const key = selected.key;
  const def = isUnit ? UNITS[key] : BUILDINGS[key];
  const unlocked = isUnlocked(state, def);
  const cost = isUnit ? viewCache.unitCost(state, key) : viewCache.buildingCost(state, key);
  const can = unlocked && affordable(cost);

  if (isUnit) {
    const count = state.units[key] || 0;
    setText(d.kicker, `FLEET · ${def.role}`);
    setText(d.level, `×${count}`);
    const effect = viewCache.unitEffect(state, key);
    if (d.effectSource !== effect) {
      setHTML(d.effect, `${icon("power")}<span>総戦力 ${fmtInt(effect.own)}</span><i>${icon("up")}</i><em>${fmtInt(effect.next)}</em>`);
      d.effectSource = effect;
    }
  } else {
    const level = state.buildings[key] || 0;
    const tier = facilityTier(level);
    setText(d.kicker, `FACILITY · ${TIER_NAME[tier]}`);
    setText(d.level, `Lv.${level}`);
    const artSig = `${unlocked}:${tier}`;
    if (d.artSig !== artSig) { d.artHolder.innerHTML = facilityArt(key, level, !unlocked); d.artSig = artSig; }
    const effect = unlocked ? viewCache.facilityEffect(state, key) : false;
    if (d.effectSource !== effect) {
      const hint = key === "command" ? nextUnlockText(level) : "";
      const html = unlocked ? facilityEffect(key, level, effect) + (hint ? `<b class="unlock-hint">${hint}</b>` : "") : `${icon("lock")}<span>司令中枢 Lv.${def.unlock.command} で解禁</span>`;
      setHTML(d.effect, html);
      d.effectSource = effect;
    }
  }

  if (d.cost !== cost) { d.costs.innerHTML = costChips(cost); d.cost = cost; }
  for (const chip of d.costs.children) setClass(chip, "lack", state.resources[chip.dataset.cost] < cost[chip.dataset.cost]);

  const level = state.buildings[key] || 0;
  let label, sub;
  if (!unlocked) { label = "ロック中"; sub = `司令Lv.${def.unlock.command}`; }
  else if (isUnit) { label = "建造"; sub = can ? "長押しで連続" : `あと ${formatClock(etaFor(cost))}`; }
  else { label = level ? "強化" : "建設"; sub = can ? `Lv.${level} → ${level + 1}` : `あと ${formatClock(etaFor(cost))}`; }
  setText(d.label, label);
  setText(d.sub, sub);
  setClass(d.btn, "btn-green", can);
  setClass(d.btn, "btn-wait", unlocked && !can);
  setClass(d.btn, "btn-locked", !unlocked);
  const disabled = String(!can);
  if (d.btn.getAttribute("aria-disabled") !== disabled) d.btn.setAttribute("aria-disabled", disabled);
}

// ---------------------------------------------------------------- map
const mapPos = t => [12 + (t.x - 18) * (76 / 73), 17 + (t.y - 27) * (62 / 45)];
const HOME = [6, 94];

function renderMap() {
  const target = targetTerritory(state);
  const key = `${state.conquered.join(",")}|${target?.id || ""}|${state.prestige.count}`;
  if (key !== mapKey) {
    mapKey = key;
    const points = [HOME, ...TERRITORIES.map(mapPos)];
    const doneCount = state.conquered.length;
    let route = "";
    for (let i = 1; i < points.length; i += 1) {
      const [x1, y1] = points[i - 1], [x2, y2] = points[i];
      const cls = i <= doneCount ? "done" : i === doneCount + 1 ? "next" : "todo";
      route += `<path class="${cls}" d="M${x1} ${y1} L${x2} ${y2}"/>`;
    }
    $("#routeSvg").innerHTML = route;
    $("#territoryLayer").innerHTML = `<div class="home-node" style="left:${HOME[0]}%;top:${HOME[1]}%"><span>${brandMark()}</span></div>` + TERRITORIES.map((t, i) => {
      const done = state.conquered.includes(t.id);
      const current = target?.id === t.id;
      const status = done ? "done" : current ? "current" : "locked";
      const [x, y] = mapPos(t);
      const edge = x > 80 ? "edge-r" : x < 18 ? "edge-l" : "";
      return `<button class="planet-node ${status} ${edge} ${t.type === "boss" ? "boss" : ""}" data-territory="${t.id}" style="left:${x}%;top:${y}%" aria-label="${t.name}">
        <span class="planet-wrap">
          ${current ? `<svg class="reticle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><path d="M50 0v10M50 90v10M0 50h10M90 50h10"/></svg>` : ""}
          ${planetArt(t.type)}
          ${done ? `<span class="planet-flag">${icon("flag")}</span>` : ""}
          ${status === "locked" ? `<span class="planet-lock">${icon("lock")}</span>` : ""}
        </span>
        <span class="planet-label"><b>${t.name}</b><small>${done ? "制圧済" : `敵戦力 ${fmtInt(enemyPower(state, t))}`}</small></span>
        <span class="planet-index">${i + 1}</span>
      </button>`;
    }).join("");
  }
  setText($("#stageChip"), `STAGE ${Math.min(TERRITORIES.length, state.conquered.length + 1)}/${TERRITORIES.length}`);
  setHTML($("#streakChip"), `${icon("trend")}連勝 <b>${state.battle.streak}</b>`);
  const threat = Math.round((enemyScale(state) - 1) * 100);
  setClass($("#threatChip"), "hidden", threat <= 0);
  setHTML($("#threatChip"), `${icon("skull")}敵戦力 <b>+${threat}%</b>`);
  renderBattleCard(target);
}

function bonusText(bonus) {
  return Object.entries(bonus).map(([k, v]) => `${BONUS_LABEL[k]}生産 +${Math.round(v * 100)}%`).join(" · ");
}

function renderBattleCard(target) {
  const card = $("#battleCard");
  const key = `${target?.id || "none"}|${state.prestige.count}`;
  if (key !== battleKey) {
    battleKey = key;
    if (!target) {
      card.innerHTML = `<div class="battle-clear"><span class="kicker">ALL SECTORS SECURED</span><h3>全星域制圧！</h3><p>銀河超越で覇王星を獲得し、さらに強い帝国で新たな銀河へ。</p><button class="btn btn-purple" data-goto="goals">${icon("galaxy")}<span class="btn-main">超越へ</span></button></div>`;
      refs.battle = null;
      return;
    }
    const idx = TERRITORIES.indexOf(target);
    card.innerHTML = `
      <div class="battle-head">
        <div class="battle-title">
          <span class="kicker">SECTOR ${idx + 1} · 敵 ${h(target.enemy)}</span>
          <h3>${h(target.name)}</h3>
          <span class="bonus-tag">${icon("trend")}${bonusText(target.bonus)}</span>
        </div>
        <div class="odds" data-b="odds">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="odds-track" cx="32" cy="32" r="27"/><circle class="odds-fill" cx="32" cy="32" r="27" data-b="ring"/></svg>
          <b data-b="pct">0%</b><small>勝率</small>
        </div>
      </div>
      <div class="versus">
        <div class="vs-side own"><small>自軍 実効戦力</small><b data-b="own">0</b></div>
        <div class="vs-bar"><i class="vs-own" data-b="bar"></i><span class="vs-mark">VS</span></div>
        <div class="vs-side enemy"><small>敵戦力</small><b>${fmtInt(enemyPower(state, target))}</b></div>
      </div>
      <div class="battle-foot">
        <div class="reward-box"><small>制圧報酬</small><div class="reward-list">${rewardChips(target.reward)}</div></div>
        <button class="btn btn-red battle-btn" data-battle="${target.id}">${icon("sword")}<span class="btn-main">出撃</span></button>
      </div>`;
    refs.battle = Object.fromEntries($$("[data-b]", card).map(el => [el.dataset.b, el]));
  }
  if (!refs.battle) return;
  const preview = viewCache.preview(state, target);
  if (refs.battle.preview === preview) return;
  refs.battle.preview = preview;
  const pct = Math.round(preview.winChance * 100);
  setText(refs.battle.pct, `${pct}%`);
  setText(refs.battle.own, fmtInt(preview.effective));
  const tone = pct < 40 ? "bad" : pct < 65 ? "mid" : "good";
  if (refs.battle.odds.dataset.tone !== tone) refs.battle.odds.dataset.tone = tone;
  refs.battle.ring.style.strokeDashoffset = String(169.6 * (1 - preview.winChance));
  refs.battle.bar.style.width = `${Math.max(6, Math.min(94, preview.effective / (preview.effective + preview.enemy) * 100))}%`;
}

// ---------------------------------------------------------------- goals
function buildGoals() {
  $("#missionList").innerHTML = missionList(state).map(m => `
    <article class="mission" data-mission-card="${m.id}">
      <span class="mission-icon">${icon(MISSION_ICON[m.id] || "goals")}</span>
      <div class="mission-body">
        <b>${m.label}</b>
        <div class="progress"><i></i></div>
        <div class="mission-meta"><span class="mission-prog"></span><span class="reward-list">${rewardChips(m.reward)}</span></div>
      </div>
      <button class="btn mission-btn" data-mission="${m.id}"><span class="btn-main"></span></button>
    </article>`).join("");
  for (const m of missionList(state)) {
    const el = $(`[data-mission-card="${m.id}"]`);
    refs.missions[m.id] = { el, bar: $(".progress i", el), prog: $(".mission-prog", el), btn: $(".mission-btn", el), label: $(".mission-btn .btn-main", el) };
  }
  $("#prestigeCard").innerHTML = `
    <div class="galaxy" aria-hidden="true"><i></i><i></i><b></b></div>
    <div class="prestige-copy">
      <p>基地・艦隊・征服状況をリセットし、恒久ボーナスの<strong>覇王星</strong>を獲得。星1個ごとに資源生産 <strong>+8%</strong>、艦隊戦力 <strong>+3.5%</strong>。ただし超越のたびに<em>敵戦力も +${Math.round(ENEMY_SCALE_PER_PRESTIGE * 100)}%</em>。</p>
    </div>
    <div class="prestige-stats">
      <div><b data-p="count">0</b><small>超越回数</small></div>
      <div><b data-p="best">0/6</b><small>最高制圧</small></div>
      <div class="gain">${starIcon()}<b data-p="gain">+4</b><small>次回獲得</small></div>
    </div>
    <div class="prestige-reqs">
      <span data-p="req-sector">${icon("flag")}王冠ゲートまで制圧 (5星域)</span>
      <span data-p="req-cmd">${icon("base")}司令中枢 Lv.7</span>
    </div>
    <button class="btn btn-purple prestige-btn" data-prestige-open>${icon("galaxy")}<span class="btn-main" data-p="label">超越する</span></button>`;
  refs.prestige = Object.fromEntries($$("[data-p]", $("#prestigeCard")).map(el => [el.dataset.p, el]));
  refs.prestige.btn = $(".prestige-btn");
}

function updateGoals() {
  for (const m of missionList(state)) {
    const r = refs.missions[m.id];
    const claimed = state.missionClaims.includes(m.id);
    const done = m.progress >= m.goal;
    const p = Math.min(100, m.progress / m.goal * 100);
    if (r.progress !== p) { r.bar.style.transform = `scaleX(${p / 100})`; r.progress = p; }
    setText(r.prog, `${fmtInt(Math.min(m.goal, Math.floor(m.progress)))} / ${fmtInt(m.goal)}`);
    setText(r.label, claimed ? "受取済" : done ? "受け取る" : `${Math.floor(p)}%`);
    setClass(r.el, "ready", done && !claimed);
    setClass(r.el, "claimed", claimed);
    setClass(r.btn, "btn-gold", done && !claimed);
    if (r.btn.disabled !== (!done || claimed)) r.btn.disabled = !done || claimed;
  }
  const ready = canPrestige(state);
  const p = refs.prestige;
  setText(p.count, String(state.prestige.count));
  setText(p.best, `${state.prestige.bestTerritories}/6`);
  setText(p.gain, `+${Math.max(4, availablePrestigeStars(state))}`);
  setClass(p["req-sector"], "met", state.conquered.length >= 5);
  setClass(p["req-cmd"], "met", state.buildings.command >= 7);
  setText(p.label, ready ? `超越して ★${Math.max(4, availablePrestigeStars(state))} 獲得` : "条件未達成");
  if (p.btn.disabled !== !ready) p.btn.disabled = !ready;
  setClass($("#prestigeCard"), "ready", ready);
}

function updateBadges() {
  const claimable = missionList(state).some(m => m.progress >= m.goal && !state.missionClaims.includes(m.id)) || canPrestige(state);
  setClass($("#goalBadge"), "hidden", !claimable);
  const target = targetTerritory(state);
  const odds = target ? viewCache.preview(state, target).winChance : 0;
  setClass($("#mapBadge"), "hidden", !target || odds * 100 < 57.5);
}

// ---------------------------------------------------------------- refresh
function refreshActive() {
  updateHudSlow();
  if (activePanel === "base") { updateBaseScene(); renderDetail(); }
  else if (activePanel === "map") renderMap();
  else updateGoals();
  updateBadges();
}

function afterAction() {
  const unlocks = checkAchievements(state);
  for (const a of unlocks) {
    toast(`実績「${a.name}」解除`, { icon: "star", tone: "gold", sub: `覇王星 +${a.reward}` });
    bump($("#starPill"));
  }
  if (unlocks.length) { sfx("claim"); burst(innerWidth * .5, innerHeight * .3, 40, "gold", { ring: true }); }
  refreshActive();
  queueSave();
}

let saveTimer = null;
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

// ---------------------------------------------------------------- toasts & modal
function toast(message, { icon: ico = "check", tone = "cyan", sub = "" } = {}) {
  const layer = $("#toastLayer");
  while (layer.children.length >= 3) layer.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = `toast tone-${tone}`;
  el.innerHTML = `<span class="toast-ico">${ico === "star" ? starIcon() : icon(ico)}</span><span class="toast-txt"><b>${h(message)}</b>${sub ? `<small>${h(sub)}</small>` : ""}</span>`;
  layer.append(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); }, 2400);
}

let modalTimer = null;
function showModal(html, cls = "") {
  clearTimeout(modalTimer);
  $("#modalBody").innerHTML = html;
  $("#modal").className = `modal ${cls}`;
}

function closeModal() {
  const modal = $("#modal");
  if (modal.classList.contains("hidden")) return;
  modal.classList.add("closing");
  modalTimer = setTimeout(() => { modal.className = "modal hidden"; }, reducedMotion() ? 0 : 180);
  if (welcomeGains) {
    const gains = welcomeGains;
    welcomeGains = null;
    for (const k of RESOURCE_KEYS) hold[k] = Math.max(0, hold[k] - gains[k]);
    flyGains({ x: innerWidth / 2, y: innerHeight / 2 }, gains);
  }
}

// Offline gains are already in state; hold them back in the HUD until the player collects them.
let welcomeGains = null;
const WELCOME_MODAL_SECONDS = 120;
function prepareWelcome() {
  if (!welcome || welcome.seconds < WELCOME_MODAL_SECONDS) return;
  for (const k of RESOURCE_KEYS) hold[k] += welcome.gains[k];
  welcomeGains = Object.fromEntries(RESOURCE_KEYS.map(k => [k, (welcomeGains?.[k] || 0) + welcome.gains[k]]));
}

function showWelcome() {
  if (!welcome) return;
  const { seconds } = welcome;
  welcome = null;
  if (seconds < WELCOME_MODAL_SECONDS) { if (seconds >= 30) toast(`${formatDuration(seconds)}分の生産を回収`, { icon: "clock" }); return; }
  const gains = welcomeGains;
  showModal(`
    <div class="welcome">
      <span class="kicker">WELCOME BACK</span>
      <h2>おかえりなさい、司令官</h2>
      <p>不在の <b>${formatDuration(seconds)}</b> も基地は稼働を続けていました。</p>
      <div class="welcome-grid">${RESOURCE_KEYS.map(k => `<div class="welcome-item">${resourceIcon(k)}<b>+${compactNumber(gains[k])}</b><small>${RESOURCE_META[k].name}</small></div>`).join("")}</div>
      <button class="btn btn-gold btn-wide" data-close-modal><span class="btn-main">受け取る</span></button>
    </div>`, "center");
}

function showHelp() {
  showModal(`
    <div class="help">
      <span class="kicker">FIELD MANUAL</span>
      <h2>遊び方</h2>
      <ol class="howto">
        <li><b>${icon("base")}基地を育てる</b><span>施設や艦隊を直接タップして強化・建造。ボタン長押しで連続実行。<em>↑</em>マークは今すぐ強化できる印です。</span></li>
        <li><b>${icon("bolt")}資源サージ</b><span>右下のサージで数十秒分の生産を即回収。序盤の加速に。</span></li>
        <li><b>${icon("fleet")}艦隊編成</b><span>3兵種には得意分野があり、星域ごとに有利な編成が変わります。</span></li>
        <li><b>${icon("map")}星域征服</b><span>勝率を見て出撃。勝つと恒久的な生産ボーナスと報酬を獲得。</span></li>
        <li><b>${icon("galaxy")}銀河超越</b><span>終盤に覇王星を得てニューゲーム。周回ごとに成長が加速。</span></li>
      </ol>
      <p class="note">進行は端末内に自動保存され、最大8時間分のオフライン生産を回収できます。<br>バージョン ${APP_VERSION}</p>
      <div class="settings">
        <button class="setting" data-toggle="sound"><span>${icon("sound")}サウンド</span><i class="switch ${state.settings.sound ? "on" : ""}"></i></button>
        <button class="setting" data-toggle="motion"><span>${icon("galaxy")}演出を減らす</span><i class="switch ${state.settings.reducedMotion ? "on" : ""}"></i></button>
      </div>
      <button class="btn btn-ghost btn-wide danger" data-reset-open>${icon("reset")}<span class="btn-main">最初からやり直す</span></button>
    </div>`);
}

function openResetModal() {
  showModal(`<div class="confirm"><span class="kicker danger">DATA RESET</span><h2>最初からやり直す？</h2><p>このゲームのセーブデータだけを削除し、資源・施設・艦隊・征服・実績・超越回数をすべて初期状態に戻します。<b>この操作は元に戻せません。</b></p><div class="confirm-row"><button class="btn btn-ghost" data-close-modal><span class="btn-main">キャンセル</span></button><button class="btn btn-danger" data-reset-confirm><span class="btn-main">削除して最初から</span></button></div></div>`, "center");
}

function confirmReset() {
  if (resetting) return;
  resetting = true;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

let prestigeInProgress = false;
function openPrestigeModal() {
  if (prestigeInProgress || !canPrestige(state)) return;
  const stars = Math.max(4, availablePrestigeStars(state));
  showModal(`<div class="confirm"><div class="galaxy small" aria-hidden="true"><i></i><i></i><b></b></div><span class="kicker">ASCENSION</span><h2>銀河超越を実行？</h2><p>基地・資源・艦隊・征服状況は初期化されます。実績と覇王星は保持され、次周はより高速に成長します。</p><p class="threat-note">${icon("skull")}次の銀河では敵戦力 <b>+${Math.round((enemyScale(state) - 1 + ENEMY_SCALE_PER_PRESTIGE) * 100)}%</b>（現在 +${Math.round((enemyScale(state) - 1) * 100)}%）</p><div class="ascend-gain">${starIcon()}<b>+${stars}</b><small>覇王星</small></div><div class="confirm-row"><button class="btn btn-ghost" data-close-modal><span class="btn-main">やめる</span></button><button id="confirmPrestige" class="btn btn-purple" data-prestige-confirm><span class="btn-main">超越を確定</span></button></div></div>`, "center");
}

function confirmPrestige() {
  if (prestigeInProgress || !canPrestige(state)) return;
  prestigeInProgress = true;
  const confirmButton = $("#confirmPrestige");
  if (confirmButton) confirmButton.disabled = true;
  const result = prestige(state);
  if (!result.ok) { prestigeInProgress = false; return; }
  closeModal();
  for (const k of RESOURCE_KEYS) { hold[k] = 0; shown[k] = state.resources[k]; }
  document.body.classList.add("ascend-flash");
  setTimeout(() => document.body.classList.remove("ascend-flash"), 900);
  burst(innerWidth * .5, innerHeight * .5, 120, "purple", { speed: 1.4, ring: true });
  sfx("prestige"); haptic([30, 40, 60]);
  toast(`超越成功！ 覇王星 +${result.earned}`, { icon: "star", tone: "purple" });
  selected = { type: "building", key: "command" };
  fresh.clear();
  detailKey = ""; mapKey = ""; battleKey = "";
  switchPanel("base", true);
  afterAction();
  prestigeInProgress = false;
}

// ---------------------------------------------------------------- actions
function nodeFor(type, key) { return type === "unit" ? refs.fleets[key]?.el : refs.facilities[key]?.el; }

function doAction(btn, repeat = false) {
  const type = btn.dataset.action === "recruit" ? "unit" : "building";
  const key = btn.dataset.key;
  const def = type === "unit" ? UNITS[key] : BUILDINGS[key];
  const beforeLevel = state.buildings.command;
  const result = type === "unit" ? recruitUnit(state, key) : upgradeBuilding(state, key);
  if (!result.ok) {
    if (!repeat) {
      sfx("deny"); haptic(8);
      if (!reducedMotion()) btn.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 260 });
      if (result.reason === "locked") toast(`司令中枢 Lv.${def.unlock.command} で解禁`, { icon: "lock", tone: "red" });
      else toast("資源が不足しています", { icon: "clock", tone: "red", sub: `あと ${formatClock(etaFor(result.cost))} で準備完了` });
    }
    return false;
  }
  fresh.delete(key);
  const node = nodeFor(type, key);
  const art = node?.querySelector(type === "unit" ? ".formation" : ".facility-art-wrap");
  if (type === "unit") {
    sfx("build"); haptic(10);
    burstAt(art, repeat ? 6 : 12, "cyan");
    floatText(node, `+1`, "cyan");
  } else {
    const level = state.buildings[key];
    const tierUp = facilityTier(level) !== facilityTier(level - 1);
    sfx("upgrade"); haptic(tierUp ? [20, 30, 40] : 16);
    burstAt(art, tierUp ? 44 : 22, tierUp ? "gold" : "green", { ring: true });
    floatText(node, `Lv.${level}`, tierUp ? "gold" : "green");
    if (node && !reducedMotion()) node.querySelector(".facility-art-wrap").animate([{ transform: "scale(1)" }, { transform: "scale(1.12) translateY(-4px)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.3,1.6,.5,1)" });
    if (tierUp && level > 1) toast(`${def.name} が ${TIER_NAME[facilityTier(level)]} に進化！`, { icon: "up", tone: "gold" });
    else if (level === 1) toast(`${def.name} 建設完了`, { icon: "build", tone: "green" });
    if (key === "command" && state.buildings.command > beforeLevel) announceUnlocks(state.buildings.command);
  }
  afterAction();
  return true;
}

function announceUnlocks(level) {
  const items = [...Object.entries(BUILDINGS).map(([k, d]) => [k, d]), ...Object.entries(UNITS).map(([k, d]) => [k, d])].filter(([, d]) => d.unlock?.command === level);
  if (!items.length) return;
  items.forEach(([k]) => fresh.add(k));
  setTimeout(() => { sfx("unlock"); toast(`新たに解禁: ${items.map(([, d]) => d.name).join("・")}`, { icon: "gift", tone: "purple" }); }, 250);
}

function floatText(node, text, tone) {
  if (!node || reducedMotion()) return;
  const r = node.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = `float-text tone-${tone}`;
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height * .3}px`;
  $("#flyLayer").append(el);
  el.animate([{ transform: "translate(-50%,0) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-18px) scale(1.15)", opacity: 1, offset: .25 }, { transform: "translate(-50%,-46px) scale(1)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => el.remove();
}

function doSurge(btn) {
  const gains = surge(state);
  sfx("surge"); haptic(14);
  burstAt(btn, 26, "cyan", { ring: true });
  if (!reducedMotion()) btn.animate([{ transform: "scale(1)" }, { transform: "scale(.9)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
  flyGains(btn, gains);
  afterAction();
}

function doClaim(btn) {
  const result = claimMission(state, btn.dataset.mission);
  if (!result.ok) return;
  sfx("claim"); haptic([15, 30, 15]);
  burstAt(btn, 30, "gold", { ring: true });
  flyGains(btn, result.mission.reward);
  toast(`ミッション達成: ${result.mission.label}`, { icon: "gift", tone: "gold" });
  afterAction();
}

// ---------------------------------------------------------------- battle cinematic
let battleTimers = [];
let battleResult = null;

function playBattle(id) {
  if (busy) return;
  const target = TERRITORIES.find(t => t.id === id);
  const before = { ...state.units };
  const result = resolveBattle(state, id);
  if (!result.ok) return;
  busy = true;
  if (result.win) for (const [k, v] of Object.entries(result.reward)) hold[k] += v;
  saveState();
  battleResult = { result, target, before };
  const overlay = $("#battleOverlay");
  const fleetKinds = Object.keys(UNITS).filter(k => before[k] > 0);
  const ships = (fleetKinds.length ? fleetKinds : ["striker"]).flatMap(k => Array.from({ length: Math.min(3, Math.max(1, Math.ceil(before[k] / 4))) }, () => k)).slice(0, 7);
  overlay.innerHTML = `
    <div class="bo-bg"></div>
    <div class="bo-stage">
      <div class="bo-enemy">${planetArt(target.type, "bo-planet")}${["striker", "guardian", "striker"].map((k, i) => `<span class="bo-eship" style="--i:${i}">${shipArt(k, { enemy: true })}</span>`).join("")}</div>
      <div class="bo-fleet">${ships.map((k, i) => `<span class="bo-ship" style="--i:${i};left:${[40, 20, 20, 60, 60, 0, 0][i]}%;top:${[36, 8, 64, 16, 58, 36, 88][i]}%">${shipArt(k)}</span>`).join("")}</div>
      <div class="bo-lasers"></div>
      <div class="bo-caption"><span class="kicker">SECTOR ${TERRITORIES.indexOf(target) + 1}</span><b>${h(target.name)}</b><small>VS ${h(target.enemy)}</small></div>
    </div>
    <div class="bo-result"></div>
    <div class="bo-skip">タップでスキップ</div>`;
  overlay.className = "battle-overlay phase-in";
  sfx("launch"); haptic([30, 45, 40]);
  const fast = reducedMotion();
  const current = battleResult;
  setTimeout(() => { if (battleResult === current) setCovered(true); }, fast ? 0 : 260); // after .bo-bg fades in
  const at = (ms, fn) => battleTimers.push(setTimeout(fn, fast ? 0 : ms));
  if (!fast) {
    at(520, () => overlay.classList.add("phase-fire"));
    for (let i = 0; i < 9; i += 1) at(560 + i * 95, () => fireLaser(overlay, i));
    for (let i = 0; i < 4; i += 1) at(760 + i * 190, () => { const p = $(".bo-planet", overlay)?.getBoundingClientRect(); if (p) burst(p.left + p.width * (.3 + Math.random() * .4), p.top + p.height * (.3 + Math.random() * .4), 16, result.win ? "gold" : "red"); sfx("boom"); });
  }
  at(1650, showBattleResult);
}

function fireLaser(overlay, i) {
  const layer = $(".bo-lasers", overlay);
  const ships = $$(".bo-ship", overlay);
  const planet = $(".bo-planet", overlay);
  if (!layer || !ships.length || !planet) return;
  const s = ships[i % ships.length].getBoundingClientRect();
  const p = planet.getBoundingClientRect();
  const x1 = s.right - 6, y1 = s.top + s.height / 2;
  const x2 = p.left + p.width * (.35 + Math.random() * .3), y2 = p.top + p.height * (.35 + Math.random() * .3);
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
  const beam = document.createElement("i");
  beam.className = "bo-laser";
  beam.style.cssText = `left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${ang}rad)`;
  layer.append(beam);
  setTimeout(() => beam.remove(), 260);
  sfx("laser");
}

function showBattleResult() {
  if (!battleResult || battleResult.shown) return;
  battleResult.shown = true;
  battleTimers.forEach(clearTimeout); battleTimers = [];
  const { result, target } = battleResult;
  const overlay = $("#battleOverlay");
  overlay.classList.add("phase-result", result.win ? "win" : "lose");
  const box = $(".bo-result", overlay);
  if (result.win) {
    box.innerHTML = `
      <div class="result-rays"></div>
      <div class="result-title">VICTORY</div>
      <div class="result-sub">${h(target.name)} を制圧！</div>
      <div class="result-card">
        <small>獲得報酬</small><div class="reward-list big">${rewardChips(result.reward)}</div>
        <span class="bonus-tag">${icon("trend")}恒久ボーナス ${bonusText(target.bonus)}</span>
        ${state.battle.streak > 1 ? `<span class="streak-tag">${state.battle.streak}連勝中！</span>` : ""}
      </div>
      <button class="btn btn-gold btn-wide" data-battle-close><span class="btn-main">受け取る</span></button>`;
    sfx("victory"); haptic([40, 30, 70]);
    burst(innerWidth / 2, innerHeight * .34, 70, "gold", { speed: 1.3, ring: true });
  } else {
    const lost = Object.entries(result.casualties).filter(([, v]) => v > 0);
    box.innerHTML = `
      <div class="result-title">DEFEAT</div>
      <div class="result-sub">撤退… ${h(target.enemy)} の防衛線は厚い</div>
      <div class="result-card">
        <small>損害</small>
        <div class="loss-list">${lost.length ? lost.map(([k, v]) => `<span>${shipArt(k)}<b>${UNITS[k].name}</b><em>-${v}</em></span>`).join("") : `<span class="none">艦隊の損害なし</span>`}</div>
        <p class="tip">${icon("up")}艦隊を増強し、有利な兵種を揃えて再挑戦しよう</p>
      </div>
      <button class="btn btn-ghost btn-wide" data-battle-close><span class="btn-main">基地に帰還</span></button>`;
    sfx("defeat"); haptic(90);
  }
}

function closeBattle() {
  if (!battleResult?.shown) return;
  const { result } = battleResult;
  const overlay = $("#battleOverlay");
  const from = $(".reward-list", overlay)?.getBoundingClientRect();
  setCovered(false);
  overlay.classList.add("closing");
  setTimeout(() => { overlay.className = "battle-overlay hidden"; overlay.innerHTML = ""; }, reducedMotion() ? 0 : 220);
  if (result.win) {
    for (const [k, v] of Object.entries(result.reward)) hold[k] = Math.max(0, hold[k] - v);
    flyGains(from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }, result.reward);
    setTimeout(() => { const n = $(`[data-territory="${result.territory.id}"]`); burstAt(n, 30, "cyan", { ring: true }); }, 260);
  }
  battleResult = null;
  busy = false;
  afterAction();
}

// ---------------------------------------------------------------- navigation
function switchPanel(name, silent = false) {
  if (!["base", "map", "goals"].includes(name)) return;
  const changed = name !== activePanel;
  activePanel = name;
  $$(".panel").forEach(p => setClass(p, "active", p.id === `panel-${name}`));
  const tabs = $$(".tab");
  tabs.forEach(b => setClass(b, "active", b.dataset.panel === name));
  $(".tabbar").style.setProperty("--tab", String(tabs.findIndex(b => b.dataset.panel === name)));
  if (changed && !silent) { sfx("tab"); haptic(6); }
  refreshActive();
}

// ---------------------------------------------------------------- input
let holdTimer = null;
let holdFired = false;

function clearHold() {
  clearTimeout(holdTimer); holdTimer = null;
  document.querySelectorAll(".action-btn.holding").forEach(b => b.classList.remove("holding"));
}

function onPointerDown(e) {
  unlockAudio();
  const btn = e.target.closest(".action-btn");
  if (!btn || btn.classList.contains("btn-locked")) return;
  holdFired = false;
  clearHold();
  holdTimer = setTimeout(function step(delay = 170) {
    btn.classList.add("holding");
    if (!doAction(btn, true)) { clearHold(); return; }
    holdFired = true;
    holdTimer = setTimeout(() => step(Math.max(60, delay * .86)), delay);
  }, 380);
}

function onPointerUp() {
  if (holdFired) suppressClick = true;
  clearHold();
}

function handleClick(e) {
  const t = e.target;
  if (suppressClick) { suppressClick = false; if (t.closest(".action-btn")) return; }

  if ($("#battleOverlay").contains(t)) {
    if (t.closest("[data-battle-close]")) closeBattle();
    else if (battleResult && !battleResult.shown) showBattleResult();
    return;
  }

  const facility = t.closest("[data-facility]");
  if (facility) {
    const key = facility.dataset.facility;
    if (selected.type === "building" && selected.key === key) { const btn = $(".action-btn"); if (btn && !reducedMotion()) btn.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 220 }); }
    selected = { type: "building", key };
    fresh.delete(key);
    sfx("select"); haptic(6);
    refreshActive();
    return;
  }
  const unit = t.closest("[data-unit]");
  if (unit) {
    selected = { type: "unit", key: unit.dataset.unit };
    fresh.delete(unit.dataset.unit);
    sfx("select"); haptic(6);
    refreshActive();
    return;
  }

  const action = t.closest(".action-btn");
  if (action) { doAction(action); return; }
  if (t.closest("#surgeBtn")) { doSurge($("#surgeBtn")); return; }

  if (t.closest("[data-reset-confirm]")) { confirmReset(); return; }
  if (t.closest("[data-reset-open]")) { openResetModal(); return; }
  if (t.closest("[data-prestige-confirm]")) { confirmPrestige(); return; }
  if (t.closest("[data-prestige-open]")) { openPrestigeModal(); return; }
  if (t.closest("[data-close-modal]")) { closeModal(); return; }

  const toggle = t.closest("[data-toggle]");
  if (toggle) {
    if (toggle.dataset.toggle === "sound") { state.settings.sound = !state.settings.sound; syncSoundButton(); }
    else { state.settings.reducedMotion = !state.settings.reducedMotion; syncMotion(); }
    setClass($(".switch", toggle), "on", toggle.dataset.toggle === "sound" ? state.settings.sound : state.settings.reducedMotion);
    sfx("tap"); saveState();
    return;
  }

  const mission = t.closest("[data-mission]");
  if (mission) { doClaim(mission); return; }

  const battle = t.closest("[data-battle]");
  if (battle) { playBattle(battle.dataset.battle); return; }

  const territory = t.closest("[data-territory]");
  if (territory) {
    const tt = TERRITORIES.find(x => x.id === territory.dataset.territory);
    if (state.conquered.includes(tt.id)) toast(`${tt.name}（制圧済）`, { icon: "flag", sub: `恒久ボーナス ${bonusText(tt.bonus)}` });
    else if (targetTerritory(state)?.id === tt.id) { sfx("select"); const b = $(".battle-btn"); if (b && !reducedMotion()) b.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 240 }); }
    else toast(`${tt.name}`, { icon: "lock", tone: "red", sub: "手前の星域を先に制圧しよう" });
    return;
  }

  const go = t.closest("[data-goto]");
  if (go) { switchPanel(go.dataset.goto); return; }

  const nav = t.closest("[data-panel]");
  if (nav) switchPanel(nav.dataset.panel);
}

function syncSoundButton() {
  setSoundEnabled(state.settings.sound);
  const btn = $("#soundBtn");
  btn.dataset.muted = state.settings.sound ? "false" : "true";
  btn.setAttribute("aria-label", state.settings.sound ? "サウンドをオフ" : "サウンドをオン");
}

// An opaque prologue/battle screen fully hides the base: freeze its looping art and defer UI refreshes
// until it is revealed again (the reveal path refreshes immediately, so nothing stale is ever shown).
function setCovered(on) {
  covered = on;
  document.body.classList.toggle("covered", on);
  if (on) return;
  // The hidden HUD counters would have settled by now: show the settled values at once.
  for (const k of RESOURCE_KEYS) shown[k] = Math.max(0, state.resources[k] - hold[k]);
  updateHud(0);
}

function syncMotion() { document.body.classList.toggle("reduce-motion", !!state.settings.reducedMotion); }

function setupEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("pointerdown", onPointerDown, { passive: true });
  for (const ev of ["pointerup", "pointercancel"]) document.addEventListener(ev, onPointerUp, { passive: true });
  document.addEventListener("contextmenu", e => { if (e.target.closest("button")) e.preventDefault(); });
  $("#soundBtn").addEventListener("click", () => { state.settings.sound = !state.settings.sound; syncSoundButton(); if (state.settings.sound) sfx("select"); saveState(); });
  $("#helpBtn").addEventListener("click", () => { sfx("tap"); showHelp(); });
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (battleResult?.shown) closeBattle(); else closeModal(); } });
  document.addEventListener("visibilitychange", () => {
    if (!started) return;
    if (document.hidden) { saveState(); clearHold(); return; }
    const sec = (Date.now() - state.lastSeenAt) / 1000;
    if (sec > 3) {
      welcome = collectOffline(state, Math.min(sec, OFFLINE_CAP));
      prepareWelcome();
      showWelcome();
      refreshActive();
    }
    state.lastSeenAt = Date.now();
  });
  addEventListener("pagehide", saveState);
  addEventListener("beforeunload", saveState);
}

// ---------------------------------------------------------------- background
function paintStars() {
  const make = (count, maxR, alpha) => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    for (let i = 0; i < count; i += 1) {
      const r = Math.random() ** 3 * maxR + .35;
      const x = Math.random() * 512, y = Math.random() * 512;
      const hue = [200, 220, 45, 280][Math.floor(Math.random() * 4)];
      g.fillStyle = `hsla(${hue},80%,${80 + Math.random() * 20}%,${alpha * (.4 + Math.random() * .6)})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (r > maxR * .6) { g.fillStyle = `hsla(${hue},90%,85%,.12)`; g.beginPath(); g.arc(x, y, r * 4, 0, Math.PI * 2); g.fill(); }
    }
    return c.toDataURL();
  };
  $(".space-stars.far").style.backgroundImage = `url(${make(170, 1.1, .8)})`;
  $(".space-stars.near").style.backgroundImage = `url(${make(46, 2, 1)})`;
}

// ---------------------------------------------------------------- loop & boot
let lastFrame = performance.now();
let lastUi = 0;
let lastSave = 0;

function loop(now) {
  const dt = Math.min(.25, (now - lastFrame) / 1000);
  lastFrame = now;
  tick(state, dt, viewCache.production(state).rates);
  if (!covered) {
    updateHud(dt);
    if (now - lastUi > 250) { refreshActive(); lastUi = now; }
  }
  if (now - lastSave > 5000) { saveState(); lastSave = now; }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- first-visit prologue
function showIntro() {
  $("#introLogo").innerHTML = brandMark();
  $("#introVoid").innerHTML = planetArt("boss");
  $("#introFleet").innerHTML = ["guardian", "striker", "striker", "siege", "striker"].map((k, i) => `<span class="intro-ship" style="--i:${i};left:${[30, 12, 44, 4, 22][i]}%;top:${[30, 8, 62, 50, 72][i]}%">${shipArt(k)}</span>`).join("");
  $("#introSteps").innerHTML = [["base", "基地を育てる"], ["fleet", "艦隊を編成"], ["map", "星域を征服"]]
    .map(([ico, label]) => `<li>${icon(ico)}<span>${label}</span></li>`).join("");
  $("#intro").classList.remove("hidden");
  setCovered(true);
  $("#startBtn").addEventListener("click", startFromIntro, { once: true });
}

function startFromIntro() {
  const intro = $("#intro");
  unlockAudio();
  sfx("launch"); haptic([20, 40, 30]);
  state = createInitialState();
  for (const k of RESOURCE_KEYS) shown[k] = state.resources[k];
  setCovered(false);
  intro.classList.add("leaving");
  setTimeout(() => intro.remove(), reducedMotion() ? 0 : 650);
  beginGame();
  setTimeout(() => toast("前哨基地に着任しました", { icon: "base", sub: "施設をタップして強化しよう" }), reducedMotion() ? 0 : 500);
}

function beginGame() {
  started = true;
  lastFrame = performance.now();
  requestAnimationFrame(loop);
  afterAction();
  showWelcome();
}

// Keep installed copies (notably iOS home-screen apps, which rarely do a full reload) on the latest deploy:
// check for a new worker on launch and on every resume; the worker reloads open pages when it replaces an old version.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then(reg => {
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}

function boot() {
  const firstVisit = !hasSave();
  state = loadState();
  prepareWelcome();
  injectDefs();
  syncMotion();
  paintStars();
  initFx($("#fxCanvas"), reducedMotion);
  buildHud();
  buildBaseScene();
  buildGoals();
  setupEvents();
  switchPanel("base", true);
  if (firstVisit) showIntro();
  const splash = $("#splash");
  setTimeout(() => {
    splash.classList.add("done");
    setTimeout(() => splash.remove(), 600);
    if (!firstVisit) beginGame();
  }, reducedMotion() ? 0 : 450);
  registerServiceWorker();
  window.__STELLAR_DOMINION_READY__ = true;
}

boot();
