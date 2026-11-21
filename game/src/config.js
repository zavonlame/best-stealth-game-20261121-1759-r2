// Every tuning number, colour and the museum floor plan in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. Shadow Gallery: one floor, three wings, eight guards.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 12,
  walkSpeed: 205,
  sneakSpeed: 118,
  /** Seconds a thrown pebble needs before another can be thrown. */
  pebbleCooldown: 0.8,
  pebbles: 5,
};

export const NERVES = 3;

export const GUARD = {
  radius: 14,
  patrolSpeed: 68,
  investigateSpeed: 108,
  /** How far a guard sees, in pixels. */
  sightRange: 235,
  /** Vision cone, full angle in radians. */
  sightAngle: (78 * Math.PI) / 180,
  /** How close a player must be before the guard senses them whatever the cone. */
  senseRange: 48,
};

export const DETECTION = {
  /** Detection (0..1) gained per second while seen at point-blank range. */
  closeRate: 1.5,
  /** Detection gained per second while seen at the edge of the cone. */
  farRate: 0.45,
  /** Multipliers on the rise rate. */
  walkMultiplier: 1.35,
  sneakMultiplier: 0.55,
  /** Detection lost per second while unseen. */
  decayRate: 0.75,
  /** Above this the guard stops and stares at the player. */
  suspiciousAt: 0.5,
  /** At this the player is caught. */
  caughtAt: 1,
  /** Proximity sense adds this per second inside GUARD.senseRange. */
  senseRate: 2.2,
};

export const PEBBLE = {
  /** How far away a guard hears a pebble land. */
  noiseRadius: 290,
  /** Seconds the landing ring stays visible. */
  ringSeconds: 1.2,
  /** Seconds a guard looks around at the noise point before going back. */
  lookSeconds: 2.6,
};

/** A solid rectangle: walls and display cases block movement and sight. */
const WALL = 24;
export const SOLIDS = [
  // Outer walls.
  { x: 0, y: 0, w: 1280, h: WALL },
  { x: 0, y: 696, w: 1280, h: WALL },
  { x: 0, y: 0, w: WALL, h: 720 },
  { x: 1256, y: 0, w: WALL, h: 720 },
  // Wing dividers: a door gap from y 276 to y 444 in each.
  { x: 420, y: 24, w: 24, h: 252 },
  { x: 420, y: 444, w: 24, h: 252 },
  { x: 860, y: 24, w: 24, h: 252 },
  { x: 860, y: 444, w: 24, h: 252 },
  // West wing display cases and statue.
  { x: 90, y: 120, w: 76, h: 46 },
  { x: 280, y: 120, w: 76, h: 46 },
  { x: 90, y: 480, w: 76, h: 46 },
  { x: 280, y: 480, w: 76, h: 46 },
  { x: 300, y: 640, w: 40, h: 40 },
  // Central wing display cases and statue.
  { x: 500, y: 110, w: 76, h: 46 },
  { x: 700, y: 110, w: 76, h: 46 },
  { x: 500, y: 560, w: 76, h: 46 },
  { x: 700, y: 560, w: 76, h: 46 },
  { x: 800, y: 640, w: 44, h: 44 },
  // East wing display cases and statue.
  { x: 930, y: 110, w: 76, h: 46 },
  { x: 1120, y: 110, w: 76, h: 46 },
  { x: 930, y: 560, w: 76, h: 46 },
  { x: 1120, y: 560, w: 76, h: 46 },
  { x: 1180, y: 640, w: 44, h: 44 },
];

/** Dark pools where a guard's cone cannot spot the player. */
export const SHADOWS = [
  { x: 56, y: 210, w: 110, h: 70 },
  { x: 290, y: 210, w: 110, h: 70 },
  { x: 56, y: 590, w: 130, h: 70 },
  { x: 470, y: 310, w: 100, h: 70 },
  { x: 740, y: 310, w: 100, h: 70 },
  { x: 470, y: 620, w: 130, h: 60 },
  { x: 900, y: 210, w: 110, h: 70 },
  { x: 1140, y: 310, w: 100, h: 70 },
  { x: 1150, y: 80, w: 80, h: 60 },
];

/** The six exhibits to steal, two per wing. Pedestals never block movement. */
export const EXHIBITS = [
  { x: 120, y: 210, name: 'Amber Idol', wing: 0 },
  { x: 340, y: 560, name: 'Jade Mask', wing: 0 },
  { x: 810, y: 160, name: 'Moon Pearl', wing: 1 },
  { x: 640, y: 640, name: 'Ivory Owl', wing: 1 },
  { x: 1020, y: 185, name: 'Sun Disk', wing: 2 },
  { x: 980, y: 640, name: 'Obsidian Cat', wing: 2 },
];

/** Where a caught player wakes up, one per wing. */
export const RESPAWNS = [
  { x: 222, y: 640 },
  { x: 640, y: 640 },
  { x: 1072, y: 640 },
];

/** The exit door: step in with all six exhibits to win. */
export const EXIT = { x: 1150, y: 30, w: 90, h: 50 };

export const ENTRANCE = { x: 222, y: 640 };

export const WINGS = ['Relic Hall', 'Portrait Gallery', 'The Vault'];

/** Guard patrols: waypoints in field coordinates and a patrol speed. */
export const GUARDS = [
  { waypoints: [{ x: 80, y: 300 }, { x: 360, y: 300 }, { x: 360, y: 420 }, { x: 80, y: 420 }], speed: 66 },
  { waypoints: [{ x: 222, y: 90 }, { x: 222, y: 620 }], speed: 72 },
  { waypoints: [{ x: 480, y: 200 }, { x: 820, y: 200 }, { x: 820, y: 520 }, { x: 480, y: 520 }], speed: 70 },
  { waypoints: [{ x: 652, y: 90 }, { x: 652, y: 630 }], speed: 76 },
  { waypoints: [{ x: 480, y: 360 }, { x: 820, y: 360 }], speed: 64 },
  { waypoints: [{ x: 920, y: 200 }, { x: 1220, y: 200 }, { x: 1220, y: 520 }, { x: 920, y: 520 }], speed: 70 },
  { waypoints: [{ x: 1072, y: 90 }, { x: 1072, y: 630 }], speed: 78 },
  { waypoints: [{ x: 920, y: 360 }, { x: 1220, y: 360 }], speed: 64 },
];

export const PALETTE = {
  backdrop: '#0d0b09',
  floor: '#2b2118',
  floorLine: '#241b13',
  rug: '#571f26',
  rugEdge: '#7a2f38',
  wall: '#161009',
  wallEdge: '#3a2c1c',
  caseBody: '#33505f',
  caseGlass: '#8fc3e8',
  statue: '#8a7f6a',
  shadow: 'rgba(10, 14, 34, 0.62)',
  shadowEdge: 'rgba(120, 150, 220, 0.20)',
  player: '#35d0ba',
  playerDark: '#1e8a7c',
  guard: '#e5534b',
  guardRing: '#ffd9d4',
  cone: 'rgba(242, 201, 76, 0.16)',
  coneEdge: 'rgba(242, 201, 76, 0.35)',
  coneSuspicious: 'rgba(230, 126, 34, 0.30)',
  coneAlert: 'rgba(229, 83, 75, 0.30)',
  exhibit: '#f2c94c',
  exhibitGlow: 'rgba(242, 201, 76, 0.35)',
  exit: '#58c96b',
  exitGlow: 'rgba(88, 201, 107, 0.30)',
  pebble: '#c9c9c9',
  pebbleRing: 'rgba(242, 201, 76, 0.8)',
  panel: '#171310',
  panelEdge: '#3a2c1c',
  text: '#f2ead9',
  muted: '#a89a80',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best getaway time is kept between visits (this browser only). */
export const BEST_KEY = 'shadow-gallery.best-seconds';
