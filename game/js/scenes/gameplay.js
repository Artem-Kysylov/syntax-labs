// Trapped in Vim :: :wq!
// Main side-scrolling gameplay scene: level loading, HUD, collision/pickup
// resolution, the keycap spawner, and the secret room's coin rain.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND,
  SceneState,
  MUSIC_VOLUME,
  PLAYER_HEALTH,
  KEYCAP_SPAWN,
  KEYCAP_ALTITUDE_CYCLE,
  SECRET_ROOM_RAIN,
  BLASTER,
  JETPACK,
  TOP_RIGHT_UI_RESERVED_WIDTH,
} from '../constants.js';
import {
  aabbOverlap,
  drawHealthTicks,
  Player,
  Collectible,
  Enemy,
  Portal,
  ExitFlag,
  Laser,
  JetpackPickup,
  ThrustParticle,
} from '../entities.js';
import { LEVELS } from '../levels.js';

export class GameplayScene {
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
    // Once true, _loadLevel drops Level 2's secret portal entirely -- it's a
    // one-time detour per run, not a repeatable shortcut. Reset alongside the
    // other run-scoped counters below on a genuinely fresh run.
    this.secretPortalConsumed = false;
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
    this.secretPortalConsumed = false;
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

  // spawnOverride lets a portal drop the player at a specific point instead of
  // the level's default spawn -- used by the secret room's exit, which returns
  // the player to Level 2 right next to the secret portal rather than all the
  // way back at the level's start (see LEVELS.secretRoom.portals).
  _loadLevel(levelKey, spawnOverride) {
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
    // Drop the secret portal once it's been used this run -- see secretPortalConsumed.
    this.portals = data.portals
      .filter((p) => !(p.id === 'secretPortal' && this.secretPortalConsumed))
      .map((p) => new Portal(p));
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
    // resetTo() only ever touches position/velocity -- hasJetpack, blasterTimer,
    // etc. all carry over untouched, so flight unlocked in the secret room is
    // still available for the rest of Level 2 after this.
    const spawn = spawnOverride || data.spawn;
    this.player.resetTo(spawn.x, spawn.y);
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
      if (portal.id === 'secretPortal') {
        this.secretPortalConsumed = true; // one-time detour -- _loadLevel drops it from here on
      }
      this._loadLevel(target.levelKey, target.returnTo);
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
      CANVAS_WIDTH - TOP_RIGHT_UI_RESERVED_WIDTH,
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
