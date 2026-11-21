// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, clean getaway and
// caught for good. A click throws a pebble at that point; E throws one where the thief
// faces. Guard footsteps, the seen-tone and the alarm are synthesized in sound.js.
//
// ?seed=N fixes the guard patrols' phase. ?shot=cover|pebble|vault|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_PICKUP, EVENT_PEBBLE, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_THROW, createInput } from './input.js';
import { createSound } from './sound.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** How far away a guard's footsteps can be heard, in pixels. */
const HEAR_RANGE = 340;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastSpottedAt = 0;
  let pendingThrow = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal all six exhibits, then reach the exit unseen.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (won) {
      if (best === 0 || world.state.elapsed < best) {
        best = world.state.elapsed;
        saveBest(best);
      }
      sound.win();
      announce(`Clean getaway in ${renderer.formatTime(world.state.elapsed)}.`);
    } else {
      announce(`Caught for good. ${world.state.collected} of 6 exhibits stolen.`);
    }
  }

  function handleActions() {
    const wasPlaying = screen === SCREEN_PLAY;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      sound.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // A click or E while playing throws a pebble at the pointer; the click that
    // starts the game never throws, because the screen was not playing yet.
    if (actions & ACTION_THROW && wasPlaying) {
      pendingThrow = input.pointer();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, null, true);
      return;
    }
    const move = input.move();
    const sneak = input.sneaking();
    const throwAt = pendingThrow;
    pendingThrow = null;
    const events = world.step(STEP, move, sneak, throwAt, false);
    if (events & EVENT_PICKUP) sound.pickup();
    if (events & EVENT_PEBBLE) sound.pebble();
    if (events & EVENT_CAUGHT) {
      sound.caught();
      announce(world.state.nerves === 1 ? 'Caught! 1 nerve left.' : `Caught! ${world.state.nerves} nerves left.`);
    }
    if (events & EVENT_SPOTTED) {
      const now = performance.now();
      if (now - lastSpottedAt > 350) {
        lastSpottedAt = now;
        sound.spotted(world.state.detection);
      }
    }
    if (events & EVENT_WIN) endGame(true);
    else if (world.state.over) endGame(false);
    // Footsteps: the nearest patrolling guard, louder the closer it is.
    let nearest = null;
    let nearestDist = Infinity;
    for (const g of world.state.guards) {
      const d = Math.hypot(g.x - world.state.player.x, g.y - world.state.player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = g;
      }
    }
    if (nearest !== null && nearestDist < HEAR_RANGE) {
      sound.footstep(1 - nearestDist / HEAR_RANGE);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting a guard spot the thief unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Shadow Gallery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
