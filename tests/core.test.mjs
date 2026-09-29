import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState, normalizeState, productionPerSecond, buildingCost,
  upgradeBuilding, recruitUnit, fleetPower, targetTerritory, battlePreview,
  resolveBattle, tick, surge, missionList, claimMission, canPrestige, prestige, compactNumber, formatCost
} from "../js/game-core.js";

test("initial state is playable and produces resources", () => {
  const state = createInitialState(1000);
  const rates = productionPerSecond(state);
  assert.ok(rates.credits > 0 && rates.alloy > 0 && rates.energy > 0);
  const before = state.resources.alloy;
  tick(state, 10);
  assert.ok(state.resources.alloy > before);
});

test("building upgrades spend exact cost and increase level", () => {
  const state = createInitialState();
  state.resources.credits = 1e9; state.resources.alloy = 1e9; state.resources.energy = 1e9;
  const cost = buildingCost(state, "extractor");
  const before = state.resources.credits;
  const result = upgradeBuilding(state, "extractor");
  assert.equal(result.ok, true);
  assert.equal(state.buildings.extractor, 2);
  assert.equal(state.resources.credits, before - cost.credits);
});

test("locked unit cannot be recruited before command requirement", () => {
  const state = createInitialState();
  state.resources.credits = state.resources.alloy = state.resources.energy = 1e9;
  assert.equal(recruitUnit(state, "siege").ok, false);
  state.buildings.command = 4;
  assert.equal(recruitUnit(state, "siege").ok, true);
});

test("fleet power grows with recruitment", () => {
  const state = createInitialState();
  state.resources.credits = state.resources.alloy = state.resources.energy = 1e9;
  const before = fleetPower(state);
  recruitUnit(state, "striker", 2);
  assert.ok(fleetPower(state) > before);
});

test("deterministic successful battle advances route", () => {
  const state = createInitialState();
  state.units.striker = 100;
  const target = targetTerritory(state);
  const preview = battlePreview(state, target);
  assert.ok(preview.winChance > 0.5);
  const result = resolveBattle(state, target.id, () => 0);
  assert.equal(result.win, true);
  assert.equal(state.conquered.length, 1);
  assert.notEqual(targetTerritory(state)?.id, target.id);
});

test("failed battle resets streak without negative units", () => {
  const state = createInitialState();
  state.battle.streak = 3;
  const result = resolveBattle(state, "t1", () => 0.999);
  assert.equal(result.win, false);
  assert.equal(state.battle.streak, 0);
  assert.ok(Object.values(state.units).every(n => n >= 0));
});

test("surge grants resources and tracks taps", () => {
  const state = createInitialState();
  const before = state.resources.credits;
  const gain = surge(state);
  assert.ok(gain.credits > 0);
  assert.ok(state.resources.credits > before);
  assert.equal(state.lifetime.totalTaps, 1);
});

test("missions can be claimed only once", () => {
  const state = createInitialState();
  state.buildings.command = 12;
  const m = missionList(state).find(x => x.id === "m-build-12");
  assert.ok(m.progress >= m.goal);
  assert.equal(claimMission(state, m.id).ok, true);
  assert.equal(claimMission(state, m.id).ok, false);
});

test("prestige gate and persistent stars work", () => {
  const state = createInitialState();
  state.buildings.command = 7;
  state.conquered = ["t1","t2","t3","t4","t5"];
  assert.equal(canPrestige(state), true);
  const result = prestige(state, 9999);
  assert.equal(result.ok, true);
  assert.equal(state.prestige.count, 1);
  assert.ok(state.prestige.stars >= 4);
  assert.equal(state.conquered.length, 0);
  assert.equal(state.buildings.command, 1);
});

test("normalization repairs missing nested fields", () => {
  const state = normalizeState({ resources: { credits: 9 }, units: { striker: 1 } });
  assert.equal(state.resources.credits, 9);
  assert.ok("alloy" in state.resources);
  assert.ok("guardian" in state.units);
});


test("tick clamps elapsed time to the existing 8-hour window", () => {
  const state = createInitialState();
  const capped = tick(state, 12 * 3600);
  assert.equal(capped.seconds, 8 * 3600);

  const before = structuredClone(state.resources);
  const negative = tick(state, -30);
  assert.equal(negative.seconds, 0);
  assert.deepEqual(state.resources, before);
});

test("battle rejects invalid and out-of-route targets before rolling", () => {
  const state = createInitialState();
  const shouldNotRoll = () => { throw new Error("random should not be called"); };
  assert.deepEqual(resolveBattle(state, "missing", shouldNotRoll), { ok: false, reason: "invalid" });
  assert.deepEqual(resolveBattle(state, "t2", shouldNotRoll), { ok: false, reason: "route" });
});

test("normalization preserves conquered ordering while filtering invalid ids", () => {
  const state = normalizeState({
    conquered: ["t1", "invalid", "t1"],
    achievements: ["first-up", "first-up"],
    missionClaims: ["m-build-12", "m-build-12"],
  });
  assert.deepEqual(state.conquered, ["t1", "t1"]);
  assert.deepEqual(state.achievements, ["first-up"]);
  assert.deepEqual(state.missionClaims, ["m-build-12"]);
});

test("compact formatting keeps the existing display thresholds", () => {
  assert.equal(compactNumber(Infinity), "0");
  assert.equal(compactNumber(999), "999");
  assert.equal(compactNumber(1000), "1.00K");
  assert.equal(compactNumber(10000), "10.0K");
  assert.equal(compactNumber(100000), "100K");
  assert.equal(compactNumber(12.34), "12.3");
  assert.equal(formatCost({ credits: 1000, alloy: 25 }), "◈1.00K ⬢25.0");
});


test("prestige can be repeated across multiple cycles", () => {
  const state = createInitialState();

  state.buildings.command = 7;
  state.conquered = ["t1","t2","t3","t4","t5"];
  const first = prestige(state, 1000);
  assert.equal(first.ok, true);
  assert.equal(state.prestige.count, 1);
  const starsAfterFirst = state.prestige.stars;

  state.buildings.command = 7;
  state.conquered = ["t1","t2","t3","t4","t5"];
  const second = prestige(state, 2000);
  assert.equal(second.ok, true);
  assert.equal(state.prestige.count, 2);
  assert.ok(state.prestige.stars > starsAfterFirst);
  assert.equal(state.conquered.length, 0);
  assert.equal(state.buildings.command, 1);
});


test("initial passive production is halved", () => {
  const state = createInitialState();
  const rates = productionPerSecond(state);
  assert.equal(rates.credits, 1);
  assert.equal(rates.alloy, 2.25);
  assert.equal(rates.energy, 2.6);
  assert.equal(rates.intel, 0);
});
