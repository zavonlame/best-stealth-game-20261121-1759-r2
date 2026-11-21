// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Flat shapes and canvas text: a wooden museum floor, dark shadow
// pools, glass display cases, guards with lit vision cones, and the thief in teal.

import { DETECTION, EXHIBITS, EXIT, FIELD, FONT, GUARD, GUARDS, NERVES, PALETTE, PEBBLE, PLAYER, SHADOWS, SOLIDS, WINGS } from './config.js';
import { GUARD_INVESTIGATE, GUARD_SUSPICIOUS, inShadow } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 64 };
const WING_NAMES = WINGS;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const timerLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.ratio = ratio;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Wooden planks.
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 2;
    for (let y = 48; y < FIELD.height; y += 48) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // One deep-red rug per wing.
    const rugs = [
      { x: 56, y: 300, w: 320, h: 130 },
      { x: 480, y: 300, w: 340, h: 130 },
      { x: 896, y: 300, w: 320, h: 130 },
    ];
    for (const rug of rugs) {
      context.fillStyle = PALETTE.rug;
      context.fillRect(rug.x, rug.y, rug.w, rug.h);
      context.strokeStyle = PALETTE.rugEdge;
      context.lineWidth = 4;
      context.strokeRect(rug.x + 6, rug.y + 6, rug.w - 12, rug.h - 12);
    }
  }

  function drawWalls() {
    for (const s of SOLIDS) {
      // Outer walls and dividers share the list; cases are drawn later.
      if (s.w >= 1280 || s.h >= 720 || s.x === 0 || s.x === 1256 || s.x === 420 || s.x === 860) {
        context.fillStyle = PALETTE.wall;
        context.fillRect(s.x, s.y, s.w, s.h);
        context.fillStyle = PALETTE.wallEdge;
        if (s.h <= 24) context.fillRect(s.x, s.y + s.h - 4, s.w, 4);
        else if (s.w <= 24) context.fillRect(s.x, s.y, 4, s.h);
      }
    }
  }

  function drawShadows() {
    for (const s of SHADOWS) {
      context.fillStyle = PALETTE.shadowEdge;
      roundRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12, 18);
      context.fill();
      context.fillStyle = PALETTE.shadow;
      roundRect(s.x, s.y, s.w, s.h, 14);
      context.fill();
    }
  }

  function drawExit(state) {
    const open = state.exitOpen;
    context.fillStyle = open ? PALETTE.exitGlow : 'rgba(88, 201, 107, 0.12)';
    roundRect(EXIT.x - 8, EXIT.y - 8, EXIT.w + 16, EXIT.h + 16, 10);
    context.fill();
    context.fillStyle = open ? PALETTE.exit : '#2c5a35';
    context.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    context.strokeStyle = open ? '#b8f0c2' : '#4a7a52';
    context.lineWidth = 3;
    context.strokeRect(EXIT.x + 2, EXIT.y + 2, EXIT.w - 4, EXIT.h - 4);
    text('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 7, 22, open ? '#0d2b12' : '#9fc7a8', 'center');
  }

  function drawExhibits(state) {
    for (const e of state.exhibits) {
      // Pedestal.
      context.fillStyle = '#4a3b28';
      context.fillRect(e.x - 15, e.y - 15, 30, 30);
      context.strokeStyle = '#6b5636';
      context.lineWidth = 2;
      context.strokeRect(e.x - 15, e.y - 15, 30, 30);
      if (e.taken) continue;
      // Glow, then the gold diamond.
      const pulse = 0.25 + 0.1 * Math.sin(state.elapsed * 3 + e.x);
      context.fillStyle = `rgba(242, 201, 76, ${pulse})`;
      context.beginPath();
      context.arc(e.x, e.y, 24, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.exhibit;
      context.beginPath();
      context.moveTo(e.x, e.y - 11);
      context.lineTo(e.x + 9, e.y);
      context.lineTo(e.x, e.y + 11);
      context.lineTo(e.x - 9, e.y);
      context.closePath();
      context.fill();
    }
  }

  function drawCases() {
    for (const s of SOLIDS) {
      // Cases and statues only: walls were drawn already.
      if (s.w >= 1280 || s.h >= 720 || s.x === 0 || s.x === 1256 || s.x === 420 || s.x === 860) continue;
      const isStatue = s.w <= 44 && s.h <= 44;
      if (isStatue) {
        context.fillStyle = PALETTE.statue;
        context.beginPath();
        context.arc(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#a89a7c';
        context.beginPath();
        context.arc(s.x + s.w / 2, s.y + s.h / 2, s.w / 4, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = PALETTE.caseBody;
        context.fillRect(s.x, s.y, s.w, s.h);
        context.fillStyle = PALETTE.caseGlass;
        context.globalAlpha = 0.5;
        context.fillRect(s.x + 4, s.y + 4, s.w - 8, 10);
        context.globalAlpha = 1;
        context.strokeStyle = '#22384a';
        context.lineWidth = 2;
        context.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      }
    }
  }

  function drawPebbles(state) {
    for (const p of state.pebbles) {
      const t = p.age / PEBBLE.ringSeconds;
      context.strokeStyle = PALETTE.pebbleRing;
      context.globalAlpha = 1 - t;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(p.x, p.y, 8 + t * 34, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = PALETTE.pebble;
      context.beginPath();
      context.arc(p.x, p.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** Distance from (x, y) along the unit direction to the nearest solid, capped at maxDist. */
  function rayDistance(x, y, dx, dy, maxDist) {
    let best = maxDist;
    for (const s of SOLIDS) {
      let tmin = 0;
      let tmax = best;
      if (dx === 0) {
        if (x < s.x || x > s.x + s.w) continue;
      } else {
        let t1 = (s.x - x) / dx;
        let t2 = (s.x + s.w - x) / dx;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (dy === 0) {
        if (y < s.y || y > s.y + s.h) continue;
      } else {
        let t1 = (s.y - y) / dy;
        let t2 = (s.y + s.h - y) / dy;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin < best) best = tmin;
    }
    return best;
  }

  /** A guard's vision cone, clipped by walls and cases so it stops where sight stops. */
  function drawGuardCone(g, state) {
    const alert = g.state === GUARD_SUSPICIOUS || state.detection >= DETECTION.caughtAt;
    const fill = g.state === GUARD_INVESTIGATE
      ? PALETTE.coneSuspicious
      : alert ? PALETTE.coneAlert : PALETTE.cone;
    const steps = 20;
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const a = g.facing - GUARD.sightAngle / 2 + (GUARD.sightAngle * i) / steps;
      const d = rayDistance(g.x, g.y, Math.cos(a), Math.sin(a), GUARD.sightRange);
      points.push({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d });
    }
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(g.x, g.y);
    for (const p of points) context.lineTo(p.x, p.y);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.coneEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.stroke();
  }

  function drawGuards(state) {
    // Faint dotted patrol routes, so a player can learn them.
    context.strokeStyle = 'rgba(242, 234, 217, 0.10)';
    context.lineWidth = 2;
    context.setLineDash([2, 10]);
    for (const def of GUARDS) {
      context.beginPath();
      def.waypoints.forEach((w, i) => {
        if (i === 0) context.moveTo(w.x, w.y);
        else context.lineTo(w.x, w.y);
      });
      context.closePath();
      context.stroke();
    }
    context.setLineDash([]);
    for (const g of state.guards) drawGuardCone(g, state);
    for (const g of state.guards) {
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardRing;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      context.stroke();
      // Facing tick.
      context.strokeStyle = PALETTE.guardRing;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.facing) * (GUARD.radius + 7), g.y + Math.sin(g.facing) * (GUARD.radius + 7));
      context.stroke();
      if (g.state === GUARD_SUSPICIOUS || g.state === GUARD_INVESTIGATE) {
        text(g.state === GUARD_SUSPICIOUS ? '!' : '?', g.x, g.y - GUARD.radius - 8, 24, '#ffb020', 'center');
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    const hidden = inShadow(p.x, p.y);
    // Cloak: a teardrop pointing where the thief faces.
    context.fillStyle = hidden ? PALETTE.playerDark : PALETTE.player;
    context.beginPath();
    context.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(p.x + Math.cos(p.facing) * (PLAYER.radius + 9), p.y + Math.sin(p.facing) * (PLAYER.radius + 9));
    context.lineTo(p.x + Math.cos(p.facing + 2.5) * PLAYER.radius, p.y + Math.sin(p.facing + 2.5) * PLAYER.radius);
    context.lineTo(p.x + Math.cos(p.facing - 2.5) * PLAYER.radius, p.y + Math.sin(p.facing - 2.5) * PLAYER.radius);
    context.closePath();
    context.fill();
    context.fillStyle = '#0d2b26';
    context.beginPath();
    context.arc(p.x, p.y, 5, 0, Math.PI * 2);
    context.fill();
    if (hidden) {
      text('HIDDEN', p.x, p.y - PLAYER.radius - 10, 15, '#9db8e8', 'center');
    }
    // Detection ring over the thief.
    if (state.detection > 0.03) {
      context.strokeStyle = 'rgba(229, 83, 75, 0.9)';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(p.x, p.y, PLAYER.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.detection);
      context.stroke();
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    // Exhibits: six diamonds, gold when stolen.
    for (let i = 0; i < EXHIBITS.length; i += 1) {
      const x = 28 + i * 30;
      const y = 34;
      context.fillStyle = state.exhibits[i].taken ? PALETTE.exhibit : 'rgba(242, 234, 217, 0.25)';
      context.beginPath();
      context.moveTo(x, y - 8);
      context.lineTo(x + 7, y);
      context.lineTo(x, y + 8);
      context.lineTo(x - 7, y);
      context.closePath();
      context.fill();
    }
    text(`${state.collected}/6`, 28 + 6 * 30 + 6, 24, 24, PALETTE.text, 'left');
    text(WING_NAMES[state.wing], FIELD.width / 2, 22, 26, PALETTE.text, 'center');
    // Nerves (hearts) and pebbles, top right.
    for (let i = 0; i < NERVES; i += 1) {
      context.fillStyle = i < state.nerves ? PALETTE.danger : 'rgba(242, 234, 217, 0.2)';
      context.beginPath();
      context.arc(FIELD.width - 30 - i * 30, 34, 9, 0, Math.PI * 2);
      context.fill();
    }
    text(`Pebbles ${state.pebblesLeft}`, FIELD.width - 30 - NERVES * 30 - 14, 24, 24, PALETTE.text, 'right');
    text(timerLabel(formatTime(state.elapsed)), FIELD.width - 30 - NERVES * 30 - 14, 52, 18, PALETTE.muted, 'right');
    // Detection bar, under the wing name, only while it matters.
    if (state.detection > 0.03) {
      const w = 220;
      const x = FIELD.width / 2 - w / 2;
      context.fillStyle = 'rgba(13, 11, 9, 0.7)';
      context.fillRect(x - 4, 56, w + 8, 18);
      context.fillStyle = state.detection >= 0.5 ? PALETTE.danger : '#e8a33d';
      context.fillRect(x, 59, w * Math.min(1, state.detection), 12);
      text(state.detection >= 0.5 ? 'SPOTTED!' : 'SEEN', FIELD.width / 2, 78, 16, '#ffb0a8', 'center');
    }
    if (state.messageTimer > 0) {
      text(state.message, FIELD.width / 2, FIELD.height - 34, 22, PALETTE.exhibit, 'center');
    }
    context.textBaseline = 'alphabetic';
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(13, 11, 9, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, height - 2);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 44, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 34, 22, PALETTE.exhibit, 'center');
  }

  const TITLE_LINES = [
    'The Marrow Museum — one night, six exhibits, eight guards.',
    'Stay out of the yellow cones. Dark pools hide you.',
    'Move with WASD or arrows. Hold Shift to sneak.',
    'Throw a pebble with E or a click to lure a guard away.',
    '',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const WIN_LINES = ['', '', ''];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the museum, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawWalls();
    drawShadows();
    drawExit(state);
    drawExhibits(state);
    drawCases();
    drawPebbles(state);
    drawGuards(state);
    drawPlayer(state);
    if (screen === SCREEN_TITLE) {
      if (best > 0) TITLE_LINES[4] = `Best getaway ${formatTime(best)}.`;
      else TITLE_LINES[4] = '';
      drawPanel('SHADOW GALLERY', TITLE_LINES, 'Press Space or click to begin');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = `Time ${formatTime(state.elapsed)} — caught ${state.caught} time${state.caught === 1 ? '' : 's'}`;
      WIN_LINES[1] = `Pebbles thrown ${state.pebblesThrown} — ${state.collected} exhibits`;
      WIN_LINES[2] = best === 0 || state.elapsed <= best ? 'A new best getaway!' : `Best getaway ${formatTime(best)}.`;
      drawPanel('CLEAN GETAWAY', WIN_LINES, 'Press Space or click to play again');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = `${state.collected} of 6 exhibits stolen`;
      OVER_LINES[1] = `The museum keeps its secrets this time.`;
      drawPanel('CAUGHT FOR GOOD', OVER_LINES, 'Press Space or click to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    formatTime,
    /** A pointer's CSS-pixel position, in field coordinates. */
    toField(x, y) {
      return { x: (x * view.ratio - view.x) / view.scale, y: (y * view.ratio - view.y) / view.scale };
    },
  };
}
