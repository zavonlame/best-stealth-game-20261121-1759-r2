// The screenshot scenes behind ?shot=cover|pebble|vault|getaway. Each one plays the
// real rules forward from a fresh world for a fixed number of seconds, steered by an
// autopilot that walks toward the next exhibit (then the exit) while keeping out of
// vision cones and favouring shadows, so the frame is what a real game looks like
// and the same seed always gives the same frame. The pebble scene throws a pebble
// on a timer, so a guard is caught mid-investigation.

import { EXIT, FIELD, GUARD, PLAYER, STEP } from './config.js';
import { pointBlocked, seesPoint, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_WIN } from './render.js';

const DIRS = [
  { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
  { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: 0, y: 0 },
];

const SCENES = {
  cover: { seed: 7, seconds: 11, risk: 180, pebbleAt: null },
  pebble: { seed: 7, seconds: 15, risk: 180, pebbleAt: 14 },
  vault: { seed: 11, seconds: 38, risk: 180, pebbleAt: null },
  getaway: { seed: 11, seconds: 110, risk: 180, pebbleAt: null },
};

function wingOf(x) {
  return x < 432 ? 0 : x < 872 ? 1 : 2;
}

/** The door gaps between the wings: the only way from one wing to the next. */
const DOORS = [{ x: 432, y: 360 }, { x: 872, y: 360 }];

function nextTarget(state) {
  // Clear one wing at a time, nearest exhibit in the lowest wing that still
  // holds one: a thief that chases the nearest exhibit across the museum ends
  // up backtracking for the one it skipped.
  let best = null;
  let bestWing = Infinity;
  let bestDist = Infinity;
  for (const e of state.exhibits) {
    if (e.taken) continue;
    const d = Math.hypot(state.player.x - e.x, state.player.y - e.y);
    if (e.wing < bestWing || (e.wing === bestWing && d < bestDist)) {
      bestWing = e.wing;
      bestDist = d;
      best = e;
    }
  }
  const goal = best !== null ? { x: best.x, y: best.y } : { x: EXIT.x + EXIT.w / 2, y: EXIT.y + EXIT.h / 2 };
  // A greedy walk cannot see a door: when the goal is in another wing, head for
  // the door gap between the wings first, then the goal.
  const pw = wingOf(state.player.x);
  const tw = wingOf(goal.x);
  if (pw === tw) return goal;
  return pw < tw ? DOORS[pw] : DOORS[tw];
}

function exposureAt(state, x, y) {
  let total = 0;
  for (const g of state.guards) total += seesPoint(g, x, y);
  return total;
}

/** The autopilot's move for this step: the direction and whether to sneak. */
function autopilot(state, riskWeight, lastDir, waitSteps) {
  const target = nextTarget(state);
  const player = state.player;
  // Already seen, or nearly: forget the goal and get out of the light.
  const exposedNow = exposureAt(state, player.x, player.y);
  const fleeing = exposedNow > 0 || state.detection > 0.15;
  // Waiting for a gap in the patrols is right, but not forever: the longer the
  // thief has waited, the cheaper a little exposure looks, until it commits.
  const risk = riskWeight * Math.max(0.25, 1 - waitSteps / 240);
  let bestDir = DIRS[8];
  let bestCost = Infinity;
  let bestExposure = 0;
  for (const dir of DIRS) {
    const nx = player.x + dir.x * 40;
    const ny = player.y + dir.y * 40;
    if (nx < 24 || nx > FIELD.width - 24 || ny < 24 || ny > FIELD.height - 24) continue;
    if (pointBlocked(nx, ny, PLAYER.radius)) continue;
    const dist = Math.hypot(target.x - nx, target.y - ny);
    const exposure = exposureAt(state, nx, ny);
    let cost;
    if (fleeing) {
      // Out of the cone first; the goal is a tiebreak.
      cost = exposure * 1500 + dist * 0.2;
    } else {
      cost = dist + exposure * risk;
    }
    // A guard right next to the thief is worse than a cone at range.
    for (const g of state.guards) {
      const d = Math.hypot(g.x - nx, g.y - ny);
      if (d < GUARD.senseRange + 14) cost += (GUARD.senseRange + 14 - d) * 6;
    }
    if (dir.x === 0 && dir.y === 0) cost += 6;
    // Keep going the way we were going: it stops the walk jittering in place.
    if (lastDir !== null && dir.x === lastDir.x && dir.y === lastDir.y) cost -= 4;
    if (cost < bestCost) {
      bestCost = cost;
      bestDir = dir;
      bestExposure = exposure;
    }
  }
  return { dir: bestDir, sneak: fleeing || bestExposure > 0.03 };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * time to show. Any unknown name is the cover.
 */
export function stageShot(name, world) {
  const scene = SCENES[name] ?? SCENES.cover;
  world.reset();
  let pebbleThrown = false;
  let lastDir = null;
  let waitSteps = 0;
  const steps = Math.round(scene.seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const state = world.state;
    if (state.won || state.over) break;
    const { dir, sneak } = autopilot(state, scene.risk, lastDir, waitSteps);
    lastDir = dir;
    waitSteps = dir.x === 0 && dir.y === 0 ? waitSteps + 1 : 0;
    let throwAt = null;
    if (scene.pebbleAt !== null && !pebbleThrown && state.elapsed >= scene.pebbleAt) {
      pebbleThrown = true;
      // Lure the nearest guard away from the thief: throw past it, away from us.
      let nearest = null;
      let nearestDist = Infinity;
      for (const g of state.guards) {
        const d = Math.hypot(g.x - state.player.x, g.y - state.player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = g;
        }
      }
      if (nearest !== null) {
        const dx = nearest.x - state.player.x;
        const dy = nearest.y - state.player.y;
        const len = Math.hypot(dx, dy) || 1;
        throwAt = { x: nearest.x + (dx / len) * 130, y: nearest.y + (dy / len) * 130 };
      }
    }
    const events = world.step(STEP, dir, sneak, throwAt, false);
    if (events & EVENT_WIN) break;
  }
  const state = world.state;
  const screen = state.won ? SCREEN_WIN : state.over ? SCREEN_OVER : SCREEN_PLAY;
  return { screen, best: 0 };
}
