// Trapped in Vim :: :wq!
// Boss fight scene -- the monitor kernel boss fight after Level 2.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND,
  SceneState,
  MUSIC_VOLUME,
  BOSS,
  BOSS_ARENA_SPAWN,
  TOP_RIGHT_UI_RESERVED_WIDTH,
} from '../constants.js';
import { aabbOverlap, drawHealthTicks, Laser, Boss, ThrustParticle } from '../entities.js';

export class BossArenaScene {
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
          ...bossShot, // carries the attack-specific width/height (see Boss#update)
          color: BOSS.laserColor,
          speed: this.boss.isEnraged ? BOSS.laserSpeed * BOSS.enrageLaserSpeedMultiplier : BOSS.laserSpeed,
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
    const bossX = CANVAS_WIDTH - TOP_RIGHT_UI_RESERVED_WIDTH - totalWidth;
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
