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

  // Keyboard focus itself is no longer grabbed here -- InputManager (see
  // input.js, constructed below once Game is created) takes over entirely:
  // a capture-phase window listener intercepts game keys regardless of
  // focus, and on desktop it keeps a hidden focus-trap input focused so
  // extensions like Vimium see an editable field and stand down. The canvas
  // keeps tabindex="0" purely for accessibility/tab order.
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
