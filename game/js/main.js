// Trapped in Vim :: :wq!
// Pure HTML5 Canvas + vanilla JS 8-bit platformer. Entry point.

import { CANVAS_WIDTH, CANVAS_HEIGHT, SceneState } from './constants.js';
import { AssetManager, IMAGE_MANIFEST, AUDIO_MANIFEST } from './assets.js';
import { drawLoadingScreen, setUpTouchControls, setUpMuteToggle, setUpFullscreenToggle } from './ui.js';
import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const assets = new AssetManager(IMAGE_MANIFEST, AUDIO_MANIFEST);
  assets.unlockAudioContext();

  drawLoadingScreen(ctx, 0, assets.total, '');

  setUpFullscreenToggle();
  setUpMuteToggle(assets);

  // Keyboard focus has to actually be ON the canvas (not just the window
  // having focus) for the InputManager's stopPropagation to have any
  // chance of winning a race against a keyboard-driven browser extension
  // -- grab it immediately, and reclaim it after every click anywhere on
  // the page (switching tabs/panes or clicking a touch button shifts
  // focus away otherwise).
  canvas.focus();
  document.addEventListener('click', () => canvas.focus());

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
