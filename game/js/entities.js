// Trapped in Vim :: :wq!
// Player, collectibles, enemies, portals, projectiles, and the boss --
// plus small shared render helpers (aabbOverlap, drawHealthTicks, drawTintedSprite).

import {
  CANVAS_WIDTH,
  GROUND,
  HERO_FRAMES,
  HERO_SCALE,
  HERO_FRAME_RATE,
  ACTION_FIRE_FRAME,
  ACTION_RUN_FRAMES,
  ACTION_STAND_FRAME,
  ACTION_FLY_FRAME,
  PHYSICS,
  HIT_KNOCKBACK,
  BLASTER,
  JETPACK,
  COIN_FRAMES,
  ORB_FRAMES,
  PORTAL_FRAMES,
  KEYCAP_FRAMES,
  COIN_SCALE,
  ORB_SCALE,
  PORTAL_SCALE,
  KEYCAP_SCALE,
  BOSS_FRAMES,
  BOSS_SIZE_SCALE,
  BOSS_SCALE,
  BOSS,
} from './constants.js';

export function aabbOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Shared 8-bit "HP tick" HUD renderer -- used for both the player's and the
// boss's health so the two read as the same visual language, just recolored.
export function drawHealthTicks(ctx, { x, y, count, maxCount, color, emptyColor, label, segW = 36, segH = 18, gap = 4 }) {
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

// Tints a sprite draw by recoloring only its already-opaque pixels, letting us
// reuse one source image (the orb) for both the gold jetpack pickup glow and
// the flame-colored thrust particles, instead of needing dedicated art.
export function drawTintedSprite(ctx, sheet, frame, dstX, dstY, dstW, dstH, tintColor) {
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, dstX, dstY, dstW, dstH);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = tintColor;
  ctx.fillRect(dstX, dstY, dstW, dstH);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------

export class Player {
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
    // Dedicated fire input -- strictly KeyF. Deliberately not Space/K (jump and
    // jetpack thrust) or Shift, so firing can never eat a jump/thrust press or
    // trigger from a stray modifier key.
    const firePressed = input.wasPressed('KeyF');
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
    // Jump/thrust (K/Up/Space) and fire (F only, see tryFire) are on separate keys,
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
      // Cycle the weapon-ready frames while actually moving on the ground (driven
      // by the same animTimer-advanced animFrame as the unarmed run cycle) so
      // holding the blaster doesn't freeze into one static bitmap while running;
      // standing still (vx === 0) always shows the static ready frame instead.
      sheet = assets.getImage('hero_action');
      frame =
        this.grounded && this.vx !== 0
          ? ACTION_RUN_FRAMES[this.animFrame % ACTION_RUN_FRAMES.length]
          : ACTION_STAND_FRAME;
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

export class Collectible {
  constructor({ x, y, type = 'coin' }) {
    this.type = type;
    const isOrbLike = type === 'orb' || type === 'powerup';
    this.frames = isOrbLike ? ORB_FRAMES : COIN_FRAMES;
    this.scale = isOrbLike ? ORB_SCALE : COIN_SCALE;
    // A single coin always counts as exactly +1 cybercoin -- previously this was 10,
    // which (matching PLAYER_HEALTH.coinsPerHeal, also 10) granted a free heal tick
    // on literally every coin picked up instead of every 10th.
    this.value = type === 'orb' ? 50 : type === 'coin' ? 1 : 0; // powerup grants no cybercoins
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

export class Enemy {
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

export class Portal {
  constructor({ x, y, target, id }) {
    this.width = 64;
    this.height = 96;
    this.x = x - this.width / 2;
    this.y = y - this.height;
    this.target = target;
    this.id = id; // optional tag, e.g. 'secretPortal' -- see GameplayScene._triggerPortal
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
export class ExitFlag {
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

export class Laser {
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
    if (this.fromBoss) {
      // Neon energy-bolt look: a few fading afterimages trailing behind its
      // direction of travel, a soft glowing aura, then a bright core on top --
      // same hitbox/shape as before, just styled to read as the boss's attack.
      const trailSteps = 3;
      ctx.shadowBlur = 0;
      for (let i = trailSteps; i >= 1; i--) {
        ctx.globalAlpha = 0.12 * (trailSteps - i + 1);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.direction * i * this.width * 0.7, this.y, this.width, this.height);
      }
      ctx.globalAlpha = 1;

      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);

      const insetX = this.width * 0.28;
      const insetY = this.height * 0.28;
      ctx.shadowBlur = 6;
      ctx.fillStyle = BOSS.laserCoreColor;
      ctx.fillRect(this.x + insetX / 2, this.y + insetY / 2, this.width - insetX, this.height - insetY);
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.restore();
  }
}

export class Boss {
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
    // Fixed, predictable alternation (not random) -- same rationale as
    // KEYCAP_ALTITUDE_CYCLE -- so the player can learn to read and react to
    // the upcoming pattern instead of guessing.
    this.nextAttackType = 'low';

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

  // Enrage kicks in at/below half HP and holds until defeat (hp only ever goes
  // down mid-fight, so this can't flicker on/off) -- see BOSS.enrage* constants.
  get isEnraged() {
    return !this.defeated && this.hp <= this.maxHp * BOSS.enrageHpFraction;
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
        const type = this.nextAttackType;
        this.nextAttackType = type === 'low' ? 'high' : 'low';
        const width = type === 'low' ? BOSS.laserLowWidth : BOSS.laserHighWidth;
        const height = type === 'low' ? BOSS.laserLowHeight : BOSS.laserHighHeight;
        const bottomY = type === 'low' ? BOSS.laserLowBottomY : BOSS.laserHighBottomY;
        // Laser's constructor treats `y` as the bolt's center, so derive it from
        // the fixed bottom edge rather than the boss's own (bobbing) body height --
        // the lane has to stay put regardless of the boss's bob phase.
        return { x: bounds.x, y: bottomY - height / 2, direction: -1, width, height, laserType: type };
      }
      return null;
    }

    // state === 'firing'
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this.state = 'idle';
      const baseCooldown = BOSS.attackIntervalMin + Math.random() * (BOSS.attackIntervalMax - BOSS.attackIntervalMin);
      this.attackCooldown = this.isEnraged ? baseCooldown * BOSS.enrageIntervalMultiplier : baseCooldown;
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

export class JetpackPickup {
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

export class ThrustParticle {
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
