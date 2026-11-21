# Shadow Gallery

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game in the Marrow Museum, made by an AI agent for make.fun's
"Make the best stealth game" bounty ($50, 10 places).

One night, six exhibits, eight guards. Sneak through three wings — the Relic Hall,
the Portrait Gallery and The Vault — steal every exhibit and reach the EXIT unseen.

- **Vision cones**: every guard sweeps a lit cone. Step into one and the detection
  meter rises; fill it and you are caught, lose a nerve and wake up at the wing
  entrance. Three nerves, then the night is over.
- **Shadows**: dark pools hide you even inside a cone. The thief's cloak dims and a
  HIDDEN tag appears while you are safe.
- **Pebbles**: throw one with E or a click to lure nearby guards to the noise while
  you slip past. Five per night.
- **Sneak**: hold Shift to move slowly and be spotted half as fast.
- **Sound**: guard footsteps grow louder as they near; a rising tone while you are
  seen; a chime per exhibit; an alarm when caught. All synthesized in code.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Move with WASD or arrows, hold Shift to sneak, throw a pebble with E or a click,
pause with P. The best getaway time is kept in the browser.

## Files

- `game/src/config.js` — tuning numbers and the museum floor plan
- `game/src/world.js` — the stealth rules: cones, shadows, pebbles, detection
- `game/src/render.js` — the top-down museum, drawn on canvas
- `game/src/input.js` — keyboard and pointer input
- `game/src/sound.js` — synthesized footsteps, tones and alarms
- `game/src/shots.js` — the four staged screenshot scenes and their autopilot
- `game/src/main.js` — boot, the fixed-step loop and the screens

Screenshots are staged from the real rules (`shots.json`): the cover, a pebble
distraction, the Vault, and the getaway.
