import test from "node:test";
import assert from "node:assert/strict";
import {
  BUILDINGS, UNITS, TERRITORIES, createInitialState, productionPerSecond,
  productionMultipliers, fleetPower, battlePreview, buildingCost, unitCost,
  tick, upgradeBuilding, recruitUnit, resolveBattle, checkAchievements, prestige,
} from "../js/game-core.js";
import { createViewCache } from "../js/view-cache.js";

function assertCurrent(cache, state) {
  assert.deepEqual(cache.production(state), {
    rates: productionPerSecond(state), multipliers: productionMultipliers(state),
  });
  assert.equal(cache.power(state), fleetPower(state));
  for (const key of Object.keys(BUILDINGS)) {
    assert.deepEqual(cache.buildingCost(state, key), buildingCost(state, key));
    const sim = structuredClone(state);
    sim.buildings[key] += 1;
    assert.deepEqual(cache.facilityEffect(state, key), {
      now: productionPerSecond(state), next: productionPerSecond(sim),
    });
  }
  for (const key of Object.keys(UNITS)) {
    assert.deepEqual(cache.unitCost(state, key), unitCost(state, key));
    const sim = structuredClone(state);
    sim.units[key] += 1;
    assert.deepEqual(cache.unitEffect(state, key), { own: fleetPower(state), next: fleetPower(sim) });
  }
  for (const target of TERRITORIES) assert.deepEqual(cache.preview(state, target), battlePreview(state, target));
  assert.equal(cache.preview(state, null), null);
}

test("resource-only progress reuses derived values and does not mutate simulations", () => {
  const cache = createViewCache(), state = createInitialState();
  const before = structuredClone(state);
  assertCurrent(cache, state);
  assert.deepEqual(state, before);
  const production = cache.production(state), effect = cache.facilityEffect(state, "extractor");
  const unit = cache.unitEffect(state, "striker"), preview = cache.preview(state, TERRITORIES[0]);
  const cost = cache.buildingCost(state, "extractor"), unitPrice = cache.unitCost(state, "striker");
  for (let i = 0; i < 600; i++) {
    tick(state, 1 / 60, cache.production(state).rates);
    assert.strictEqual(cache.production(state), production);
    assert.strictEqual(cache.facilityEffect(state, "extractor"), effect);
    assert.strictEqual(cache.unitEffect(state, "striker"), unit);
    assert.strictEqual(cache.preview(state, TERRITORIES[0]), preview);
    assert.strictEqual(cache.buildingCost(state, "extractor"), cost);
    assert.strictEqual(cache.unitCost(state, "striker"), unitPrice);
  }
  assertCurrent(cache, state);
});

test("every facility and ship input refreshes the affected derived values", () => {
  const cache = createViewCache(), state = createInitialState();
  assertCurrent(cache, state);
  for (const key of Object.keys(BUILDINGS)) {
    const before = cache.production(state);
    state.buildings[key] += 1;
    assert.notStrictEqual(cache.production(state), before);
    assertCurrent(cache, state);
  }
  for (const key of Object.keys(UNITS)) {
    const production = cache.production(state), preview = cache.preview(state, TERRITORIES[0]);
    state.units[key] += 7;
    assert.strictEqual(cache.production(state), production);
    assert.notStrictEqual(cache.preview(state, TERRITORIES[0]), preview);
    assertCurrent(cache, state);
  }
  state.prestige.stars += 5;
  assertCurrent(cache, state);
  state.battle.streak += 2;
  assertCurrent(cache, state);
  state.prestige.count += 3;
  assertCurrent(cache, state);
});

test("conquest changes refresh production even when IDs are replaced in place", () => {
  const cache = createViewCache(), state = createInitialState();
  assertCurrent(cache, state);
  state.conquered.push("t1");
  assertCurrent(cache, state);
  const before = cache.production(state);
  state.conquered[0] = "t2";
  assert.notStrictEqual(cache.production(state), before);
  assertCurrent(cache, state);
  state.conquered.pop();
  assertCurrent(cache, state);
});

test("actions, achievement stars, in-place prestige and a replaced save stay current", () => {
  const cache = createViewCache();
  let state = createInitialState();
  for (const key of Object.keys(state.resources)) state.resources[key] = 1e9;
  assertCurrent(cache, state);
  for (let i = 0; i < 7; i++) {
    assert.equal(upgradeBuilding(state, "command").ok, true);
    assertCurrent(cache, state);
  }
  assert.equal(recruitUnit(state, "striker", 1000).ok, true);
  assertCurrent(cache, state);
  const beforeStars = state.prestige.stars;
  assert.ok(checkAchievements(state).length > 0);
  assert.ok(state.prestige.stars > beforeStars);
  assertCurrent(cache, state);
  // Battle changes are visible before the cinematic calls afterAction().
  for (const target of TERRITORIES) {
    assert.equal(resolveBattle(state, target.id, () => 0).win, true);
    assertCurrent(cache, state);
  }
  assert.equal(prestige(state).ok, true);
  assertCurrent(cache, state);
  const oldProduction = cache.production(state);
  state = createInitialState();
  assert.notStrictEqual(cache.production(state), oldProduction);
  assertCurrent(cache, state);
});

test("cached tick exactly matches normal tick across progress, actions and time limits", () => {
  const cache = createViewCache(), normal = createInitialState(), cached = structuredClone(normal);
  for (const seconds of [0, -1, 1 / 120, ...Array(120).fill(1 / 60), 0.25, 10, 8 * 3600, 9 * 3600]) {
    assert.deepEqual(tick(cached, seconds, cache.production(cached).rates), tick(normal, seconds));
    assert.deepEqual(cached, normal);
  }
  for (const state of [normal, cached]) {
    upgradeBuilding(state, "extractor");
    state.conquered.push("t1", "t2");
    state.prestige.stars += 3;
  }
  assert.deepEqual(tick(cached, 4.2, cache.production(cached).rates), tick(normal, 4.2));
  assert.deepEqual(cached, normal);
});
