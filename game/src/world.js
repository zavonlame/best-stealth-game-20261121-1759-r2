// The stealth rules and state, with no drawing and no browser in it: the player, the
// guards and their vision cones, shadows that hide, pebbles that distract, the six
// exhibits and the exit. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import {
  DETECTION, ENTRANCE, EXHIBITS, EXIT, FIELD, GUARD, GUARDS, NERVES,
  PEBBLE, PLAYER, RESPAWNS, SHADOWS, SOLIDS, WINGS,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_PEBBLE = 8;
export const EVENT_SPOTTED = 16;

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';

/** True when the point is inside a shadow pool (the guard's cone cannot spot it). */
export function inShadow(x, y) {
  for (const s of SHADOWS) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

function circleHitsSolid(x, y, radius) {
  for (const s of SOLIDS) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** Move a circle by (dx, dy) with axis separation, so it slides along walls. */
function moveCircle(body, dx, dy, radius) {
  const nx = body.x + dx;
  if (!circleHitsSolid(nx, body.y, radius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolid(body.x, ny, radius)) body.y = ny;
}

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function lineOfSightClear(x1, y1, x2, y2) {
  for (const s of SOLIDS) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

/** True when a circle of `radius` at (x, y) would touch a solid. */
export function pointBlocked(x, y, radius) {
  return circleHitsSolid(x, y, radius);
}

/** How strongly a guard sees a bare point (x, y): 0 when unseen, up to 1 point-blank. */
export function seesPoint(guard, x, y) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.sightRange) return 0;
  if (inShadow(x, y)) return 0;
  let angle = Math.atan2(dy, dx) - guard.facing;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  if (Math.abs(angle) > GUARD.sightAngle / 2) return 0;
  if (!lineOfSightClear(guard.x, guard.y, x, y)) return 0;
  return 1 - dist / GUARD.sightRange;
}

/** How strongly a guard sees the player right now: 0 when unseen, up to 1 point-blank. */
export function guardSees(guard, player) {
  return seesPoint(guard, player.x, player.y);
}

export function createWorld(random) {
  const player = {
    x: ENTRANCE.x, y: ENTRANCE.y, facing: -Math.PI / 2,
    sneaking: false, moving: false, pebbleCooldown: 0,
  };
  const guards = GUARDS.map((def) => ({
    x: def.waypoints[0].x, y: def.waypoints[0].y,
    waypoints: def.waypoints, speed: def.speed,
    waypoint: 1, facing: 0, state: GUARD_PATROL,
    lookTimer: 0, stuckTimer: 0, lastX: def.waypoints[0].x, lastY: def.waypoints[0].y,
    investigateX: 0, investigateY: 0, stepPhase: random() * Math.PI * 2,
  }));
  const exhibits = EXHIBITS.map((e) => ({ ...e, taken: false }));
  const pebbles = [];
  const state = {
    player, guards, exhibits, pebbles,
    nerves: NERVES, pebblesLeft: PLAYER.pebbles, detection: 0,
    collected: 0, elapsed: 0, caught: 0, pebblesThrown: 0,
    won: false, over: false, hidden: false, spotted: false,
    wing: 0, exitOpen: false, message: '', messageTimer: 0,
  };

  function reset() {
    player.x = ENTRANCE.x;
    player.y = ENTRANCE.y;
    player.facing = -Math.PI / 2;
    player.pebbleCooldown = 0;
    for (const g of guards) {
      g.x = g.waypoints[0].x;
      g.y = g.waypoints[0].y;
      g.waypoint = 1;
      g.facing = 0;
      g.state = GUARD_PATROL;
      g.lookTimer = 0;
      g.stuckTimer = 0;
    }
    for (const e of exhibits) e.taken = false;
    state.pebbles.length = 0;
    state.nerves = NERVES;
    state.pebblesLeft = PLAYER.pebbles;
    state.detection = 0;
    state.collected = 0;
    state.elapsed = 0;
    state.caught = 0;
    state.pebblesThrown = 0;
    state.won = false;
    state.over = false;
    state.wing = 0;
    state.exitOpen = false;
    state.message = '';
    state.messageTimer = 0;
  }

  function wingOf(x) {
    return x < 432 ? 0 : x < 872 ? 1 : 2;
  }

  function respawn() {
    const spawn = RESPAWNS[state.wing];
    player.x = spawn.x;
    player.y = spawn.y;
    player.facing = -Math.PI / 2;
    state.detection = 0;
    for (const g of guards) {
      g.x = g.waypoints[0].x;
      g.y = g.waypoints[0].y;
      g.waypoint = 1;
      g.state = GUARD_PATROL;
      g.lookTimer = 0;
    }
  }

  /** Throw a pebble toward a field point; returns false when none are left or on cooldown. */
  function throwPebble(tx, ty) {
    if (state.pebblesLeft <= 0 || player.pebbleCooldown > 0 || state.won || state.over) return false;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(dist, 320);
    const px = player.x + (dx / dist) * reach;
    const py = player.y + (dy / dist) * reach;
    pebbles.push({ x: px, y: py, age: 0 });
    state.pebblesLeft -= 1;
    state.pebblesThrown += 1;
    player.pebbleCooldown = PLAYER.pebbleCooldown;
    for (const g of guards) {
      if (Math.hypot(g.x - px, g.y - py) <= PEBBLE.noiseRadius && g.state !== GUARD_INVESTIGATE) {
        g.state = GUARD_INVESTIGATE;
        g.investigateX = px;
        g.investigateY = py;
        g.lookTimer = 0;
        g.stuckTimer = 0;
      }
    }
    return true;
  }

  function stepGuard(g, dt) {
    // Walk toward a target point; returns true when it arrives.
    function walkTo(tx, ty, speed) {
      const dx = tx - g.x;
      const dy = ty - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) return true;
      const step = Math.min(dist, speed * dt);
      g.facing = Math.atan2(dy, dx);
      moveCircle(g, (dx / dist) * step, (dy / dist) * step, GUARD.radius);
      return false;
    }
    if (g.state === GUARD_INVESTIGATE) {
      const arrived = walkTo(g.investigateX, g.investigateY, GUARD.investigateSpeed);
      if (arrived) {
        g.lookTimer += dt;
        // Scan the room while looking: slow turn.
        g.facing += dt * 1.4;
        if (g.lookTimer >= PEBBLE.lookSeconds) {
          g.state = GUARD_PATROL;
          g.lookTimer = 0;
        }
      } else {
        // Stuck against a case: give up and go back to patrol.
        if (Math.hypot(g.x - g.lastX, g.y - g.lastY) < 0.5) {
          g.stuckTimer += dt;
          if (g.stuckTimer > 1) {
            g.state = GUARD_PATROL;
            g.stuckTimer = 0;
          }
        } else {
          g.stuckTimer = 0;
        }
        g.lastX = g.x;
        g.lastY = g.y;
      }
      return;
    }
    if (g.state === GUARD_SUSPICIOUS) {
      // Stand and stare at the player for a beat, then resume the patrol.
      g.lookTimer += dt;
      if (g.lookTimer > 1.1) {
        g.state = GUARD_PATROL;
        g.lookTimer = 0;
      }
      return;
    }
    const target = g.waypoints[g.waypoint];
    if (walkTo(target.x, target.y, g.speed)) {
      g.waypoint = (g.waypoint + 1) % g.waypoints.length;
    }
  }

  /**
   * One fixed step. `move` is {x, y} (each -1..1, already normalised), `sneak` holds
   * Shift, `throwAt` is a field point to throw a pebble at, or null. With `harmless`
   * set (the title screen's backdrop) the guards patrol and nothing is spotted.
   */
  function step(dt, move, sneak, throwAt, harmless) {
    let events = 0;
    if (state.won || state.over) return events;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (player.pebbleCooldown > 0) player.pebbleCooldown -= dt;

    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const mag = Math.hypot(move.x, move.y);
    player.moving = mag > 0.01;
    player.sneaking = sneak && player.moving;
    if (player.moving) {
      const nx = move.x / (mag || 1);
      const ny = move.y / (mag || 1);
      player.facing = Math.atan2(ny, nx);
      moveCircle(player, nx * speed * dt, ny * speed * dt, PLAYER.radius);
    }
    if (throwAt !== null && throwPebble(throwAt.x, throwAt.y)) events |= EVENT_PEBBLE;

    state.wing = wingOf(player.x);
    state.hidden = inShadow(player.x, player.y);

    // Pick up exhibits by touch.
    for (const e of exhibits) {
      if (!e.taken && Math.hypot(player.x - e.x, player.y - e.y) < PLAYER.radius + 26) {
        e.taken = true;
        state.collected += 1;
        events |= EVENT_PICKUP;
        if (state.collected === exhibits.length) {
          state.exitOpen = true;
          state.message = 'All exhibits stolen — reach the EXIT!';
          state.messageTimer = 4;
        }
      }
    }

    // The exit opens only once every exhibit is taken.
    if (
      state.exitOpen &&
      player.x > EXIT.x && player.x < EXIT.x + EXIT.w &&
      player.y > EXIT.y && player.y < EXIT.y + EXIT.h
    ) {
      state.won = true;
      return events | EVENT_WIN;
    }
    if (
      !state.exitOpen &&
      player.x > EXIT.x - 10 && player.x < EXIT.x + EXIT.w + 10 &&
      player.y > EXIT.y - 10 && player.y < EXIT.y + EXIT.h + 10 &&
      state.messageTimer <= 0
    ) {
      state.message = `Locked — ${exhibits.length - state.collected} exhibit(s) left`;
      state.messageTimer = 2.5;
    }

    // Guards see, suspect and chase. Detection rises once per step from the
    // strongest view of the player, and falls once per step while unseen.
    let strongest = 0;
    let anyNear = false;
    for (const g of guards) {
      if (!harmless) {
        const seen = guardSees(g, player);
        strongest = Math.max(strongest, seen);
        if (Math.hypot(player.x - g.x, player.y - g.y) < GUARD.senseRange) anyNear = true;
        if (g.state === GUARD_SUSPICIOUS) {
          g.facing = Math.atan2(player.y - g.y, player.x - g.x);
        }
      }
      stepGuard(g, dt);
      // Footstep phase for the sound: one tick per stride.
      g.stepPhase += dt * (g.state === GUARD_INVESTIGATE ? 3.4 : 2.6);
    }
    if (!harmless) {
      if (strongest > 0) {
        const rate = DETECTION.farRate + (DETECTION.closeRate - DETECTION.farRate) * strongest;
        const mult = player.sneaking ? DETECTION.sneakMultiplier : DETECTION.walkMultiplier;
        state.detection += rate * mult * dt;
      } else if (anyNear) {
        state.detection += DETECTION.senseRate * dt;
      } else {
        state.detection = Math.max(0, state.detection - DETECTION.decayRate * dt);
      }
      if (state.detection >= DETECTION.suspiciousAt) {
        for (const g of guards) {
          if (g.state === GUARD_PATROL && guardSees(g, player) > 0) {
            g.state = GUARD_SUSPICIOUS;
            g.lookTimer = 0;
            g.facing = Math.atan2(player.y - g.y, player.x - g.x);
          }
        }
      }
    }
    state.spotted = strongest > 0;
    if (state.detection >= DETECTION.suspiciousAt && strongest > 0) events |= EVENT_SPOTTED;

    // Pebble rings fade.
    for (let i = pebbles.length - 1; i >= 0; i -= 1) {
      pebbles[i].age += dt;
      if (pebbles[i].age > PEBBLE.ringSeconds) pebbles.splice(i, 1);
    }

    // Caught: lose a nerve and wake up at the wing entrance.
    if (!harmless && state.detection >= DETECTION.caughtAt) {
      state.nerves -= 1;
      state.caught += 1;
      events |= EVENT_CAUGHT;
      if (state.nerves <= 0) {
        state.over = true;
      } else {
        respawn();
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, throwPebble, wingName: () => WINGS[state.wing] };
}
