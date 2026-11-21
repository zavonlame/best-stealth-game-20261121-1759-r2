// Keyboard and pointer input. Held keys give a steering vector; one-shot presses
// (start or restart, pause, throw) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. The
// pointer's field position is kept for click-to-throw pebbles.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_THROW = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const THROW = new Set(['KeyE', 'KeyQ']);

export function createInput(target, toField) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let sneak = false;
  let actions = 0;
  let pointer = { x: 0, y: 0 };
  let pointerDown = false;

  function trackPointer(event) {
    const rect = target.getBoundingClientRect();
    pointer = toField(event.clientX - rect.left, event.clientY - rect.top);
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (SNEAK.has(event.code)) sneak = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (THROW.has(event.code)) {
      if (!event.repeat) actions |= ACTION_THROW;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (SNEAK.has(event.code)) sneak = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    sneak = false;
  });
  target.addEventListener('pointermove', trackPointer);
  target.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    pointerDown = true;
    actions |= ACTION_CONFIRM | ACTION_THROW;
  });
  target.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  return {
    /** Steering vector, each component -1, 0 or 1. */
    move() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    sneaking() {
      return sneak;
    },
    /** The pointer's position in field coordinates. */
    pointer() {
      return pointer;
    },
    /** True while the pointer button is held. */
    pointerHeld() {
      return pointerDown;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
