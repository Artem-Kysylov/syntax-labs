// Trapped in Vim :: :wq!
// Pure HTML5 Canvas + vanilla JS 8-bit platformer

(() => {
  'use strict';

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 450;
  const ASSET_ROOT = '../assets';

  const SceneState = Object.freeze({
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
  // Asset manifest
  // ---------------------------------------------------------------------

  const IMAGE_MANIFEST = {
    bg_start_screen: `${ASSET_ROOT}/backgrounds/bg_start_screen.png`,
    bg_level_1: `${ASSET_ROOT}/backgrounds/bg_level_1.png`,
    bg_level_2: `${ASSET_ROOT}/backgrounds/bg_level_2.png`,
    bg_boss_fight: `${ASSET_ROOT}/backgrounds/bg_boss_fight.png`,
    bg_secret_room: `${ASSET_ROOT}/backgrounds/bg_secret_room.png`,
    bg_game_over: `${ASSET_ROOT}/backgrounds/bg_game_over.png`,
    bg_you_win: `${ASSET_ROOT}/backgrounds/bg_you_win.png`,
    cutscene_boss_defeat: `${ASSET_ROOT}/backgrounds/cutscene_boss_defeat.png`,
    cutscene_escape: `${ASSET_ROOT}/backgrounds/cutscene_escape.png`,
    hero_movement: `${ASSET_ROOT}/sprites/hero_movement.png`,
    hero_action: `${ASSET_ROOT}/sprites/hero_action.png`,
    hero_death: `${ASSET_ROOT}/sprites/hero_death.png`,
    boss_monitor: `${ASSET_ROOT}/sprites/boss_monitor.png`,
    items_and_fx: `${ASSET_ROOT}/sprites/items_and_fx.png`,
  };

  const AUDIO_MANIFEST = {
    bgm_gameplay: `${ASSET_ROOT}/audio/music/bgm_gameplay_8bit.mp3`,
    bgm_intro: `${ASSET_ROOT}/audio/music/bgm_intro_vox.MP3`,
    bgm_outro: `${ASSET_ROOT}/audio/music/bgm_outro_vox.MP3`,
    jingle_game_over: `${ASSET_ROOT}/audio/music/jingle_game_over.mp3`,
    jingle_results: `${ASSET_ROOT}/audio/music/jingle_results.mp3`,
    sfx_coin: `${ASSET_ROOT}/audio/sfx/sfx_coin.wav`,
    sfx_explosion: `${ASSET_ROOT}/audio/sfx/sfx_explosion.wav`,
    sfx_hurt: `${ASSET_ROOT}/audio/sfx/sfx_hurt.wav`,
    sfx_jetpack: `${ASSET_ROOT}/audio/sfx/sfx_jetpack.wav`,
    sfx_jump: `${ASSET_ROOT}/audio/sfx/sfx_jump.wav`,
    sfx_laser: `${ASSET_ROOT}/audio/sfx/sfx_laser.wav`,
    sfx_select: `${ASSET_ROOT}/audio/sfx/sfx_select.wav`,
    sfx_teleport: `${ASSET_ROOT}/audio/sfx/sfx_teleport.wav`,
  };

  // ---------------------------------------------------------------------
  // Hero spritesheet layout (hero_movement.png, measured from source pixels)
  // ---------------------------------------------------------------------

  const HERO_FRAMES = {
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

  const HERO_SCALE = 0.18;
  const HERO_FRAME_RATE = 8; // frames per second for idle/run cycles

  // ---------------------------------------------------------------------
  // hero_action.png layout (measured from source pixels) -- blaster firing pose
  // ---------------------------------------------------------------------

  const ACTION_FIRE_FRAME = { x: 1350, y: 323, w: 320, h: 463 };
  const ACTION_FLY_FRAME = { x: 2034, y: 893, w: 518, h: 550 };

  // ---------------------------------------------------------------------
  // items_and_fx.png layout (measured from source pixels)
  // ---------------------------------------------------------------------

  const COIN_FRAMES = [
    { x: 72, y: 36, w: 208, h: 219 },
    { x: 370, y: 36, w: 128, h: 219 },
    { x: 623, y: 36, w: 139, h: 219 },
    { x: 920, y: 36, w: 37, h: 219 },
    { x: 1104, y: 36, w: 128, h: 219 },
    { x: 1436, y: 36, w: 197, h: 219 },
    { x: 1758, y: 36, w: 196, h: 219 },
  ];

  const ORB_FRAMES = [
    { x: 95, y: 345, w: 244, h: 220 },
    { x: 474, y: 311, w: 288, h: 266 },
    { x: 852, y: 310, w: 298, h: 290 },
    { x: 1264, y: 287, w: 324, h: 326 },
  ];

  const PORTAL_FRAMES = [
    { x: 95, y: 620, w: 244, h: 335 },
    { x: 474, y: 620, w: 288, h: 335 },
    { x: 852, y: 620, w: 298, h: 335 },
    { x: 1264, y: 616, w: 324, h: 339 },
    { x: 1654, y: 609, w: 289, h: 346 }, // burst frame, held in reserve (not part of the idle loop)
  ];

  const KEYCAP_FRAMES = [
    { x: 49, y: 975, w: 151, h: 232 }, // blank
    { x: 278, y: 975, w: 152, h: 232 }, // H
    { x: 508, y: 975, w: 150, h: 232 }, // J
    { x: 738, y: 975, w: 151, h: 232 }, // K
    { x: 966, y: 975, w: 151, h: 232 }, // L
    { x: 1207, y: 975, w: 381, h: 232 }, // ESC
    { x: 1654, y: 975, w: 312, h: 232 }, // ERR
  ];

  const COIN_SCALE = 0.14;
  const ORB_SCALE = 0.13;
  const PORTAL_SCALE = 0.3;
  const KEYCAP_SCALE = 0.2;

  // ---------------------------------------------------------------------
  // boss_monitor.png layout (measured from source pixels)
  // ---------------------------------------------------------------------

  const BOSS_FRAMES = {
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
  const BOSS_SIZE_SCALE = 1.75;
  const BOSS_SCALE = 0.35 * BOSS_SIZE_SCALE;

  const BOSS = {
    maxHp: 4, // 4 discrete HP ticks -- defeated strictly after 4 landed hits
    playerLaserDamage: 1, // exactly 1 tick per laser hit
    attackIntervalMin: 1.0, // faster, more aggressive cadence (was 2.2-3.4s)
    attackIntervalMax: 1.2,
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
    laserWidth: 40,
    laserHeight: 120, // tall enough to threaten a standing player, not just mid-air
    laserColor: '#ff6a3c',
  };

  const PLAYER_HEALTH = {
    baseTicks: 4,
    maxTicks: 6,
    cybercoinsPerBonusTick: 20,
    coinsPerHeal: 10, // every 10 cybercoins collected restores one HP tick, deterministically
    healFlashDuration: 0.4,
  };

  // ---------------------------------------------------------------------
  // Level geometry + physics tuning
  // ---------------------------------------------------------------------

  const GROUND = { x: 0, y: 414, width: CANVAS_WIDTH, height: 36, dropThrough: false };

  const BOSS_ARENA_SPAWN = { x: 80, y: GROUND.y };

  const MUSIC_VOLUME = 0.5;

  const PHYSICS = {
    gravity: 1200,
    maxFallSpeed: 900,
    moveAccel: 2200,
    friction: 1800,
    maxRunSpeed: 220,
    crouchSpeedMultiplier: 0.4,
    jumpVelocity: -760,
    dropThroughDuration: 0.35,
    hurtInvulnDuration: 1.5,
  };

  // Knockback impulse applied on a non-fatal hit, so the player separates from
  // the hazard instead of re-colliding with it every frame of the i-frame window.
  const HIT_KNOCKBACK = {
    horizontalSpeed: 240, // px/s away from the hazard (~4px/frame at a 60fps reference)
    verticalSpeed: 180, // px/s upward hop (~3px/frame at a 60fps reference)
  };

  const BLASTER = {
    duration: 5,
    firingPoseDuration: 0.2,
    laserSpeed: 900,
    laserWidth: 24,
    laserHeight: 6,
    enemyKillBonus: 25,
  };

  const JETPACK = {
    maxFuel: 2.5, // seconds of continuous thrust
    drainRate: 1, // fuel-seconds consumed per second of thrust
    rechargeRate: 0.6, // fuel-seconds restored per second while grounded
    thrustAccel: -2600, // upward acceleration applied while thrusting (negative = up)
    maxUpSpeed: -420, // clamp on upward velocity so thrust doesn't runaway
  };

  // Keycap enemies in the scrolling levels aren't hand-placed -- they're paced out
  // by a queue/cooldown system (see GameplayScene._updateEnemySpawner) so the
  // player always gets a fair, readable gap to react in with H/J/K/L.
  const KEYCAP_SPAWN = {
    minIntervalSeconds: 2.0, // cooldown between spawns
    minDistancePx: 280, // and never closer together than this, whichever binds -- enforced across all lanes
    maxVisible: 3, // at most this many keycaps on-screen (within the camera viewport) at once
    minSpeed: 120, // 2.0px/frame at a 60fps reference
    maxSpeed: 228, // 3.8px/frame at a 60fps reference
    spawnAheadPadding: 60, // spawn just past the camera's right edge, out of sight
    groundY: 400, // ground lane -- overlaps standing AND crouching, so it must be jumped (K)
    headY: 345, // mid lane -- head/chest height, overlaps only a standing player, so it must be ducked (J)
    highY: 130, // high lane -- upper platform tier, threatens players riding elevated platforms
  };

  // Fixed, predictable rhythm across the three vertical lanes -- not random -- so
  // the player can learn to read incoming altitude the same way they read KEYCAP_SPAWN.minDistancePx.
  const KEYCAP_ALTITUDE_CYCLE = ['ground', 'head', 'high'];

  // Secret room bonus: cybercoins (and the jetpack) fall from the ceiling instead
  // of sitting in fixed spots -- see GameplayScene._updateSecretRoomRain. Anything
  // that reaches the floor uncaught despawns immediately; there's no second chance.
  const SECRET_ROOM_RAIN = {
    roomDuration: 18, // total bonus window, in seconds (~15-20s) -- ~36 coin drops at the interval
    // below, roughly double the old hand-placed 17-orb room, but as cybercoins now, not orbs.
    coinSpawnInterval: 0.5, // seconds between coin drops
    fallSpeed: 180, // 3px/frame at a 60fps reference
    spawnY: -20,
    marginX: 50, // keep drops clear of the room's left/right walls
    jetpackDropDelay: 3, // seconds after entering the room before the jetpack itself starts falling
  };

  const LEVELS = {
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
      // into secretRoom. Never the required way forward.
      portals: [{ x: 2250, y: 130, target: { kind: 'level', levelKey: 'secretRoom' } }],
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
      portals: [
        {
          x: 760,
          y: GROUND.y,
          target: {
            kind: 'levelComplete',
            header: 'SECRET ROOM CLEARED!',
            statLabel: 'TOTAL CYBERCOINS',
            nextLabel: 'PRESS ENTER OR SPACE FOR BOSS ARENA',
            next: { kind: 'scene', sceneKey: SceneState.BOSS_ARENA },
          },
        },
      ],
    },
  };

  // ---------------------------------------------------------------------
  // AssetManager
  // ---------------------------------------------------------------------

  class AssetManager {
    constructor(imageManifest, audioManifest) {
      this.imageManifest = imageManifest;
      this.audioManifest = audioManifest;
      this.images = {};
      this.audio = {};
      this.total = Object.keys(imageManifest).length + Object.keys(audioManifest).length;
      this.loaded = 0;
      this.failed = [];
      this.muted = false;
    }

    _loadImage(key, src) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images[key] = img;
          this._tick(key);
          resolve();
        };
        img.onerror = () => {
          this.failed.push(src);
          this._tick(key);
          resolve();
        };
        img.src = src;
      });
    }

    _loadAudio(key, src) {
      return new Promise((resolve) => {
        const audio = new Audio();
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          this.audio[key] = audio;
          this._tick(key);
          resolve();
        };
        audio.addEventListener('canplaythrough', finish, { once: true });
        audio.addEventListener('error', () => {
          this.failed.push(src);
          this._tick(key);
          if (!settled) {
            settled = true;
            resolve();
          }
        }, { once: true });
        audio.preload = 'auto';
        audio.src = src;
        audio.load();
      });
    }

    _tick(key) {
      this.loaded += 1;
      if (this.onProgress) {
        this.onProgress(this.loaded, this.total, key);
      }
    }

    async loadAll(onProgress) {
      this.onProgress = onProgress;
      const imageJobs = Object.entries(this.imageManifest).map(([key, src]) =>
        this._loadImage(key, src)
      );
      const audioJobs = Object.entries(this.audioManifest).map(([key, src]) =>
        this._loadAudio(key, src)
      );
      await Promise.all([...imageJobs, ...audioJobs]);
      if (this.failed.length) {
        console.warn('AssetManager: failed to load', this.failed);
      }
      return { images: this.images, audio: this.audio };
    }

    getImage(key) {
      return this.images[key] || null;
    }

    playSfx(key, { volume = 1 } = {}) {
      const base = this.audio[key];
      if (!base) return;
      const instance = base.cloneNode(true);
      instance.volume = volume;
      instance.muted = this.muted;
      instance.play().catch(() => {});
    }

    playMusic(key, { volume = 0.6, loop = true } = {}) {
      const track = this.audio[key];
      if (!track) return null;
      track.volume = volume;
      track.loop = loop;
      track.muted = this.muted;
      track.currentTime = 0;
      track.play().catch(() => {});
      return track;
    }

    stopMusic(key) {
      const track = this.audio[key];
      if (!track) return;
      track.pause();
      track.currentTime = 0;
    }

    // Stops every currently-playing track this manager owns. playSfx() clones nodes to
    // play them, so one-shot sound effects are untouched -- only loops/jingles started
    // via playMusic() (which plays the stored original) ever show up here as "playing".
    stopAllMusic() {
      Object.values(this.audio).forEach((track) => {
        if (!track.paused) {
          track.pause();
          track.currentTime = 0;
        }
      });
    }

    // Uses the native .muted flag (not volume 0) so unmuting restores playback
    // exactly where it was, and applies to every loaded track -- including ones
    // not currently playing -- so anything started later picks it up too.
    toggleMute() {
      this.muted = !this.muted;
      Object.values(this.audio).forEach((track) => {
        track.muted = this.muted;
      });
      return this.muted;
    }
  }

  // ---------------------------------------------------------------------
  // Loading screen (drawn directly to canvas while assets stream in)
  // ---------------------------------------------------------------------

  function drawLoadingScreen(ctx, loaded, total, label) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const pct = total > 0 ? loaded / total : 0;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#50dc78';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TRAPPED IN VIM', w / 2, h / 2 - 60);

    ctx.fillStyle = '#8a8a9a';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('LOADING ASSETS...', w / 2, h / 2 - 20);

    const barW = 480;
    const barH = 24;
    const barX = (w - barW) / 2;
    const barY = h / 2;

    ctx.strokeStyle = '#50dc78';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#50dc78';
    ctx.fillRect(barX + 3, barY + 3, Math.max(0, (barW - 6) * pct), barH - 6);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`${Math.round(pct * 100)}%`, w / 2, barY + barH + 28);

    if (label) {
      ctx.fillStyle = '#44444f';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(label, w / 2, barY + barH + 50);
    }
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.justPressed = new Set();
      window.addEventListener('keydown', (e) => {
        this._press(e.code);
        // e.code is the physical key, so it already reads 'h'/'H'/caps-lock 'H' alike --
        // no separate uppercase handling needed, just the full gameplay key set here so
        // none of them ever scroll/select the page while playing.
        if (
          [
            'Space',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Enter',
            'KeyH',
            'KeyJ',
            'KeyK',
            'KeyL',
            'KeyF',
          ].includes(e.code)
        ) {
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        this._release(e.code);
      });
    }

    _press(code) {
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
    }

    _release(code) {
      this.keys.delete(code);
    }

    isDown(code) {
      return this.keys.has(code);
    }

    wasPressed(code) {
      return this.justPressed.has(code);
    }

    endFrame() {
      this.justPressed.clear();
    }

    // Wires a virtual touch button to behave exactly like holding the given key:
    // isDown() is true while held, wasPressed() fires once on the initial touch.
    bindTouchButton(el, code) {
      const press = (e) => {
        e.preventDefault();
        this._press(code);
        el.classList.add('is-pressed');
      };
      const release = (e) => {
        e.preventDefault();
        this._release(code);
        el.classList.remove('is-pressed');
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
    }

    // A single tap-to-confirm, for advancing menu/status screens on devices with
    // no keyboard -- presses and releases the key within the same frame, so it
    // can never get "stuck" held down for something like jetpack thrust.
    simulateTap(code) {
      this._press(code);
      this._release(code);
    }
  }

  // ---------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------

  class Player {
    constructor(game, x, y) {
      this.game = game;

      this.standHeight = 64;
      this.crouchHeight = 38;
      this.width = 30;
      this.height = this.standHeight;

      this.x = x;
      this.y = y - this.height;
      this.vx = 0;
      this.vy = 0;

      this.facing = 1;
      this.grounded = false;
      this.crouching = false;
      this.currentPlatform = null;

      this.dropThroughPlatform = null;
      this.dropThroughTimer = 0;

      this.invulnerable = false;
      this.invulnTimer = 0;

      this.blasterTimer = 0;
      this.infiniteBlaster = false; // the boss fight auto-equips the blaster with no expiry
      this.isFiringPose = false;
      this.firingPoseTimer = 0;

      this.hasJetpack = false;
      this.jetpackFuel = 0;
      this.isThrusting = false;

      this.animState = 'idle';
      this.animFrame = 0;
      this.animTimer = 0;
    }

    hit() {
      if (this.invulnerable) return false;
      this.invulnerable = true;
      this.invulnTimer = PHYSICS.hurtInvulnDuration;
      return true;
    }

    // Small separating impulse after a non-fatal hit -- direction is -1/1, away
    // from whatever hazard caused the hit -- so it isn't immediately re-touched
    // the next frame while i-frames are still running out.
    applyKnockback(direction) {
      this.vx = direction * HIT_KNOCKBACK.horizontalSpeed;
      this.vy = -HIT_KNOCKBACK.verticalSpeed;
      this.grounded = false;
      this.currentPlatform = null;
    }

    activateBlaster() {
      this.blasterTimer = BLASTER.duration;
    }

    hasBlaster() {
      return this.blasterTimer > 0;
    }

    tryFire(input) {
      // Dedicated fire input -- deliberately not Space/K, which are jump and jetpack
      // thrust, so firing can never eat a jump or vice versa.
      const firePressed = input.wasPressed('KeyF') || input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight');
      if (!this.hasBlaster() || !firePressed) return null;
      this.isFiringPose = true;
      this.firingPoseTimer = BLASTER.firingPoseDuration;
      const muzzleX = this.facing === 1 ? this.x + this.width : this.x;
      const muzzleY = this.y + this.height / 2;
      return { x: muzzleX, y: muzzleY, direction: this.facing };
    }

    activateJetpack() {
      this.hasJetpack = true;
      this.jetpackFuel = JETPACK.maxFuel;
    }

    resetTo(x, y) {
      this.x = x;
      this.y = y - this.height;
      this.vx = 0;
      this.vy = 0;
      this.grounded = false;
      this.currentPlatform = null;
      this.dropThroughPlatform = null;
      this.dropThroughTimer = 0;
    }

    _setHeight(nextHeight) {
      if (nextHeight === this.height) return;
      this.y += this.height - nextHeight; // keep feet planted when the hitbox resizes
      this.height = nextHeight;
    }

    update(dt, input, platforms, groundSegments = [GROUND], worldWidth = CANVAS_WIDTH) {
      const moveLeft = input.isDown('ArrowLeft') || input.isDown('KeyH');
      const moveRight = input.isDown('ArrowRight') || input.isDown('KeyL');
      // Jump/thrust (K/Up/Space) and fire (F/Shift, see tryFire) are on separate keys,
      // so Space always jumps here regardless of whether the blaster is equipped.
      const jumpPressed = input.wasPressed('ArrowUp') || input.wasPressed('KeyK') || input.wasPressed('Space');
      const dropHeld = input.isDown('ArrowDown') || input.isDown('KeyJ');
      const dropPressed = input.wasPressed('ArrowDown') || input.wasPressed('KeyJ');

      // --- Drop-through (one-shot) vs crouch (held) ---
      if (dropPressed && this.grounded && this.currentPlatform && this.currentPlatform.dropThrough) {
        this.dropThroughPlatform = this.currentPlatform;
        this.dropThroughTimer = PHYSICS.dropThroughDuration;
        this.grounded = false;
        this.currentPlatform = null;
      }

      this.crouching = dropHeld && this.grounded && !this.dropThroughPlatform;
      this._setHeight(this.crouching ? this.crouchHeight : this.standHeight);

      // --- Horizontal movement ---
      const speedCap = PHYSICS.maxRunSpeed * (this.crouching ? PHYSICS.crouchSpeedMultiplier : 1);
      if (!this.crouching && moveLeft && !moveRight) {
        this.vx -= PHYSICS.moveAccel * dt;
        this.facing = -1;
      } else if (!this.crouching && moveRight && !moveLeft) {
        this.vx += PHYSICS.moveAccel * dt;
        this.facing = 1;
      } else {
        const decel = PHYSICS.friction * dt;
        if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel);
      }
      this.vx = Math.max(-speedCap, Math.min(speedCap, this.vx));

      // --- Jump ---
      if (jumpPressed && this.grounded && !this.crouching) {
        this.vy = PHYSICS.jumpVelocity;
        this.grounded = false;
        this.currentPlatform = null;
        this.game.assets.playSfx('sfx_jump');
      }

      // --- Gravity ---
      this.vy = Math.min(this.vy + PHYSICS.gravity * dt, PHYSICS.maxFallSpeed);

      // --- Jetpack thrust (holding jump while airborne, if unlocked and fueled) ---
      const thrustHeld =
        this.hasJetpack &&
        !this.grounded &&
        (input.isDown('ArrowUp') || input.isDown('KeyK') || input.isDown('Space'));
      this.isThrusting = thrustHeld && this.jetpackFuel > 0;
      if (this.isThrusting) {
        this.vy = Math.max(this.vy + JETPACK.thrustAccel * dt, JETPACK.maxUpSpeed);
        this.jetpackFuel = Math.max(0, this.jetpackFuel - JETPACK.drainRate * dt);
      }

      // --- Integrate + collide ---
      const prevBottom = this.y + this.height;
      this.x = Math.max(0, Math.min(worldWidth - this.width, this.x + this.vx * dt));
      this.y += this.vy * dt;

      if (this.y < 0) {
        this.y = 0;
        this.vy = Math.max(this.vy, 0); // jetpack thrust can't carry the player above the canvas
      }

      this._resolveVerticalCollisions(prevBottom, platforms, groundSegments);

      if (this.grounded && this.hasJetpack) {
        this.jetpackFuel = Math.min(JETPACK.maxFuel, this.jetpackFuel + JETPACK.rechargeRate * dt);
      }

      if (this.dropThroughTimer > 0) {
        this.dropThroughTimer -= dt;
        if (this.dropThroughTimer <= 0) {
          this.dropThroughTimer = 0;
          this.dropThroughPlatform = null;
        }
      }

      if (this.invulnerable) {
        this.invulnTimer -= dt;
        if (this.invulnTimer <= 0) {
          this.invulnerable = false;
          this.invulnTimer = 0;
        }
      }

      if (this.blasterTimer > 0 && !this.infiniteBlaster) {
        this.blasterTimer = Math.max(0, this.blasterTimer - dt);
      }

      if (this.firingPoseTimer > 0) {
        this.firingPoseTimer -= dt;
        if (this.firingPoseTimer <= 0) {
          this.firingPoseTimer = 0;
          this.isFiringPose = false;
        }
      }

      this._updateAnimation(dt);
    }

    _resolveVerticalCollisions(prevBottom, platforms, groundSegments) {
      if (this.vy < 0) return; // moving up: never land, always pass through platform tops

      const candidates = [...groundSegments, ...platforms];
      this.grounded = false;
      this.currentPlatform = null;

      for (const platform of candidates) {
        if (platform === this.dropThroughPlatform) continue;

        const overlapsX = this.x + this.width > platform.x && this.x < platform.x + platform.width;
        if (!overlapsX) continue;

        const newBottom = this.y + this.height;
        if (prevBottom <= platform.y + 0.01 && newBottom >= platform.y) {
          this.y = platform.y - this.height;
          this.vy = 0;
          this.grounded = true;
          this.currentPlatform = platform;
          break;
        }
      }
    }

    _updateAnimation(dt) {
      let nextState = 'idle';
      if (!this.grounded) {
        nextState = 'jump';
      } else if (this.crouching) {
        nextState = 'crouch';
      } else if (Math.abs(this.vx) > 15) {
        nextState = 'run';
      }

      if (nextState !== this.animState) {
        this.animState = nextState;
        this.animFrame = 0;
        this.animTimer = 0;
      }

      if (nextState === 'jump') {
        // Pose follows the velocity arc rather than looping on a timer.
        const t = Math.max(-1, Math.min(1, this.vy / PHYSICS.maxFallSpeed));
        this.animFrame = Math.min(4, Math.floor((t + 1) * 2.5));
        return;
      }

      if (nextState === 'crouch') {
        this.animFrame = 0;
        return;
      }

      const frames = HERO_FRAMES[nextState];
      this.animTimer += dt;
      const frameDuration = 1 / HERO_FRAME_RATE;
      if (this.animTimer >= frameDuration) {
        this.animTimer -= frameDuration;
        this.animFrame = (this.animFrame + 1) % frames.length;
      }
    }

    render(ctx) {
      if (this.invulnerable && Math.floor(this.invulnTimer * 10) % 2 === 0) {
        return; // flicker off this frame while invulnerable after taking a hit
      }

      const assets = this.game.assets;

      let sheet;
      let frame;
      let dstW;
      let dstH;

      if (this.isFiringPose) {
        sheet = assets.getImage('hero_action');
        frame = ACTION_FIRE_FRAME;
        dstW = frame.w * HERO_SCALE;
        dstH = frame.h * HERO_SCALE;
      } else if (this.isThrusting) {
        sheet = assets.getImage('hero_action');
        frame = ACTION_FLY_FRAME;
        dstW = frame.w * HERO_SCALE;
        dstH = frame.h * HERO_SCALE;
      } else if (this.hasBlaster()) {
        // Keep the blaster visibly equipped across idle/run/jump, not just the
        // instant a shot fires -- otherwise the player looks unarmed between shots.
        sheet = assets.getImage('hero_action');
        frame = ACTION_FIRE_FRAME;
        dstW = frame.w * HERO_SCALE;
        dstH = frame.h * HERO_SCALE;
      } else {
        sheet = assets.getImage('hero_movement');
        const isCrouch = this.animState === 'crouch';
        const frameSet = isCrouch ? HERO_FRAMES.idle : HERO_FRAMES[this.animState];
        frame = frameSet[this.animFrame] || frameSet[0];
        const scaleY = isCrouch ? HERO_SCALE * 0.6 : HERO_SCALE;
        dstW = frame.w * HERO_SCALE;
        dstH = frame.h * scaleY;
      }

      if (!sheet) return;

      const feetX = this.x + this.width / 2;
      const feetY = this.y + this.height;
      const dstX = feetX - dstW / 2;
      const dstY = feetY - dstH;

      ctx.save();
      if (this.facing === -1) {
        ctx.translate(dstX + dstW, dstY);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, 0, 0, dstW, dstH);
      } else {
        ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, dstX, dstY, dstW, dstH);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------
  // Level entities: collectibles, flying keycap enemies, portals
  // ---------------------------------------------------------------------

  function aabbOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  // Shared 8-bit "HP tick" HUD renderer -- used for both the player's and the
  // boss's health so the two read as the same visual language, just recolored.
  function drawHealthTicks(ctx, { x, y, count, maxCount, color, emptyColor, label, segW = 36, segH = 18, gap = 4 }) {
    for (let i = 0; i < maxCount; i++) {
      const tx = x + i * (segW + gap);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, y, segW, segH);
      ctx.fillStyle = i < count ? color : emptyColor;
      ctx.fillRect(tx + 2, y + 2, segW - 4, segH - 4);
    }
    if (label) {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8e8f0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, y + segH + 6);
    }
  }

  // 8x8 pixel-grid speaker silhouette (box + cone), drawn cell-by-cell so it
  // reads as "pixelated" rather than a smooth icon-font glyph.
  const MUTE_ICON_CELL = 2;
  const MUTE_ICON_MARGIN = 6;
  const MUTE_ICON_PATTERN = [
    '......##',
    '.....###',
    '..##.###',
    '.###.###',
    '.###.###',
    '..##.###',
    '.....###',
    '......##',
  ];

  // Drawn globally (by Game, over whatever scene is active) so it's visible
  // everywhere; other top-right HUD elements leave MUTE_ICON_RESERVED_WIDTH
  // of clearance so nothing overlaps it.
  const MUTE_ICON_RESERVED_WIDTH = 34;

  function drawMuteIcon(ctx, muted) {
    const cell = MUTE_ICON_CELL;
    const gridW = MUTE_ICON_PATTERN[0].length;
    const gridH = MUTE_ICON_PATTERN.length;
    const extraW = muted ? 0 : cell * 4; // room for the sound-wave marks
    const totalW = gridW * cell + extraW;
    const x = CANVAS_WIDTH - MUTE_ICON_MARGIN - totalW;
    const y = MUTE_ICON_MARGIN;
    const color = muted ? '#dc5050' : '#50dc78';

    ctx.save();
    ctx.fillStyle = color;
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < gridW; col++) {
        if (MUTE_ICON_PATTERN[row][col] === '#') {
          ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
        }
      }
    }

    if (muted) {
      ctx.strokeStyle = color;
      ctx.lineWidth = cell;
      ctx.beginPath();
      ctx.moveTo(x + 5 * cell, y + 1 * cell);
      ctx.lineTo(x + 8 * cell, y + 7 * cell);
      ctx.moveTo(x + 8 * cell, y + 1 * cell);
      ctx.lineTo(x + 5 * cell, y + 7 * cell);
      ctx.stroke();
    } else {
      ctx.fillRect(x + gridW * cell + cell, y + 3 * cell, cell, cell * 2);
      ctx.fillRect(x + gridW * cell + cell * 3, y + 2 * cell, cell, cell * 4);
    }
    ctx.restore();
  }

  class Collectible {
    constructor({ x, y, type = 'coin' }) {
      this.type = type;
      const isOrbLike = type === 'orb' || type === 'powerup';
      this.frames = isOrbLike ? ORB_FRAMES : COIN_FRAMES;
      this.scale = isOrbLike ? ORB_SCALE : COIN_SCALE;
      this.value = type === 'orb' ? 50 : type === 'coin' ? 10 : 0; // powerup grants no cybercoins
      this.width = isOrbLike ? 34 : 26;
      this.height = this.width;
      this.x = x - this.width / 2;
      this.y = y - this.height / 2;
      this.collected = false;
      this.animFrame = 0;
      this.animTimer = 0;
      this.frameRate = isOrbLike ? 5 : 10;
      this.age = 0; // continuous clock for the powerup pulse ring, unaffected by frame cycling
    }

    update(dt) {
      if (this.collected) return;
      this.age += dt;
      this.animTimer += dt;
      const frameDuration = 1 / this.frameRate;
      if (this.animTimer >= frameDuration) {
        this.animTimer -= frameDuration;
        this.animFrame = (this.animFrame + 1) % this.frames.length;
      }
    }

    render(ctx, sheet) {
      if (this.collected || !sheet) return;
      const frame = this.frames[this.animFrame];
      const dstW = frame.w * this.scale;
      const dstH = frame.h * this.scale;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;

      if (this.type === 'powerup') {
        const pulse = 0.5 + 0.5 * Math.sin(this.age * 6);
        ctx.save();
        ctx.strokeStyle = `rgba(74, 215, 255, ${0.35 + 0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, this.width / 2 + 4 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, cx - dstW / 2, cy - dstH / 2, dstW, dstH);
    }
  }

  class Enemy {
    constructor({ x, y, speed, frameIndex }) {
      this.width = 40;
      this.height = 40;
      this.x = x - this.width / 2;
      this.y = y - this.height / 2;
      this.speed = speed;
      this.frameIndex = frameIndex % KEYCAP_FRAMES.length;
      this.bobPhase = Math.random() * Math.PI * 2;
      this.bobTimer = 0;
    }

    // Fixed linear drift, never homing/tracking the player -- so keycaps move
    // predictably and the player can learn to read and react to them.
    update(dt, worldWidth = CANVAS_WIDTH) {
      this.x = Math.max(0, Math.min(worldWidth - this.width, this.x - this.speed * dt));
      this.bobTimer += dt;
    }

    render(ctx, sheet) {
      if (!sheet) return;
      const frame = KEYCAP_FRAMES[this.frameIndex];
      const dstW = frame.w * KEYCAP_SCALE;
      const dstH = frame.h * KEYCAP_SCALE;
      const bob = Math.sin(this.bobTimer * 4 + this.bobPhase) * 5;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2 + bob;
      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, cx - dstW / 2, cy - dstH / 2, dstW, dstH);
    }
  }

  class Portal {
    constructor({ x, y, target }) {
      this.width = 64;
      this.height = 96;
      this.x = x - this.width / 2;
      this.y = y - this.height;
      this.target = target;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    update(dt) {
      this.animTimer += dt;
      const frameDuration = 1 / 8;
      if (this.animTimer >= frameDuration) {
        this.animTimer -= frameDuration;
        // Loop the idle frames only; the final burst frame is reserved for later use.
        this.animFrame = (this.animFrame + 1) % (PORTAL_FRAMES.length - 1);
      }
    }

    render(ctx, sheet) {
      if (!sheet) return;
      const frame = PORTAL_FRAMES[this.animFrame];
      const dstW = frame.w * PORTAL_SCALE;
      const dstH = frame.h * PORTAL_SCALE;
      const cx = this.x + this.width / 2;
      const bottom = this.y + this.height;
      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, cx - dstW / 2, bottom - dstH, dstW, dstH);
    }
  }

  // The standard level-exit marker -- visually distinct from Portal (vector-drawn,
  // no sprite sheet) so the main progression path never looks like the hidden
  // Secret Portal bonus warp.
  class ExitFlag {
    constructor({ x, y, target }) {
      this.width = 40;
      this.height = 120;
      this.x = x - this.width / 2;
      this.y = y - this.height;
      this.target = target;
      this.waveTimer = Math.random() * Math.PI * 2;
    }

    update(dt) {
      this.waveTimer += dt;
    }

    render(ctx) {
      const poleX = this.x + this.width / 2 - 2;
      const poleTop = this.y;
      const poleBottom = this.y + this.height;
      const wave = Math.sin(this.waveTimer * 4) * 4;

      ctx.fillStyle = '#8a8a9a';
      ctx.fillRect(poleX, poleTop, 4, this.height);

      ctx.fillStyle = '#20202a';
      ctx.fillRect(this.x - 8, poleBottom - 4, this.width + 16, 10);

      ctx.fillStyle = '#50dc78';
      ctx.beginPath();
      ctx.moveTo(poleX + 4, poleTop + 8);
      ctx.lineTo(poleX + 4 + 34, poleTop + 22 + wave);
      ctx.lineTo(poleX + 4, poleTop + 36);
      ctx.closePath();
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText('EXIT', poleX + 2, poleTop - 4);
    }
  }

  class Laser {
    constructor({
      x,
      y,
      direction,
      width = BLASTER.laserWidth,
      height = BLASTER.laserHeight,
      speed = BLASTER.laserSpeed,
      color = '#4ad7ff',
      fromBoss = false,
    }) {
      this.width = width;
      this.height = height;
      this.direction = direction;
      this.speed = speed;
      this.color = color;
      this.fromBoss = fromBoss; // distinguishes the boss's beam from the player's, for collision targeting
      this.x = direction === -1 ? x - this.width : x;
      this.y = y - this.height / 2;
      this.alive = true;
    }

    update(dt, worldWidth = CANVAS_WIDTH) {
      this.x += this.direction * this.speed * dt;
      if (this.x + this.width < 0 || this.x > worldWidth) {
        this.alive = false;
      }
    }

    render(ctx) {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }
  }

  class Boss {
    constructor({ x, y }) {
      this.x = x; // horizontal position -- now patrols, see the vx/patrol fields below
      this.baseY = y;
      this.width = 140 * BOSS_SIZE_SCALE;
      this.height = 160 * BOSS_SIZE_SCALE; // generous enough that a standing shot connects across the whole bob cycle
      this.maxHp = BOSS.maxHp;
      this.hp = this.maxHp;

      this.state = 'idle'; // idle -> telegraph -> firing -> idle
      this.stateTimer = 0;
      this.attackCooldown = 1.0; // first attack arrives quickly

      // Horizontal patrol: paces between the arena's middle and its right edge,
      // reversing direction at each bound -- see the movement step in update().
      this.patrolMinX = CANVAS_WIDTH / 2;
      this.patrolMaxX = CANVAS_WIDTH - this.width / 2 - 20;
      this.vx = -BOSS.moveSpeed;

      this.bobTimer = Math.random() * Math.PI * 2;
      this.animFrame = 0;
      this.animTimer = 0;

      this.hitFlashTimer = 0;
      this.isInvincible = false; // true for BOSS.hitCooldownDuration after each landed hit
      this.invincibleTimer = 0;
      this.recoilTimer = 0; // drives the brief knockback nudge applied in render()
      this.defeated = false;
      this.explosionTimer = 0;
    }

    get currentY() {
      return this.baseY + Math.sin(this.bobTimer * BOSS.bobSpeed) * BOSS.bobAmplitude;
    }

    get bounds() {
      return { x: this.x - this.width / 2, y: this.currentY - this.height / 2, width: this.width, height: this.height };
    }

    // Purely cosmetic -- recoil never shifts bounds, so it can't affect hit detection.
    get recoilOffsetX() {
      if (this.recoilTimer <= 0) return 0;
      return (this.recoilTimer / BOSS.recoilDuration) * BOSS.recoilDistance;
    }

    // Returns true only if the hit actually landed (not defeated, not mid-cooldown) --
    // callers use this to gate hit sfx/explosion triggers to real, strictly-one-tick hits.
    takeDamage(amount) {
      if (this.defeated || this.isInvincible) return false;
      this.hp = Math.max(0, this.hp - amount);
      this.hitFlashTimer = BOSS.hitFlashDuration;
      this.isInvincible = true;
      this.invincibleTimer = BOSS.hitCooldownDuration;
      this.recoilTimer = BOSS.recoilDuration;
      if (this.hp <= 0) {
        this.defeated = true;
        this.isInvincible = false; // the explosion sequence takes over from here
        this.explosionTimer = BOSS.explosionDuration;
      }
      return true;
    }

    // Returns a shot descriptor the instant it fires, or null otherwise.
    update(dt) {
      this.bobTimer += dt;

      if (this.defeated) {
        this.explosionTimer = Math.max(0, this.explosionTimer - dt);
        return null;
      }

      if (this.hitFlashTimer > 0) {
        this.hitFlashTimer -= dt;
      }

      if (this.invincibleTimer > 0) {
        this.invincibleTimer -= dt;
        if (this.invincibleTimer <= 0) {
          this.invincibleTimer = 0;
          this.isInvincible = false;
        }
      }

      if (this.recoilTimer > 0) {
        this.recoilTimer = Math.max(0, this.recoilTimer - dt);
      }

      // Horizontal patrol -- bounces between the arena middle and its right edge.
      this.x += this.vx * dt;
      if (this.x <= this.patrolMinX) {
        this.x = this.patrolMinX;
        this.vx = Math.abs(this.vx);
      } else if (this.x >= this.patrolMaxX) {
        this.x = this.patrolMaxX;
        this.vx = -Math.abs(this.vx);
      }

      this.animTimer += dt;
      if (this.animTimer >= 0.3) {
        this.animTimer -= 0.3;
        this.animFrame = (this.animFrame + 1) % BOSS_FRAMES.idle.length;
      }

      if (this.state === 'idle') {
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
          this.state = 'telegraph';
          this.stateTimer = BOSS.telegraphDuration;
        }
        return null;
      }

      if (this.state === 'telegraph') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'firing';
          this.stateTimer = BOSS.firingDuration;
          const bounds = this.bounds;
          return { x: bounds.x, y: this.currentY, direction: -1 };
        }
        return null;
      }

      // state === 'firing'
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.attackCooldown = BOSS.attackIntervalMin + Math.random() * (BOSS.attackIntervalMax - BOSS.attackIntervalMin);
      }
      return null;
    }

    render(ctx, sheet) {
      if (!sheet) return;
      const cy = this.currentY;

      let frame;
      if (this.defeated) {
        frame = this.explosionTimer > BOSS.explosionDuration * 0.4 ? BOSS_FRAMES.explosion : BOSS_FRAMES.wreck;
      } else if (this.hitFlashTimer > 0) {
        frame = BOSS_FRAMES.hit;
      } else if (this.state === 'telegraph') {
        frame = BOSS_FRAMES.telegraph;
      } else if (this.state === 'firing') {
        frame = BOSS_FRAMES.firing;
      } else if (this.hp < this.maxHp * 0.3) {
        frame = BOSS_FRAMES.smoke;
      } else {
        frame = BOSS_FRAMES.idle[this.animFrame];
      }

      const dstW = frame.w * BOSS_SCALE;
      const dstH = frame.h * BOSS_SCALE;
      const dstX = this.x - dstW / 2 + this.recoilOffsetX;
      const dstY = cy - dstH / 2;

      if (!this.defeated && this.isInvincible) {
        // Strobe red/white for the whole hit-cooldown window -- the visual read on
        // "can't be hurt again yet", distinct from the brief BOSS_FRAMES.hit pose.
        const flashColor = Math.floor(this.invincibleTimer * 20) % 2 === 0 ? '#ffffff' : '#ff2d50';
        drawTintedSprite(ctx, sheet, frame, dstX, dstY, dstW, dstH, flashColor);
      } else {
        ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, dstX, dstY, dstW, dstH);
      }
    }
  }

  // Tints a sprite draw by recoloring only its already-opaque pixels, letting us
  // reuse one source image (the orb) for both the gold jetpack pickup glow and
  // the flame-colored thrust particles, instead of needing dedicated art.
  function drawTintedSprite(ctx, sheet, frame, dstX, dstY, dstW, dstH, tintColor) {
    ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, dstX, dstY, dstW, dstH);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintColor;
    ctx.fillRect(dstX, dstY, dstW, dstH);
    ctx.globalCompositeOperation = 'source-over';
  }

  class JetpackPickup {
    constructor({ x, y }) {
      this.width = 40;
      this.height = 40;
      this.x = x - this.width / 2;
      this.y = y - this.height / 2;
      this.collected = false;
      this.animFrame = 0;
      this.animTimer = 0;
      this.age = 0;
    }

    update(dt) {
      if (this.collected) return;
      this.age += dt;
      this.animTimer += dt;
      const frameDuration = 1 / 5;
      if (this.animTimer >= frameDuration) {
        this.animTimer -= frameDuration;
        this.animFrame = (this.animFrame + 1) % ORB_FRAMES.length;
      }
    }

    render(ctx, sheet) {
      if (this.collected || !sheet) return;
      const frame = ORB_FRAMES[this.animFrame];
      const dstW = frame.w * ORB_SCALE * 1.3;
      const dstH = frame.h * ORB_SCALE * 1.3;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const pulse = 0.5 + 0.5 * Math.sin(this.age * 5);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 170, 40, ${0.4 + 0.4 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, this.width / 2 + 6 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawTintedSprite(ctx, sheet, frame, cx - dstW / 2, cy - dstH / 2, dstW, dstH, 'rgba(255, 170, 40, 0.5)');
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffaa28';
      ctx.fillText('JETPACK', cx, cy - dstH / 2 - 10);
    }
  }

  class ThrustParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 40;
      this.vy = 80 + Math.random() * 60;
      this.life = 0.25 + Math.random() * 0.15;
      this.age = 0;
      this.size = 7 + Math.random() * 6;
    }

    update(dt) {
      this.age += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    get alive() {
      return this.age < this.life;
    }

    render(ctx, sheet) {
      if (!sheet) return;
      const t = this.age / this.life;
      const frame = ORB_FRAMES[0];
      const size = this.size * (1 - t * 0.5);
      const tint = t < 0.5 ? 'rgba(255, 220, 90, 0.85)' : 'rgba(255, 100, 30, 0.85)';

      ctx.save();
      ctx.globalAlpha = 1 - t;
      drawTintedSprite(ctx, sheet, frame, this.x - size / 2, this.y - size / 2, size, size, tint);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------

  class StartMenuScene {
    constructor(game) {
      this.game = game;
      this.blinkTimer = 0;
      this.blinkVisible = true;
      this.blinkInterval = 0.5;
    }

    enter() {
      this.blinkTimer = 0;
      this.blinkVisible = true;
      this.game.assets.stopAllMusic();
      this.game.assets.playMusic('bgm_intro', { volume: MUSIC_VOLUME, loop: true });
    }

    update(dt, input) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= this.blinkInterval) {
        this.blinkTimer -= this.blinkInterval;
        this.blinkVisible = !this.blinkVisible;
      }

      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.game.assets.playSfx('sfx_select');
        this.game.scenes[SceneState.GAMEPLAY].currentLevel = 1; // starting a game is always a fresh run
        this.game.setScene(SceneState.GAMEPLAY);
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const bg = this.game.assets.getImage('bg_start_screen');

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
      }

      // Dark scrim so the title stays readable over any background art.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 8-bit styled title with a hard drop-shadow for that pixel-font look.
      const titleY = h / 2 - 40;
      ctx.font = '32px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText('TRAPPED IN VIM', w / 2 + 4, titleY + 4);
      ctx.fillStyle = '#50dc78';
      ctx.fillText('TRAPPED IN VIM', w / 2, titleY);

      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(':wq!', w / 2 + 3, titleY + 48 + 3);
      ctx.fillStyle = '#f0d050';
      ctx.fillText(':wq!', w / 2, titleY + 48);

      if (this.blinkVisible) {
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#e8e8f0';
        ctx.fillText('PRESS ENTER OR SPACE TO START', w / 2, h - 60);
      }
    }
  }

  class GameplayScene {
    constructor(game) {
      this.game = game;
      this.player = null;
      this.levelKey = null;
      this.currentLevel = 1; // 1 or 2 -- which level a Game Over retry reloads into
      this.background = null;
      this.platforms = [];
      this.groundSegments = [GROUND];
      this.worldWidth = CANVAS_WIDTH;
      this.camera = { x: 0, width: CANVAS_WIDTH };
      this.coins = [];
      this.enemies = [];
      this.enemySpawning = false;
      this.enemySpawnCooldown = 0;
      this.lastEnemySpawnX = null;
      this.nextEnemyAltitude = 'ground';
      this.nextEnemyFrame = 0;
      this.portals = [];
      this.exits = [];
      this.lasers = [];
      this.fallingItems = []; // secret room coin rain + falling jetpack, see _updateSecretRoomRain
      this.rainActive = false;
      this.rainSpawnCooldown = 0;
      this.secretRoomTimeRemaining = 0; // bonus window left -- the exit stays inert until this hits 0
      this.jetpackDropTimer = 0;
      this.jetpackDropped = false;
      this.thrustParticles = [];
      this.cybercoins = 0;
      this.damageTaken = 0; // health = maxHealth - damageTaken, so growing maxHealth also grants a free tick
      this.coinsForExtraLife = 0; // progress toward the next deterministic +1 HP tick (see _collectCoinValue)
      this.healFlashTimer = 0;
      this.portalCooldown = 0;
      this.pendingCompletion = null;
      this._resuming = false;
      this._pausingForLevelComplete = false;
      this._wasThrusting = false;
    }

    // maxHealth grows with cybercoins collected (a reward for exploring), so it's
    // derived rather than stored -- see damageTaken below.
    get maxHealth() {
      return Math.min(
        PLAYER_HEALTH.maxTicks,
        PLAYER_HEALTH.baseTicks + Math.floor(this.cybercoins / PLAYER_HEALTH.cybercoinsPerBonusTick)
      );
    }

    get health() {
      return Math.max(0, this.maxHealth - this.damageTaken);
    }

    // Deterministic reward: every PLAYER_HEALTH.coinsPerHeal cybercoins collected
    // (tracked via a running counter, not the total) restores exactly one HP tick.
    // A loop (not a single if) so a single high-value orb that crosses more than
    // one threshold at once grants every tick it earned, not just one.
    _collectCoinValue(value) {
      this.cybercoins += value;
      this.coinsForExtraLife += value;
      while (this.coinsForExtraLife >= PLAYER_HEALTH.coinsPerHeal) {
        this.coinsForExtraLife -= PLAYER_HEALTH.coinsPerHeal;
        this._grantHealTick();
      }
    }

    _grantHealTick() {
      if (this.damageTaken <= 0) return; // already at full health -- nothing to restore
      this.damageTaken -= 1;
      this.healFlashTimer = PLAYER_HEALTH.healFlashDuration;
      this.game.assets.playSfx('sfx_select');
    }

    enter() {
      if (this._resuming) {
        // Coming back from the LEVEL_COMPLETE screen: level/player state was already
        // prepared by _loadLevel(), and the music never stopped -- just keep going.
        this._resuming = false;
        return;
      }
      this.cybercoins = 0;
      this.damageTaken = 0;
      this.coinsForExtraLife = 0;
      this.healFlashTimer = 0;
      this.player = new Player(this.game, 0, GROUND.y);
      // A Game Over retry reloads whichever level the player died in (currentLevel
      // is left alone here); StartMenuScene and WinScene reset it to 1 themselves
      // before entering, since those are genuinely fresh runs.
      this._loadLevel(this.currentLevel === 2 ? 'level2' : 'level1');
      this.game.assets.stopAllMusic();
      this.game.assets.playMusic('bgm_gameplay', { volume: MUSIC_VOLUME, loop: true });
    }

    exit() {
      // The thrust loop can never keep running once gameplay updates stop.
      this.game.assets.stopMusic('sfx_jetpack');
      this._wasThrusting = false;

      if (this._pausingForLevelComplete) {
        // Leaving only to show the intermediate status screen -- keep the music going.
        this._pausingForLevelComplete = false;
        return;
      }
      this.game.assets.stopMusic('bgm_gameplay');
    }

    _loadLevel(levelKey) {
      const data = LEVELS[levelKey];
      this.levelKey = levelKey;
      if (levelKey === 'level1' || levelKey === 'level2') {
        this.currentLevel = levelKey === 'level2' ? 2 : 1;
      }
      this.background = data.background;
      this.platforms = data.platforms;
      this.groundSegments = data.ground || [GROUND];
      this.worldWidth = data.worldWidth || CANVAS_WIDTH;
      this.camera.x = 0;
      this.coins = data.coins.map((c) => new Collectible(c));
      this.enemies = data.enemies.map((e, i) => new Enemy({ ...e, frameIndex: i }));
      this.enemySpawning = this.worldWidth > CANVAS_WIDTH;
      this.enemySpawnCooldown = KEYCAP_SPAWN.minIntervalSeconds;
      this.lastEnemySpawnX = null;
      this.nextEnemyAltitude = 'ground';
      this.nextEnemyFrame = this.enemies.length;
      this.portals = data.portals.map((p) => new Portal(p));
      this.exits = (data.exits || []).map((e) => new ExitFlag(e));
      this.lasers = [];
      this.fallingItems = [];
      this.rainActive = levelKey === 'secretRoom';
      this.rainSpawnCooldown = SECRET_ROOM_RAIN.coinSpawnInterval;
      this.secretRoomTimeRemaining = this.rainActive ? SECRET_ROOM_RAIN.roomDuration : 0;
      this.jetpackDropTimer = SECRET_ROOM_RAIN.jetpackDropDelay;
      this.jetpackDropped = false;
      this.thrustParticles = [];
      this.game.assets.stopMusic('sfx_jetpack');
      this._wasThrusting = false;
      this.player.resetTo(data.spawn.x, data.spawn.y);
      this.portalCooldown = 0.4; // guards against re-triggering a portal the moment a level loads
    }

    _handleEnemyHit(enemy) {
      if (!this.player.hit()) return;
      this.damageTaken += 1;
      this.game.assets.playSfx('sfx_hurt');
      if (this.health <= 0) {
        // Only a depleted HP pool resets progress -- back to the start of the level.
        this.game.setScene(SceneState.GAME_OVER);
      } else {
        // Non-fatal hit: keep the player's position (no snap back to spawn) and
        // just knock them away from the hazard so i-frames aren't immediately
        // spent re-touching the same enemy.
        const playerCenterX = this.player.x + this.player.width / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        this.player.applyKnockback(playerCenterX <= enemyCenterX ? -1 : 1);
      }
    }

    // Falling out of the level is always fatal -- bypasses hit-invulnerability entirely.
    _handleFatalFall() {
      this.game.assets.playSfx('sfx_hurt');
      this.damageTaken = this.maxHealth;
      this.game.setScene(SceneState.GAME_OVER);
    }

    // Queue/cooldown keycap spawner: paces enemies out so the player always has
    // a fair, readable window to react in -- never a wall of random obstacles.
    _updateEnemySpawner(dt) {
      if (this.enemySpawnCooldown > 0) {
        this.enemySpawnCooldown -= dt;
      }

      const viewportLeft = this.camera.x;
      const viewportRight = this.camera.x + this.camera.width;
      const visibleCount = this.enemies.filter(
        (e) => e.x + e.width > viewportLeft && e.x < viewportRight
      ).length;

      if (this.enemySpawnCooldown > 0 || visibleCount >= KEYCAP_SPAWN.maxVisible) return;

      const spawnX = viewportRight + KEYCAP_SPAWN.spawnAheadPadding;
      if (spawnX > this.worldWidth - 60) return; // stop spawning once nearing the exit

      if (this.lastEnemySpawnX !== null && spawnX - this.lastEnemySpawnX < KEYCAP_SPAWN.minDistancePx) return;

      // Cycle ground (dodge by jumping, K) -> mid (dodge by ducking, J) -> high
      // (upper platform tier -- threatens players riding the tall platforms) in a
      // fixed, predictable rhythm, so the player can read incoming altitude ahead of time.
      const altitude = this.nextEnemyAltitude;
      const cycleIndex = KEYCAP_ALTITUDE_CYCLE.indexOf(altitude);
      this.nextEnemyAltitude = KEYCAP_ALTITUDE_CYCLE[(cycleIndex + 1) % KEYCAP_ALTITUDE_CYCLE.length];
      const y =
        altitude === 'ground' ? KEYCAP_SPAWN.groundY : altitude === 'head' ? KEYCAP_SPAWN.headY : KEYCAP_SPAWN.highY;
      const speed = KEYCAP_SPAWN.minSpeed + Math.random() * (KEYCAP_SPAWN.maxSpeed - KEYCAP_SPAWN.minSpeed);

      this.enemies.push(new Enemy({ x: spawnX, y, speed, frameIndex: this.nextEnemyFrame++ }));
      this.lastEnemySpawnX = spawnX;
      this.enemySpawnCooldown = KEYCAP_SPAWN.minIntervalSeconds;
    }

    // Secret room only: cybercoins (and, once, the jetpack) fall from the ceiling
    // instead of sitting in fixed spots. Anything that reaches the floor uncaught
    // is removed on the spot -- one chance only, no re-falling, no queueing up.
    // New drops stop once secretRoomTimeRemaining runs out, but items already in
    // the air keep falling/resolving normally -- nothing freezes mid-air.
    _updateSecretRoomRain(dt) {
      if (this.secretRoomTimeRemaining > 0) {
        this.secretRoomTimeRemaining = Math.max(0, this.secretRoomTimeRemaining - dt);
      }

      if (this.secretRoomTimeRemaining > 0) {
        this.rainSpawnCooldown -= dt;
        if (this.rainSpawnCooldown <= 0) {
          const x =
            SECRET_ROOM_RAIN.marginX + Math.random() * (CANVAS_WIDTH - SECRET_ROOM_RAIN.marginX * 2);
          // Plain cybercoins only -- the official coin sprite/anim, no orbs.
          this.fallingItems.push(new Collectible({ x, y: SECRET_ROOM_RAIN.spawnY, type: 'coin' }));
          this.rainSpawnCooldown = SECRET_ROOM_RAIN.coinSpawnInterval;
        }
      }

      if (!this.jetpackDropped && this.secretRoomTimeRemaining > 0) {
        this.jetpackDropTimer -= dt;
        if (this.jetpackDropTimer <= 0) {
          this.jetpackDropped = true;
          const dropX = LEVELS.secretRoom.jetpackPickup.x;
          this.fallingItems.push(new JetpackPickup({ x: dropX, y: SECRET_ROOM_RAIN.spawnY }));
        }
      }

      const surviving = [];
      for (const item of this.fallingItems) {
        item.y += SECRET_ROOM_RAIN.fallSpeed * dt;
        item.update(dt); // drives the sprite's own idle animation/pulse, not its fall

        if (aabbOverlap(this.player, item)) {
          if (item instanceof JetpackPickup) {
            this.player.activateJetpack();
            this.game.assets.playSfx('sfx_jetpack');
          } else {
            this._collectCoinValue(item.value);
            this.game.assets.playSfx('sfx_coin');
          }
          continue; // caught -- remove from the array immediately
        }

        if (item.y >= GROUND.y) {
          continue; // touched the floor uncaught -- instant despawn, one chance only
        }

        surviving.push(item);
      }
      this.fallingItems = surviving;
    }

    _triggerPortal(portal) {
      this.game.assets.playSfx('sfx_teleport');
      const target = portal.target;
      if (target.kind === 'level') {
        this._loadLevel(target.levelKey);
      } else if (target.kind === 'scene') {
        this.game.setScene(target.sceneKey);
      } else if (target.kind === 'levelComplete') {
        this.pendingCompletion = {
          header: target.header,
          statLabel: target.statLabel,
          nextLabel: target.nextLabel,
          next: target.next,
          cybercoins: this.cybercoins,
        };
        this._pausingForLevelComplete = true;
        this.game.setScene(SceneState.LEVEL_COMPLETE);
      }
    }

    update(dt, input) {
      this.player.update(dt, input, this.platforms, this.groundSegments, this.worldWidth);

      const maxCameraX = Math.max(0, this.worldWidth - this.camera.width);
      const focusX = this.player.x + this.player.width / 2 - this.camera.width / 2;
      this.camera.x = Math.max(0, Math.min(maxCameraX, focusX));

      if (this.player.y > CANVAS_HEIGHT) {
        this._handleFatalFall();
        return;
      }

      const shot = this.player.tryFire(input);
      if (shot) {
        this.lasers.push(new Laser(shot));
        this.game.assets.playSfx('sfx_laser');
      }
      this.lasers.forEach((laser) => laser.update(dt, this.worldWidth));

      if (this.rainActive) {
        this._updateSecretRoomRain(dt);
      }

      if (this.player.isThrusting) {
        this.thrustParticles.push(
          new ThrustParticle(this.player.x + this.player.width / 2, this.player.y + this.player.height)
        );
      }
      this.thrustParticles.forEach((p) => p.update(dt));
      this.thrustParticles = this.thrustParticles.filter((p) => p.alive);

      if (this.player.isThrusting && !this._wasThrusting) {
        this.game.assets.playMusic('sfx_jetpack', { volume: 0.4, loop: true });
      } else if (!this.player.isThrusting && this._wasThrusting) {
        this.game.assets.stopMusic('sfx_jetpack');
      }
      this._wasThrusting = this.player.isThrusting;

      this.coins.forEach((coin) => {
        coin.update(dt);
        if (coin.collected || !aabbOverlap(this.player, coin)) return;
        coin.collected = true;
        if (coin.type === 'powerup') {
          this.player.activateBlaster();
          this.game.assets.playSfx('sfx_select');
        } else {
          this._collectCoinValue(coin.value);
          this.game.assets.playSfx('sfx_coin');
        }
      });

      if (this.healFlashTimer > 0) {
        this.healFlashTimer = Math.max(0, this.healFlashTimer - dt);
      }

      if (this.enemySpawning) {
        this._updateEnemySpawner(dt);
      }

      const survivingEnemies = [];
      for (const enemy of this.enemies) {
        // Dodged and scrolled off the back of the camera -- despawn to free up
        // the maxVisible budget instead of trailing the player forever.
        if (this.enemySpawning && enemy.x + enemy.width < this.camera.x - 100) {
          continue;
        }

        enemy.update(dt, this.worldWidth);

        const hitByLaser = this.lasers.find((laser) => laser.alive && aabbOverlap(laser, enemy));
        if (hitByLaser) {
          hitByLaser.alive = false;
          this._collectCoinValue(BLASTER.enemyKillBonus);
          this.game.assets.playSfx('sfx_explosion');
          continue; // destroyed -- drop it, skip the player-collision check below
        }

        if (!this.player.invulnerable && aabbOverlap(this.player, enemy)) {
          this._handleEnemyHit(enemy);
        }
        survivingEnemies.push(enemy);
      }
      this.enemies = survivingEnemies;
      this.lasers = this.lasers.filter((laser) => laser.alive);

      this.portals.forEach((portal) => portal.update(dt));
      this.exits.forEach((exit) => exit.update(dt));
      // The secret room's own exit stays inert until its bonus window fully elapses --
      // this is what makes the extended room duration actually matter, not just the rain.
      const exitGated = this.rainActive && this.secretRoomTimeRemaining > 0;
      if (this.portalCooldown > 0) {
        this.portalCooldown -= dt;
      } else if (!exitGated) {
        const hitTransition = [...this.exits, ...this.portals].find((t) => aabbOverlap(this.player, t));
        if (hitTransition) {
          this._triggerPortal(hitTransition);
        }
      }

      if (input.wasPressed('Escape')) {
        this.game.setScene(SceneState.START_MENU);
      }
    }

    _drawPlatform(ctx, platform) {
      ctx.fillStyle = '#3a3a46';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillStyle = '#50dc78';
      ctx.fillRect(platform.x, platform.y, platform.width, 3);
    }

    _renderBackground(ctx) {
      const bg = this.game.assets.getImage(this.background);
      const tiles = Math.ceil(this.worldWidth / CANVAS_WIDTH);
      for (let i = 0; i < tiles; i++) {
        const tileX = i * CANVAS_WIDTH;
        if (bg) {
          ctx.drawImage(bg, tileX, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(tileX, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }
    }

    render(ctx) {
      const assets = this.game.assets;

      // World-space layer: scrolls with the camera. Restored before the HUD so
      // UI stays pinned to the screen regardless of how far the camera has panned.
      ctx.save();
      ctx.translate(-this.camera.x, 0);

      this._renderBackground(ctx);

      this.platforms.forEach((platform) => this._drawPlatform(ctx, platform));

      this.groundSegments.forEach((segment) => {
        ctx.fillStyle = '#20202a';
        ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
        ctx.fillStyle = '#50dc78';
        ctx.fillRect(segment.x, segment.y, segment.width, 3);
      });

      const itemsSheet = assets.getImage('items_and_fx');
      this.exits.forEach((exit) => exit.render(ctx));
      this.portals.forEach((portal) => portal.render(ctx, itemsSheet));
      this.coins.forEach((coin) => coin.render(ctx, itemsSheet));
      this.fallingItems.forEach((item) => item.render(ctx, itemsSheet));
      this.enemies.forEach((enemy) => enemy.render(ctx, itemsSheet));
      this.lasers.forEach((laser) => laser.render(ctx));
      this.thrustParticles.forEach((p) => p.render(ctx, itemsSheet));

      this.player.render(ctx);

      ctx.restore();

      this._renderHud(ctx);
    }

    _renderHud(ctx) {
      if (this.rainActive) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '10px "Press Start 2P", monospace';
        if (this.secretRoomTimeRemaining > 0) {
          ctx.fillStyle = '#4ad7ff';
          ctx.fillText(`BONUS TIME: ${Math.ceil(this.secretRoomTimeRemaining)}s`, CANVAS_WIDTH / 2, 12);
        } else {
          ctx.fillStyle = '#50dc78';
          ctx.fillText('EXIT UNLOCKED!', CANVAS_WIDTH / 2, 12);
        }
      }

      if (this.healFlashTimer > 0) {
        // Brief glow around the HP ticks -- the visual half of the +1 HP cue,
        // fading out over PLAYER_HEALTH.healFlashDuration.
        const t = this.healFlashTimer / PLAYER_HEALTH.healFlashDuration;
        const segW = 36;
        const gap = 4;
        const totalW = this.maxHealth * (segW + gap) - gap;
        ctx.save();
        ctx.strokeStyle = `rgba(80, 220, 120, ${0.3 + 0.5 * t})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(12 - 4, 12 - 4, totalW + 8, 18 + 8);
        ctx.restore();
      }

      drawHealthTicks(ctx, {
        x: 12,
        y: 12,
        count: this.health,
        maxCount: this.maxHealth,
        color: '#50dc78',
        emptyColor: 'rgba(80, 220, 120, 0.15)',
        label: 'HP',
      });

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(232, 232, 240, 0.7)';
      const hintParts = ['H/L: MOVE'];
      hintParts.push(this.player.hasJetpack ? 'HOLD K/UP/SPACE: JUMP+FLY' : 'K/UP/SPACE: JUMP');
      hintParts.push('J/DOWN: CROUCH-DROP');
      if (this.player.hasBlaster()) hintParts.push('F: FIRE!');
      ctx.fillText(hintParts.join('   '), 12, CANVAS_HEIGHT - 12);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#f0d050';
      ctx.fillText(
        `CYBERCOINS ${String(this.cybercoins).padStart(4, '0')}`,
        CANVAS_WIDTH - MUTE_ICON_RESERVED_WIDTH,
        12
      );

      let y = 40;
      if (this.player.hasBlaster()) {
        y = this._renderStatBar(ctx, y, {
          label: `BLASTER ${this.player.blasterTimer.toFixed(1)}s`,
          pct: this.player.blasterTimer / BLASTER.duration,
          color: '#4ad7ff',
        });
      }
      if (this.player.hasJetpack) {
        this._renderStatBar(ctx, y, {
          label: 'JETPACK FUEL',
          pct: this.player.jetpackFuel / JETPACK.maxFuel,
          color: this.player.jetpackFuel > JETPACK.maxFuel * 0.25 ? '#ffaa28' : '#dc5050',
        });
      }
    }

    _renderStatBar(ctx, y, { label, pct, color }) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      ctx.fillText(label, CANVAS_WIDTH - 12, y);

      const barW = 140;
      const barH = 10;
      const barX = CANVAS_WIDTH - 12 - barW;
      const barY = y + 16;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = color;
      ctx.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * pct), barH - 4);

      return barY + barH + 10; // next free y for another stacked indicator
    }
  }

  class LevelCompleteScene {
    constructor(game) {
      this.game = game;
    }

    // Deliberately no stopAllMusic() here: GameplayScene.exit() leaves bgm_gameplay
    // playing through this status screen on purpose, so it can carry on uninterrupted
    // into the next level.
    enter() {}

    update(_dt, input) {
      if (!(input.wasPressed('Enter') || input.wasPressed('Space'))) return;

      const gp = this.game.scenes[SceneState.GAMEPLAY];
      const { next } = gp.pendingCompletion;
      this.game.assets.playSfx('sfx_select');

      if (next.kind === 'level') {
        gp._loadLevel(next.levelKey);
        gp._resuming = true;
        this.game.setScene(SceneState.GAMEPLAY);
      } else {
        // Truly leaving the gameplay loop (e.g. into the boss arena) -- GameplayScene.exit()
        // won't run here since it isn't the current scene, so stop its music ourselves.
        this.game.assets.stopMusic('bgm_gameplay');
        this.game.setScene(next.sceneKey);
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const gp = this.game.scenes[SceneState.GAMEPLAY];
      const info = gp.pendingCompletion;
      const bg = this.game.assets.getImage(gp.background);

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, w, h);

      if (!info) return;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(info.header, w / 2 + 3, h / 2 - 47);
      ctx.fillStyle = '#50dc78';
      ctx.fillText(info.header, w / 2, h / 2 - 50);

      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#f0d050';
      ctx.fillText(`${info.statLabel}: ${info.cybercoins}`, w / 2, h / 2);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(info.nextLabel, w / 2, h / 2 + 50);
    }
  }

  class GameOverScene {
    constructor(game) {
      this.game = game;
      this.blinkTimer = 0;
      this.blinkVisible = true;
    }

    enter() {
      this.blinkTimer = 0;
      this.blinkVisible = true;
      this.game.assets.stopAllMusic();
      this.game.assets.playMusic('jingle_game_over', { volume: 0.7, loop: false });
    }

    update(dt, input) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= 0.5) {
        this.blinkTimer -= 0.5;
        this.blinkVisible = !this.blinkVisible;
      }

      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.game.setScene(SceneState.GAMEPLAY); // retry = reload the level the player died in
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const bg = this.game.assets.getImage('bg_game_over');

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '24px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText('GAME OVER', w / 2 + 3, h / 2 - 47);
      ctx.fillStyle = '#dc5050';
      ctx.fillText('GAME OVER', w / 2, h / 2 - 50);

      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText('SYSTEM CRASH: :q!', w / 2 + 2, h / 2 - 7);
      ctx.fillStyle = '#f0d050';
      ctx.fillText('SYSTEM CRASH: :q!', w / 2, h / 2 - 10);

      if (this.blinkVisible) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#e8e8f0';
        ctx.fillText('PRESS ENTER OR SPACE TO RETRY', w / 2, h / 2 + 40);
      }
    }
  }

  class WinScene {
    constructor(game) {
      this.game = game;
      this.blinkTimer = 0;
      this.blinkVisible = true;
    }

    enter() {
      this.blinkTimer = 0;
      this.blinkVisible = true;
      this.game.assets.stopAllMusic();
      this.game.assets.playMusic('jingle_results', { volume: 0.7, loop: false });
    }

    update(dt, input) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= 0.5) {
        this.blinkTimer -= 0.5;
        this.blinkVisible = !this.blinkVisible;
      }

      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.game.scenes[SceneState.GAMEPLAY].currentLevel = 1; // play again = straight into a fresh run
        this.game.setScene(SceneState.GAMEPLAY);
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const bg = this.game.assets.getImage('bg_you_win');

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText('YOU WIN!', w / 2 + 3, h / 2 - 67);
      ctx.fillStyle = '#50dc78';
      ctx.fillText('YOU WIN!', w / 2, h / 2 - 70);

      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(':wq! EXECUTED', w / 2 + 3, h / 2 - 27);
      ctx.fillStyle = '#f0d050';
      ctx.fillText(':wq! EXECUTED', w / 2, h / 2 - 30);

      const cybercoins = this.game.scenes[SceneState.GAMEPLAY].cybercoins;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(`TOTAL CYBERCOINS: ${cybercoins}`, w / 2, h / 2 + 20);

      if (this.blinkVisible) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#e8e8f0';
        ctx.fillText('PRESS ENTER TO PLAY AGAIN', w / 2, h / 2 + 60);
      }
    }
  }

  class CutsceneScene {
    constructor(game, data) {
      this.game = game;
      this.data = data; // { background, text, next }
    }

    enter() {
      this.game.assets.stopAllMusic(); // cutscenes are narration beats, not scored with music
    }

    update(_dt, input) {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.game.setScene(this.data.next);
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const bg = this.game.assets.getImage(this.data.background);

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(this.data.text, w / 2 + 3, h / 2 + 3);
      ctx.fillStyle = '#50dc78';
      ctx.fillText(this.data.text, w / 2, h / 2);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText('PRESS ENTER OR SPACE TO CONTINUE', w / 2, h / 2 + 60);
    }
  }

  class BossArenaScene {
    constructor(game) {
      this.game = game;
      this.gp = null;
      this.player = null;
      this.boss = null;
      this.lasers = [];
      this.explosionParticles = [];
      this.victoryTriggered = false;
    }

    enter() {
      this.gp = this.game.scenes[SceneState.GAMEPLAY];
      this.player = this.gp.player;
      this.player.resetTo(BOSS_ARENA_SPAWN.x, BOSS_ARENA_SPAWN.y);
      this.player.activateBlaster();
      this.player.infiniteBlaster = true;
      this.explosionParticles = [];
      // y keeps the same ground clearance as before despite the bigger hitbox
      // (bottom edge ~400, 14px above GROUND.y) so a standing player's laser still connects.
      this.boss = new Boss({ x: 650, y: 260 });
      this.lasers = [];
      this.victoryTriggered = false;
      this.game.assets.stopAllMusic();
      this.game.assets.playMusic('bgm_gameplay', { volume: MUSIC_VOLUME, loop: true });
    }

    exit() {
      this.player.infiniteBlaster = false;
      this.game.assets.stopMusic('bgm_gameplay');
    }

    _handlePlayerHit() {
      if (!this.player.hit()) return;
      this.gp.damageTaken += 1;
      this.game.assets.playSfx('sfx_hurt');
      if (this.gp.health <= 0) {
        this.game.setScene(SceneState.GAME_OVER);
      } else {
        this.player.resetTo(BOSS_ARENA_SPAWN.x, BOSS_ARENA_SPAWN.y);
      }
    }

    // Falling out of the arena is always fatal -- bypasses hit-invulnerability entirely.
    _handleFatalFall() {
      this.game.assets.playSfx('sfx_hurt');
      this.gp.damageTaken = this.gp.maxHealth;
      this.game.setScene(SceneState.GAME_OVER);
    }

    _spawnExplosionParticles() {
      const { x, y } = this.boss.bounds;
      const cx = x + this.boss.width / 2;
      const cy = y + this.boss.height / 2;
      for (let i = 0; i < 20; i++) {
        const particle = new ThrustParticle(cx, cy);
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 160;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = 0.5 + Math.random() * 0.4;
        this.explosionParticles.push(particle);
      }
    }

    update(dt, input) {
      this.player.update(dt, input, []);

      if (this.player.y > CANVAS_HEIGHT) {
        this._handleFatalFall();
        return;
      }

      const shot = this.player.tryFire(input);
      if (shot) {
        this.lasers.push(new Laser(shot));
        this.game.assets.playSfx('sfx_laser');
      }

      const bossShot = this.boss.update(dt);
      if (bossShot) {
        this.lasers.push(
          new Laser({
            ...bossShot,
            width: BOSS.laserWidth,
            height: BOSS.laserHeight,
            color: BOSS.laserColor,
            speed: BOSS.laserSpeed,
            fromBoss: true,
          })
        );
        this.game.assets.playSfx('sfx_laser');
      }

      this.lasers.forEach((laser) => laser.update(dt));

      this.lasers.forEach((laser) => {
        if (!laser.alive) return;
        if (!laser.fromBoss && aabbOverlap(laser, this.boss.bounds)) {
          laser.alive = false; // the shot is absorbed either way, even during the hit-cooldown
          const wasDefeated = this.boss.defeated;
          const damageLanded = this.boss.takeDamage(BOSS.playerLaserDamage);
          if (damageLanded) {
            this.game.assets.playSfx('sfx_hurt');
          }
          if (!wasDefeated && this.boss.defeated) {
            this.game.assets.playSfx('sfx_explosion');
            this._spawnExplosionParticles();
          }
        } else if (laser.fromBoss && !this.player.invulnerable && aabbOverlap(laser, this.player)) {
          laser.alive = false;
          this._handlePlayerHit();
        }
      });

      this.explosionParticles.forEach((p) => p.update(dt));
      this.explosionParticles = this.explosionParticles.filter((p) => p.alive);
      this.lasers = this.lasers.filter((laser) => laser.alive);

      if (this.boss.defeated && this.boss.explosionTimer <= 0 && !this.victoryTriggered) {
        this.victoryTriggered = true;
        this.game.setScene(SceneState.CUTSCENE_1);
      }

      if (input.wasPressed('Escape')) {
        this.game.setScene(SceneState.START_MENU);
      }
    }

    render(ctx) {
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      const assets = this.game.assets;
      const bg = assets.getImage('bg_boss_fight');

      if (bg) {
        ctx.drawImage(bg, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#1a0a1a';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = '#20202a';
      ctx.fillRect(GROUND.x, GROUND.y, GROUND.width, GROUND.height);
      ctx.fillStyle = '#50dc78';
      ctx.fillRect(GROUND.x, GROUND.y, GROUND.width, 3);

      this.boss.render(ctx, assets.getImage('boss_monitor'));
      this.explosionParticles.forEach((p) => p.render(ctx, assets.getImage('items_and_fx')));
      this.lasers.forEach((laser) => laser.render(ctx));
      this.player.render(ctx);

      this._renderHud(ctx);
    }

    _renderHud(ctx) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(232, 232, 240, 0.7)';
      ctx.fillText('H/L: MOVE   K/UP/SPACE: JUMP   F: FIRE!', 12, CANVAS_HEIGHT - 20);

      // Player HP (top-left).
      drawHealthTicks(ctx, {
        x: 12,
        y: 12,
        count: this.gp.health,
        maxCount: this.gp.maxHealth,
        color: '#50dc78',
        emptyColor: 'rgba(80, 220, 120, 0.15)',
        label: 'PLAYER',
      });

      // Boss HP (top-right): 8 discrete ticks in neon pink, same block style as the
      // player's, plus the classic ASCII-bar readout as a flavor label underneath.
      const segW = 36;
      const gap = 4;
      const maxTicks = BOSS.maxHp;
      const totalWidth = maxTicks * segW + (maxTicks - 1) * gap;
      const bossX = CANVAS_WIDTH - MUTE_ICON_RESERVED_WIDTH - totalWidth;
      const pipes = '|'.repeat(this.boss.hp) + ' '.repeat(Math.max(0, maxTicks - this.boss.hp));
      drawHealthTicks(ctx, {
        x: bossX,
        y: 12,
        count: this.boss.hp,
        maxCount: maxTicks,
        color: '#ff2d6a',
        emptyColor: 'rgba(255, 45, 106, 0.15)',
      });
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff2d6a';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`MONITOR KERNEL [ ${pipes} ]`, CANVAS_WIDTH - 12, 36);
    }
  }

  // ---------------------------------------------------------------------
  // Game loop + scene state manager
  // ---------------------------------------------------------------------

  class Game {
    constructor(canvas, ctx, assets) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.assets = assets;
      this.input = new InputManager();
      this.lastTime = 0;

      this.scenes = {
        [SceneState.START_MENU]: new StartMenuScene(this),
        [SceneState.GAMEPLAY]: new GameplayScene(this),
        [SceneState.GAME_OVER]: new GameOverScene(this),
        [SceneState.WIN]: new WinScene(this),
        [SceneState.BOSS_ARENA]: new BossArenaScene(this),
        [SceneState.LEVEL_COMPLETE]: new LevelCompleteScene(this),
        [SceneState.CUTSCENE_1]: new CutsceneScene(this, {
          background: 'cutscene_boss_defeat',
          text: 'VIM KERNEL SUCCESSFULLY PATCHED!',
          next: SceneState.CUTSCENE_2,
        }),
        [SceneState.CUTSCENE_2]: new CutsceneScene(this, {
          background: 'cutscene_escape',
          text: 'ESCAPED THE EDITOR AT LAST!',
          next: SceneState.WIN,
        }),
      };
      this.currentSceneKey = null;
      this.currentScene = null;

      this.ctx.imageSmoothingEnabled = false;
    }

    setScene(key) {
      if (this.currentScene && this.currentScene.exit) {
        this.currentScene.exit();
      }
      this.currentSceneKey = key;
      this.currentScene = this.scenes[key];
      if (this.currentScene.enter) {
        this.currentScene.enter();
      }
    }

    start(initialScene = SceneState.START_MENU) {
      this.setScene(initialScene);
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this._loop(t));
    }

    _loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      // Global mute toggle -- works the same in every scene, not just gameplay.
      if (this.input.wasPressed('KeyM')) {
        this.assets.toggleMute();
      }

      // The orientation overlay hides #game-stage in CSS; also pause simulation
      // and stop spending battery on a screen the player can't see or touch.
      if (!window.matchMedia('(orientation: portrait)').matches) {
        this._update(dt);
        this._render();
        this._syncTouchControls();
      }

      this.input.endFrame();
      requestAnimationFrame((t) => this._loop(t));
    }

    // Shows the FIRE button only once the blaster is actually equipped, and only
    // during scenes that have a player to fire it.
    _syncTouchControls() {
      const fireButton = document.getElementById('touch-fire');
      if (!fireButton) return;
      const hasBlaster = Boolean(this.currentScene && this.currentScene.player && this.currentScene.player.hasBlaster());
      fireButton.hidden = !hasBlaster;
    }

    _update(dt) {
      if (this.currentScene && this.currentScene.update) {
        this.currentScene.update(dt, this.input);
      }
    }

    _render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (this.currentScene && this.currentScene.render) {
        this.currentScene.render(ctx);
      }
      drawMuteIcon(ctx, this.assets.muted);
    }
  }

  // ---------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------

  function setUpTouchControls(game) {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    // Belt-and-suspenders against scroll/pinch-zoom/rubber-band bounce, on top of
    // the touch-action: none already set in CSS.
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    const controls = document.getElementById('touch-controls');
    if (!controls) return;
    controls.hidden = false;

    controls.querySelectorAll('.touch-key[data-key]').forEach((el) => {
      game.input.bindTouchButton(el, el.dataset.key);
    });

    // Tapping the bare canvas (i.e. not one of the D-pad buttons) stands in for
    // Enter/Space, since menu and status screens otherwise have no touch affordance.
    game.canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        game.input.simulateTap('Enter');
      },
      { passive: false }
    );
  }

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    const assets = new AssetManager(IMAGE_MANIFEST, AUDIO_MANIFEST);

    drawLoadingScreen(ctx, 0, assets.total, '');

    assets
      .loadAll((loaded, total, key) => {
        drawLoadingScreen(ctx, loaded, total, key);
      })
      .then(() => {
        const game = new Game(canvas, ctx, assets);
        setUpTouchControls(game);
        game.start(SceneState.START_MENU);
      });
  });
})();
