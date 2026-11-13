// Trapped in Vim :: :wq!
// Game Over screen.

import { CANVAS_WIDTH, CANVAS_HEIGHT, SceneState } from '../constants.js';

export class GameOverScene {
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
