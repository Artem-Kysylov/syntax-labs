// Trapped in Vim :: :wq!
// Game loop + scene state manager.

import { CANVAS_WIDTH, CANVAS_HEIGHT, SceneState } from './constants.js';
import { InputManager } from './input.js';
import { StartMenuScene } from './scenes/start-menu.js';
import { GameplayScene } from './scenes/gameplay.js';
import { GameOverScene } from './scenes/game-over.js';
import { WinScene } from './scenes/win.js';
import { BossArenaScene } from './scenes/boss-arena.js';
import { LevelCompleteScene } from './scenes/level-complete.js';
import { CutsceneScene } from './scenes/cutscene.js';

export class Game {
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

    // Kept in sync every frame in _render() below, regardless of whether
    // mute was toggled via this button, the KeyM shortcut, or (in
    // principle) some other future input path.
    this.muteButton = document.getElementById('mute-btn');
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
    if (this.muteButton) {
      this.muteButton.textContent = this.assets.muted ? '🔇' : '🔊';
      this.muteButton.classList.toggle('is-active', this.assets.muted);
    }
  }
}
