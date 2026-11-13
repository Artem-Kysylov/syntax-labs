// Trapped in Vim :: :wq!
// Shared tuning constants, scene keys, and sprite-sheet frame data.

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const ASSET_ROOT = '../assets';

export const SceneState = Object.freeze({
  START_MENU: 'START_MENU',
  GAMEPLAY: 'GAMEPLAY',
  GAME_OVER: 'GAME_OVER',
  WIN: 'WIN',
  BOSS_ARENA: 'BOSS_ARENA',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  CUTSCENE_1: 'CUTSCENE_1',
  CUTSCENE_2: 'CUTSCENE_2',
});

// ---------------------------------------------------------------------
// Hero spritesheet layout (hero_movement.png, measured from source pixels)
// ---------------------------------------------------------------------

export const HERO_FRAMES = {
  idle: [
    { x: 80, y: 69, w: 197, h: 449 },
    { x: 320, y: 69, w: 197, h: 449 },
    { x: 560, y: 69, w: 198, h: 449 },
    { x: 802, y: 69, w: 197, h: 449 },
  ],
  run: [
    { x: 1329, y: 69, w: 300, h: 449 },
    { x: 1662, y: 69, w: 323, h: 449 },
    { x: 2040, y: 69, w: 277, h: 449 },
    { x: 2373, y: 69, w: 300, h: 449 },
  ],
  jump: [
    { x: 424, y: 618, w: 437, h: 565 },
    { x: 893, y: 618, w: 462, h: 565 },
    { x: 1455, y: 618, w: 369, h: 565 },
    { x: 1960, y: 618, w: 334, h: 565 },
    { x: 2327, y: 618, w: 335, h: 565 },
  ],
};

export const HERO_SCALE = 0.18;
export const HERO_FRAME_RATE = 8; // frames per second for idle/run cycles

// ---------------------------------------------------------------------
// hero_action.png layout (measured from source pixels) -- blaster firing pose
// ---------------------------------------------------------------------

// Tightened from the original { x: 1350, y: 323, w: 320, h: 463 }, which bled
// ~45px into the next pose on the sheet (the following frame's forward foot/
// shoe), rendering as a stray leg artifact near the player's feet.
export const ACTION_FIRE_FRAME = { x: 1306, y: 362, w: 322, h: 428 };
// Three "weapon ready" poses (gun angle sways; the sheet has no leg-animated
// walk cycle for the blaster-equipped pose) -- cycled while grounded and
// moving so holding the blaster doesn't freeze on one static bitmap while
// running. The middle pose doubles as the standing-still frame.
export const ACTION_RUN_FRAMES = [
  { x: 146, y: 364, w: 200, h: 424 },
  { x: 393, y: 364, w: 231, h: 424 },
  { x: 673, y: 364, w: 231, h: 424 },
];
export const ACTION_STAND_FRAME = ACTION_RUN_FRAMES[1];
export const ACTION_FLY_FRAME = { x: 2034, y: 893, w: 518, h: 550 };

// ---------------------------------------------------------------------
// items_and_fx.png layout (measured from source pixels)
// ---------------------------------------------------------------------

export const COIN_FRAMES = [
  { x: 72, y: 36, w: 208, h: 219 },
  { x: 370, y: 36, w: 128, h: 219 },
  { x: 623, y: 36, w: 139, h: 219 },
  { x: 920, y: 36, w: 37, h: 219 },
  { x: 1104, y: 36, w: 128, h: 219 },
  { x: 1436, y: 36, w: 197, h: 219 },
  { x: 1758, y: 36, w: 196, h: 219 },
];

export const ORB_FRAMES = [
  { x: 95, y: 345, w: 244, h: 220 },
  { x: 474, y: 311, w: 288, h: 266 },
  { x: 852, y: 310, w: 298, h: 290 },
  { x: 1264, y: 287, w: 324, h: 326 },
];

export const PORTAL_FRAMES = [
  { x: 95, y: 620, w: 244, h: 335 },
  { x: 474, y: 620, w: 288, h: 335 },
  { x: 852, y: 620, w: 298, h: 335 },
  { x: 1264, y: 616, w: 324, h: 339 },
  { x: 1654, y: 609, w: 289, h: 346 }, // burst frame, held in reserve (not part of the idle loop)
];

export const KEYCAP_FRAMES = [
  { x: 49, y: 975, w: 151, h: 232 }, // blank
  { x: 278, y: 975, w: 152, h: 232 }, // H
  { x: 508, y: 975, w: 150, h: 232 }, // J
  { x: 738, y: 975, w: 151, h: 232 }, // K
  { x: 966, y: 975, w: 151, h: 232 }, // L
  { x: 1207, y: 975, w: 381, h: 232 }, // ESC
  { x: 1654, y: 975, w: 312, h: 232 }, // ERR
];

export const COIN_SCALE = 0.14;
export const ORB_SCALE = 0.13;
export const PORTAL_SCALE = 0.3;
export const KEYCAP_SCALE = 0.2;

// ---------------------------------------------------------------------
// boss_monitor.png layout (measured from source pixels)
// ---------------------------------------------------------------------

export const BOSS_FRAMES = {
  idle: [
    { x: 160, y: 0, w: 395, h: 367 },
    { x: 664, y: 0, w: 394, h: 367 },
    { x: 1202, y: 0, w: 393, h: 367 },
  ],
  telegraph: { x: 141, y: 740, w: 438, h: 400 },
  hit: { x: 580, y: 740, w: 600, h: 400 },
  firing: { x: 1282, y: 740, w: 564, h: 400 },
  smoke: { x: 2115, y: 740, w: 477, h: 400 },
  explosion: { x: 822, y: 1146, w: 498, h: 374 },
  wreck: { x: 2144, y: 1146, w: 520, h: 374 },
};

// Boss buff: 1.75x bigger (within the 1.5x-2x ask) -- applied to both the render
// scale and the Boss instance's hitbox (width/height in the class below) so the
// bigger sprite and its collision box grow together, not just the art.
export const BOSS_SIZE_SCALE = 1.75;
export const BOSS_SCALE = 0.35 * BOSS_SIZE_SCALE;

export const BOSS = {
  maxHp: 8, // 8 discrete HP ticks -- defeated strictly after 8 landed hits
  playerLaserDamage: 1, // exactly 1 tick per laser hit
  attackIntervalMin: 1.0, // faster, more aggressive cadence (was 2.2-3.4s)
  attackIntervalMax: 1.2,
  // Enrage phase: once hp drops to/below half (see Boss#isEnraged), attacks
  // come noticeably faster and hit harder to dodge -- forces the back half of
  // the fight to be read on reflex instead of the opener's steadier rhythm.
  enrageHpFraction: 0.5,
  enrageIntervalMultiplier: 0.6, // ~40% shorter cooldown between attacks while enraged
  enrageLaserSpeedMultiplier: 1.25, // ~25% faster projectiles while enraged
  telegraphDuration: 0.6,
  firingDuration: 0.3,
  hitFlashDuration: 0.15, // how long the dedicated "hit" sprite pose shows
  hitCooldownDuration: 0.6, // post-hit invincibility window -- blocks rapid-fire HP drain
  recoilDuration: 0.15, // how long the knockback nudge takes to settle back to rest
  recoilDistance: 16, // px nudged away from the player on each hit
  explosionDuration: 1.8,
  bobAmplitude: 10,
  bobSpeed: 2,
  moveSpeed: 160, // px/s horizontal patrol speed between the arena's middle and right edge
  laserSpeed: 720, // faster projectile -- demands a quicker K/J reaction (was 460)
  // Two alternating attack patterns (see Boss#nextAttackType) instead of one
  // generic bolt -- LOW skims the floor (dodge: jump, K), HIGH cuts across
  // head height (dodge: duck, J). Low bolts are wider/shorter; high bolts are
  // narrower/taller so a jump carries the player's head straight into one
  // instead of clearing it -- only ducking keeps you under its bottom edge.
  laserLowWidth: 56,
  laserLowHeight: 60,
  laserLowBottomY: 414, // flush with GROUND.y -- a crouching player's body (head at 376) still overlaps this
  laserHighWidth: 30,
  laserHighHeight: 250,
  laserHighBottomY: 374, // just above a crouching player's head (376), and tall enough to reach above a jump's ~113px apex
  laserColor: '#ff6a3c', // outer neon glow
  laserCoreColor: '#fff6c2', // bright inner core
};

export const PLAYER_HEALTH = {
  baseTicks: 4,
  maxTicks: 6,
  cybercoinsPerBonusTick: 20,
  coinsPerHeal: 10, // every 10 cybercoins collected restores one HP tick, deterministically
  healFlashDuration: 0.4,
};

// ---------------------------------------------------------------------
// Level geometry + physics tuning
// ---------------------------------------------------------------------

export const GROUND = { x: 0, y: 414, width: CANVAS_WIDTH, height: 36, dropThrough: false };

export const BOSS_ARENA_SPAWN = { x: 80, y: GROUND.y };

export const MUSIC_VOLUME = 0.5;

export const PHYSICS = {
  gravity: 1200,
  maxFallSpeed: 900,
  moveAccel: 2200,
  friction: 1800,
  maxRunSpeed: 220,
  crouchSpeedMultiplier: 0.4,
  // -520 caps a standing jump's rise at ~113px (v^2 / 2g) -- roughly 1.5-2
  // platform tiers (tiers run ~50-70px apart across the level data) instead of
  // the old -760, which cleared ~241px and let a single jump skip straight to
  // the top of a climb without using the intermediate platforms.
  jumpVelocity: -520,
  dropThroughDuration: 0.35,
  hurtInvulnDuration: 1.5,
};

// Knockback impulse applied on a non-fatal hit, so the player separates from
// the hazard instead of re-colliding with it every frame of the i-frame window.
export const HIT_KNOCKBACK = {
  horizontalSpeed: 240, // px/s away from the hazard (~4px/frame at a 60fps reference)
  verticalSpeed: 180, // px/s upward hop (~3px/frame at a 60fps reference)
};

export const BLASTER = {
  duration: 5,
  firingPoseDuration: 0.2,
  laserSpeed: 900,
  laserWidth: 24,
  laserHeight: 6,
  enemyKillBonus: 25,
};

export const JETPACK = {
  maxFuel: 2.5, // seconds of continuous thrust
  drainRate: 1, // fuel-seconds consumed per second of thrust
  rechargeRate: 0.6, // fuel-seconds restored per second while grounded
  thrustAccel: -2600, // upward acceleration applied while thrusting (negative = up)
  maxUpSpeed: -420, // clamp on upward velocity so thrust doesn't runaway
};

// Keycap enemies in the scrolling levels aren't hand-placed -- they're paced out
// by a queue/cooldown system (see GameplayScene._updateEnemySpawner) so the
// player always gets a fair, readable gap to react in with H/J/K/L.
export const KEYCAP_SPAWN = {
  minIntervalSeconds: 1.0, // cooldown between spawns -- shorter so the next one queues up while earlier ones are still on screen
  minDistancePx: 200, // and never closer together than this, whichever binds -- enforced across all lanes
  maxVisible: 4, // at most this many keycaps on-screen (within the camera viewport) at once
  minSpeed: 162, // 2.7px/frame at a 60fps reference (+35% over the original 120)
  maxSpeed: 308, // 5.1px/frame at a 60fps reference (+35% over the original 228)
  spawnAheadPadding: 60, // spawn just past the camera's right edge, out of sight
  groundY: 400, // ground lane -- overlaps standing AND crouching, so it must be jumped (K)
  headY: 345, // mid lane -- head/chest height, overlaps only a standing player, so it must be ducked (J)
  highY: 130, // high lane -- upper platform tier, threatens players riding elevated platforms
};

// Fixed, predictable rhythm across the three vertical lanes -- not random -- so
// the player can learn to read incoming altitude the same way they read KEYCAP_SPAWN.minDistancePx.
export const KEYCAP_ALTITUDE_CYCLE = ['ground', 'head', 'high'];

// Secret room bonus: cybercoins (and the jetpack) fall from the ceiling instead
// of sitting in fixed spots -- see GameplayScene._updateSecretRoomRain. Anything
// that reaches the floor uncaught despawns immediately; there's no second chance.
export const SECRET_ROOM_RAIN = {
  roomDuration: 18, // total bonus window, in seconds (~15-20s) -- ~36 coin drops at the interval
  // below, roughly double the old hand-placed 17-orb room, but as cybercoins now, not orbs.
  coinSpawnInterval: 0.5, // seconds between coin drops
  fallSpeed: 180, // 3px/frame at a 60fps reference
  spawnY: -20,
  marginX: 50, // keep drops clear of the room's left/right walls
  jetpackDropDelay: 3, // seconds after entering the room before the jetpack itself starts falling
};

// The mute toggle is now a real #mute-btn DOM button (see index.html/
// setUpMuteToggle below) rather than a canvas-drawn icon, so it's a
// genuinely tappable/clickable element instead of inert pixels. Other
// top-right HUD text still leaves this much clearance so it doesn't render
// underneath the real #mute-btn/#fullscreen-btn overlay sitting above the
// canvas in screen space.
export const TOP_RIGHT_UI_RESERVED_WIDTH = 90;
