// UI-owned derived values. Core calculations stay pure; compare their inputs so
// in-place actions, achievements and loaded/replaced saves cannot leave stale data.
import {
  BUILDINGS, UNITS, TERRITORIES, productionPerSecond, productionMultipliers,
  fleetPower, battlePreview, buildingCost, unitCost,
} from "./game-core.js";

const buildingKeys = Object.keys(BUILDINGS);
const powerInputs = [
  ...Object.keys(UNITS).map(key => state => state.units[key]),
  state => state.buildings.command,
  state => state.buildings.foundry,
  state => state.prestige.stars,
];

// No dependency arrays or state copies are allocated on a cache hit.
function memoize(inputs, calculate) {
  let previousState, previousInputs, value;
  return state => {
    if (state !== previousState || inputs.some((read, i) => read(state) !== previousInputs[i])) {
      value = calculate(state);
      previousInputs = inputs.map(read => read(state));
      previousState = state;
    }
    return value;
  };
}

export function createViewCache() {
  // Returned derived objects are read-only to callers; tick only reads rates.
  let productionState, levels, conquered, stars, productionValue;
  function production(state) {
    if (state !== productionState || stars !== state.prestige.stars
      || buildingKeys.some((key, i) => state.buildings[key] !== levels[i])
      || conquered.length !== state.conquered.length
      || conquered.some((id, i) => id !== state.conquered[i])) {
      productionValue = {
        rates: productionPerSecond(state),
        multipliers: productionMultipliers(state),
      };
      levels = buildingKeys.map(key => state.buildings[key]);
      conquered = [...state.conquered];
      stars = state.prestige.stars;
      productionState = state;
    }
    return productionValue;
  }

  const power = memoize(powerInputs, fleetPower);
  const buildingCosts = Object.fromEntries(buildingKeys.map(key => [key,
    memoize([state => state.buildings[key]], state => buildingCost(state, key)),
  ]));
  const unitCosts = Object.fromEntries(Object.keys(UNITS).map(key => [key,
    memoize([state => state.units[key]], state => unitCost(state, key)),
  ]));
  const unitEffects = Object.fromEntries(Object.keys(UNITS).map(key => [key,
    memoize(powerInputs, state => ({
      own: power(state),
      next: fleetPower({ ...state, units: { ...state.units, [key]: state.units[key] + 1 } }),
    })),
  ]));
  const previews = new Map(TERRITORIES.map(target => [target,
    memoize([
      ...powerInputs,
      state => state.battle.streak,
      state => state.prestige.count,
    ], state => battlePreview(state, target)),
  ]));
  const facilityEffects = new Map();

  return {
    production,
    power,
    buildingCost: (state, key) => buildingCosts[key](state),
    unitCost: (state, key) => unitCosts[key](state),
    unitEffect: (state, key) => unitEffects[key](state),
    preview: (state, target) => target ? previews.get(target)(state) : null,
    facilityEffect(state, key) {
      const source = production(state);
      const cached = facilityEffects.get(key);
      if (cached?.source === source) return cached.value;
      const value = {
        now: source.rates,
        next: productionPerSecond({ ...state, buildings: { ...state.buildings, [key]: state.buildings[key] + 1 } }),
      };
      facilityEffects.set(key, { source, value });
      return value;
    },
  };
}
