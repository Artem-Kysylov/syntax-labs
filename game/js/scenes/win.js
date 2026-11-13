// Trapped in Vim :: :wq!
// Final "You Win" screen.

import { CANVAS_WIDTH, CANVAS_HEIGHT, SceneState } from '../constants.js';

export class WinScene {
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
