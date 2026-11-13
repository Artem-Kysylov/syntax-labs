// Trapped in Vim :: :wq!
// Generic narration-beat scene -- background + a line of text, advanced on
// Enter/Space to a `next` scene key passed in by the caller (see js/game.js).

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

export class CutsceneScene {
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
