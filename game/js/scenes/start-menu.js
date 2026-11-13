// Trapped in Vim :: :wq!
// Title screen.

import { CANVAS_WIDTH, CANVAS_HEIGHT, MUSIC_VOLUME, SceneState } from '../constants.js';

export class StartMenuScene {
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
