// Trapped in Vim :: :wq!
// Level geometry, coin/enemy/portal/exit placement.
//
// This is the file to touch when adding a new level or tweaking an existing
// one's layout -- ground segments, platforms, coin positions, portals and
// exits are all plain data here, consumed by GameplayScene (see
// js/scenes/gameplay.js).

import { GROUND, SceneState } from './constants.js';

export const LEVELS = {
  level1: {
    background: 'bg_level_1',
    spawn: { x: 100, y: GROUND.y },
    worldWidth: 7200,
    // Eight ground segments with gaps at each zone boundary -- jumpable without
    // the jetpack (which isn't unlocked until the secret room in level2). Zones
    // 5-8 repeat the zone 1-4 layout, offset +3700px, for a full second pass.
    ground: [
      { x: 0, y: 414, width: 760, height: 36 },
      { x: 860, y: 414, width: 760, height: 36 },
      { x: 1720, y: 414, width: 760, height: 36 },
      { x: 2600, y: 414, width: 1000, height: 36 },
      { x: 3700, y: 414, width: 760, height: 36 },
      { x: 4560, y: 414, width: 760, height: 36 },
      { x: 5420, y: 414, width: 760, height: 36 },
      { x: 6300, y: 414, width: 900, height: 36 },
    ],
    platforms: [
      // Zone 1 (0-900): low, gentle introduction.
      { x: 150, y: 350, width: 140, height: 16, dropThrough: true },
      { x: 380, y: 300, width: 130, height: 16, dropThrough: true },
      { x: 600, y: 340, width: 120, height: 16, dropThrough: true },
      // Zone 2 (900-1800): mid-height, more vertical movement.
      { x: 950, y: 300, width: 130, height: 16, dropThrough: true },
      { x: 1150, y: 230, width: 140, height: 16, dropThrough: true },
      { x: 1400, y: 280, width: 120, height: 16, dropThrough: true },
      { x: 1600, y: 230, width: 110, height: 16, dropThrough: true },
      // Zone 3 (1800-2700): the tallest climb of the level.
      { x: 1850, y: 250, width: 120, height: 16, dropThrough: true },
      { x: 2050, y: 190, width: 130, height: 16, dropThrough: true },
      { x: 2280, y: 160, width: 120, height: 16, dropThrough: true },
      { x: 2500, y: 230, width: 110, height: 16, dropThrough: true },
      // Zone 4 (2700-3600): midpoint approach.
      { x: 2750, y: 320, width: 130, height: 16, dropThrough: true },
      { x: 2950, y: 260, width: 120, height: 16, dropThrough: true },
      { x: 3150, y: 310, width: 130, height: 16, dropThrough: true },
      { x: 3350, y: 350, width: 110, height: 16, dropThrough: true },
      // Zone 5 (3700-4600): low, gentle introduction (second pass).
      { x: 3850, y: 350, width: 140, height: 16, dropThrough: true },
      { x: 4080, y: 300, width: 130, height: 16, dropThrough: true },
      { x: 4300, y: 340, width: 120, height: 16, dropThrough: true },
      // Zone 6 (4600-5500): mid-height, more vertical movement.
      { x: 4650, y: 300, width: 130, height: 16, dropThrough: true },
      { x: 4850, y: 230, width: 140, height: 16, dropThrough: true },
      { x: 5100, y: 280, width: 120, height: 16, dropThrough: true },
      { x: 5300, y: 230, width: 110, height: 16, dropThrough: true },
      // Zone 7 (5500-6400): the tallest climb of the second half.
      { x: 5550, y: 250, width: 120, height: 16, dropThrough: true },
      { x: 5750, y: 190, width: 130, height: 16, dropThrough: true },
      { x: 5980, y: 160, width: 120, height: 16, dropThrough: true },
      { x: 6200, y: 230, width: 110, height: 16, dropThrough: true },
      // Zone 8 (6300-7200): final approach to the exit.
      { x: 6450, y: 320, width: 130, height: 16, dropThrough: true },
      { x: 6650, y: 260, width: 120, height: 16, dropThrough: true },
      { x: 6850, y: 310, width: 130, height: 16, dropThrough: true },
      { x: 7050, y: 350, width: 110, height: 16, dropThrough: true },
    ],
    coins: [
      { x: 220, y: 322 },
      { x: 445, y: 272 },
      { x: 660, y: 312 },
      { x: 260, y: 392, type: 'powerup' },
      { x: 1015, y: 272 },
      { x: 1220, y: 202 },
      { x: 1460, y: 252 },
      { x: 1655, y: 202 },
      { x: 1910, y: 222 },
      { x: 2115, y: 162 },
      { x: 2340, y: 132 },
      { x: 2555, y: 202 },
      { x: 2150, y: 392, type: 'powerup' },
      { x: 2815, y: 292 },
      { x: 3010, y: 232 },
      { x: 3210, y: 282 },
      { x: 3410, y: 322 },
      { x: 3920, y: 322 },
      { x: 4145, y: 272 },
      { x: 4360, y: 312 },
      { x: 3960, y: 392, type: 'powerup' },
      { x: 4715, y: 272 },
      { x: 4920, y: 202 },
      { x: 5160, y: 252 },
      { x: 5355, y: 202 },
      { x: 5610, y: 222 },
      { x: 5815, y: 162 },
      { x: 6040, y: 132 },
      { x: 6255, y: 202 },
      { x: 5850, y: 392, type: 'powerup' },
      { x: 6515, y: 292 },
      { x: 6710, y: 232 },
      { x: 6910, y: 282 },
      { x: 7110, y: 322 },
    ],
    enemies: [], // keycaps are paced out dynamically by the spawn queue, see GameplayScene
    portals: [], // no Secret Portal in level1
    exits: [
      {
        x: 7100,
        y: GROUND.y,
        target: {
          kind: 'levelComplete',
          header: 'LEVEL 1 COMPLETE!',
          statLabel: 'CYBERCOINS COLLECTED',
          nextLabel: 'PRESS ENTER OR SPACE FOR LEVEL 2',
          next: { kind: 'level', levelKey: 'level2' },
        },
      },
    ],
  },

  level2: {
    background: 'bg_level_2',
    spawn: { x: 40, y: GROUND.y },
    worldWidth: 7200,
    // Zones 5-8 repeat the zone 1-4 layout, offset +3720px, for a full second pass.
    ground: [
      { x: 0, y: 414, width: 700, height: 36 },
      { x: 820, y: 414, width: 780, height: 36 },
      { x: 1700, y: 414, width: 760, height: 36 },
      { x: 2600, y: 414, width: 1000, height: 36 },
      { x: 3720, y: 414, width: 700, height: 36 },
      { x: 4540, y: 414, width: 780, height: 36 },
      { x: 5420, y: 414, width: 760, height: 36 },
      { x: 6320, y: 414, width: 880, height: 36 },
    ],
    platforms: [
      // Zone 1 (0-900).
      { x: 100, y: 330, width: 110, height: 16, dropThrough: true },
      { x: 300, y: 260, width: 100, height: 16, dropThrough: true },
      { x: 500, y: 320, width: 110, height: 16, dropThrough: true },
      // Zone 2 (900-1800).
      { x: 900, y: 280, width: 110, height: 16, dropThrough: true },
      { x: 1080, y: 200, width: 100, height: 16, dropThrough: true },
      { x: 1300, y: 260, width: 120, height: 16, dropThrough: true },
      { x: 1500, y: 340, width: 100, height: 16, dropThrough: true },
      // Zone 3 (1800-2700): a side staircase climbs off the main path to an
      // elevated perch holding the hidden Secret Portal, then rejoins below.
      { x: 1750, y: 300, width: 110, height: 16, dropThrough: true },
      { x: 1900, y: 230, width: 100, height: 16, dropThrough: true },
      { x: 2050, y: 160, width: 110, height: 16, dropThrough: true },
      { x: 2200, y: 130, width: 100, height: 16, dropThrough: true }, // secret perch
      { x: 2350, y: 200, width: 110, height: 16, dropThrough: true },
      { x: 2550, y: 260, width: 100, height: 16, dropThrough: true },
      // Zone 4 (2700-3600): midpoint approach.
      { x: 2700, y: 300, width: 110, height: 16, dropThrough: true },
      { x: 2900, y: 230, width: 100, height: 16, dropThrough: true },
      { x: 3100, y: 300, width: 120, height: 16, dropThrough: true },
      { x: 3350, y: 340, width: 100, height: 16, dropThrough: true },
      // Zone 5 (3720-4620, second pass).
      { x: 3820, y: 330, width: 110, height: 16, dropThrough: true },
      { x: 4020, y: 260, width: 100, height: 16, dropThrough: true },
      { x: 4220, y: 320, width: 110, height: 16, dropThrough: true },
      // Zone 6 (4620-5520, second pass).
      { x: 4620, y: 280, width: 110, height: 16, dropThrough: true },
      { x: 4800, y: 200, width: 100, height: 16, dropThrough: true },
      { x: 5020, y: 260, width: 120, height: 16, dropThrough: true },
      { x: 5220, y: 340, width: 100, height: 16, dropThrough: true },
      // Zone 7 (5520-6420, second pass).
      { x: 5470, y: 300, width: 110, height: 16, dropThrough: true },
      { x: 5620, y: 230, width: 100, height: 16, dropThrough: true },
      { x: 5770, y: 160, width: 110, height: 16, dropThrough: true },
      { x: 5920, y: 130, width: 100, height: 16, dropThrough: true },
      { x: 6070, y: 200, width: 110, height: 16, dropThrough: true },
      { x: 6270, y: 260, width: 100, height: 16, dropThrough: true },
      // Zone 8 (6320-7200): final approach to the exit.
      { x: 6420, y: 300, width: 110, height: 16, dropThrough: true },
      { x: 6620, y: 230, width: 100, height: 16, dropThrough: true },
      { x: 6820, y: 300, width: 120, height: 16, dropThrough: true },
      { x: 7070, y: 340, width: 100, height: 16, dropThrough: true },
    ],
    coins: [
      { x: 150, y: 302 },
      { x: 350, y: 232 },
      { x: 550, y: 292 },
      { x: 150, y: 392, type: 'powerup' },
      { x: 950, y: 252 },
      { x: 1130, y: 172 },
      { x: 1350, y: 232 },
      { x: 1550, y: 312 },
      { x: 1800, y: 272 },
      { x: 1950, y: 202 },
      { x: 2100, y: 132 },
      { x: 2400, y: 172 },
      { x: 2600, y: 232 },
      { x: 2250, y: 102, type: 'powerup' }, // guards the secret perch
      { x: 2750, y: 272 },
      { x: 2950, y: 202 },
      { x: 3150, y: 272 },
      { x: 3400, y: 312 },
      { x: 3870, y: 302 },
      { x: 4070, y: 232 },
      { x: 4270, y: 292 },
      { x: 3870, y: 392, type: 'powerup' },
      { x: 4670, y: 252 },
      { x: 4850, y: 172 },
      { x: 5070, y: 232 },
      { x: 5270, y: 312 },
      { x: 5520, y: 272 },
      { x: 5670, y: 202 },
      { x: 5820, y: 132 },
      { x: 6120, y: 172 },
      { x: 6320, y: 232 },
      { x: 5970, y: 102, type: 'powerup' },
      { x: 6470, y: 272 },
      { x: 6670, y: 202 },
      { x: 6870, y: 272 },
      { x: 7120, y: 312 },
    ],
    enemies: [], // keycaps are paced out dynamically by the spawn queue, see GameplayScene
    // Secret Portal -- elevated, off the main path, purely a hidden bonus route
    // into secretRoom. Never the required way forward. Tagged with an id so
    // GameplayScene._loadLevel can drop it once it's been used this run (see
    // secretPortalConsumed) -- a one-time detour, not a repeatable shortcut.
    portals: [{ id: 'secretPortal', x: 2250, y: 130, target: { kind: 'level', levelKey: 'secretRoom' } }],
    exits: [
      {
        x: 7100,
        y: GROUND.y,
        target: {
          kind: 'levelComplete',
          header: 'LEVEL 2 COMPLETE!',
          statLabel: 'TOTAL CYBERCOINS',
          nextLabel: 'PRESS ENTER OR SPACE FOR BOSS ARENA',
          next: { kind: 'scene', sceneKey: SceneState.BOSS_ARENA },
        },
      },
    ],
  },

  secretRoom: {
    background: 'bg_secret_room',
    spawn: { x: 40, y: GROUND.y },
    // A gentle rise-and-fall arc of platforms, purely for reaching higher coin
    // stacks -- the ground floor alone is enough to walk the whole room.
    platforms: [
      { x: 80, y: 330, width: 110, height: 16, dropThrough: true },
      { x: 230, y: 260, width: 100, height: 16, dropThrough: true },
      { x: 380, y: 190, width: 110, height: 16, dropThrough: true }, // peak
      { x: 530, y: 260, width: 100, height: 16, dropThrough: true },
      { x: 650, y: 330, width: 70, height: 16, dropThrough: true },
    ],
    // No hand-placed coins here -- this room is a timed "coin rain" instead,
    // see SECRET_ROOM_RAIN and GameplayScene._updateSecretRoomRain. Each drop
    // despawns the instant it hits the floor uncaught, one chance only.
    coins: [],
    enemies: [], // pure bonus room, no obstacles
    // The big reward -- falls from the ceiling partway through the rain instead
    // of sitting in a fixed spot, so it has to be caught like the coins.
    jetpackPickup: { x: 700 },
    // Exits straight back into Level 2 (no stat screen -- this is a quick bonus
    // detour, not a level completion), dropping the player back onto the secret
    // perch rather than the level's default spawn, so they can carry on toward
    // Level 2's own exit from right where they left it.
    portals: [
      {
        x: 760,
        y: GROUND.y,
        target: {
          kind: 'level',
          levelKey: 'level2',
          returnTo: { x: 2250 + 40, y: 130 },
        },
      },
    ],
  },
};
