// Trapped in Vim :: :wq!
// Intermediate "level complete" stat screen between levels / before the boss.

import { CANVAS_WIDTH, CANVAS_HEIGHT, SceneState } from '../constants.js';

export class LevelCompleteScene {
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
