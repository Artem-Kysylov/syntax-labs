// Trapped in Vim :: :wq!
// DOM/UI wiring: loading screen, touch controls, mute + fullscreen toggles.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { isTouchDevice } from './input.js';

// ---------------------------------------------------------------------
// Loading screen (drawn directly to canvas while assets stream in)
// ---------------------------------------------------------------------

export function drawLoadingScreen(ctx, loaded, total, label) {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  const pct = total > 0 ? loaded / total : 0;

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#50dc78';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRAPPED IN VIM', w / 2, h / 2 - 60);

  ctx.fillStyle = '#8a8a9a';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('LOADING ASSETS...', w / 2, h / 2 - 20);

  const barW = 480;
  const barH = 24;
  const barX = (w - barW) / 2;
  const barY = h / 2;

  ctx.strokeStyle = '#50dc78';
  ctx.lineWidth = 3;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#50dc78';
  ctx.fillRect(barX + 3, barY + 3, Math.max(0, (barW - 6) * pct), barH - 6);

  ctx.fillStyle = '#e8e8f0';
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillText(`${Math.round(pct * 100)}%`, w / 2, barY + barH + 28);

  if (label) {
    ctx.fillStyle = '#44444f';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(label, w / 2, barY + barH + 50);
  }
}

// ---------------------------------------------------------------------
// Bootstrap helpers
// ---------------------------------------------------------------------

export function setUpTouchControls(game) {
  if (!isTouchDevice()) return;

  // Belt-and-suspenders against scroll/pinch-zoom/rubber-band bounce, on top of
  // the touch-action: none already set in CSS.
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // InputManager already skips focusing #vim-trap on a touch device, but
  // blur it defensively too in case anything (a stray Tab, browser autofill,
  // etc.) ever lands focus on it -- a focused <input> on iOS/Android pops
  // the on-screen keyboard, which would eat screen space and steal taps.
  const vimTrap = document.getElementById('vim-trap');
  if (vimTrap) vimTrap.blur();

  const controls = document.getElementById('touch-controls');
  if (!controls) return;
  controls.hidden = false;

  controls.querySelectorAll('.touch-key[data-key]').forEach((el) => {
    game.input.bindTouchButton(el, el.dataset.key);
  });

  // Tapping the bare canvas (i.e. not one of the D-pad buttons) stands in for
  // Enter/Space, since menu and status screens otherwise have no touch affordance.
  game.canvas.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      game.input.simulateTap('Enter');
    },
    { passive: false }
  );
}

// Wires a top-right UI button (#mute-btn, #fullscreen-btn) so a tap/click
// reliably runs `action` exactly ONCE per gesture, and never bubbles into
// the canvas or document-level listeners sitting underneath (the global
// touchmove scroll-blocker, the document pointerdown -> #vim-trap focus
// reclaim in input.js, a browser extension's own key/click handlers, etc).
//
// iOS Safari is unreliable about the synthetic 'click' a tap is supposed
// to produce: calling preventDefault() on touchstart (needed below to stop
// the tap from stealing canvas focus/scrolling the page) sometimes
// suppresses that synthetic click entirely, and sometimes doesn't --
// behavior has flipped across iOS versions. Relying on 'click' alone,
// then, either silently drops the tap or (when click DOES still fire
// alongside an explicit touchend handler) runs `action` twice for one
// physical tap. So every event that could plausibly mark "the tap ended"
// (touchend, pointerup, click) is wired to the same debounced `fire` --
// whichever lands first actually runs `action`; everything else arriving
// within the window is swallowed, guaranteeing exactly one call per tap
// regardless of which event(s) a given browser happens to deliver.
export function wireUiButton(button, action) {
  if (!button) return;

  const guard = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  button.addEventListener('touchstart', guard, { passive: false });
  button.addEventListener('pointerdown', guard);

  let lastFiredAt = 0;
  const fire = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastFiredAt < 400) return;
    lastFiredAt = now;
    action();
  };
  button.addEventListener('touchend', fire, { passive: false });
  button.addEventListener('pointerup', fire);
  button.addEventListener('click', fire);
}

// The mute toggle is a real DOM button (#mute-btn) rather than the old
// canvas-drawn icon, so it's actually tappable/clickable on its own, not
// just reachable via the KeyM shortcut (still handled in Game#_loop).
export function setUpMuteToggle(assets) {
  const button = document.getElementById('mute-btn');
  if (!button) return;

  const updateIcon = () => {
    button.textContent = assets.muted ? '🔇' : '🔊';
    // Driven by assets.muted (JS state), not the CSS :active pseudo-class --
    // :active only paints for as long as the finger/pointer is physically
    // down, which says nothing about whether mute is actually on.
    button.classList.toggle('is-active', assets.muted);
  };

  wireUiButton(button, () => {
    assets.toggleMute();
    updateIcon();
  });

  updateIcon();
}

// Borderless fullscreen for immersion/recording. The button is the reliable
// path -- F11 is intercepted as the browser's OWN native fullscreen shortcut
// in most desktop browsers before page JS ever sees the keydown, so this is
// strictly best-effort and only fires in the environments that don't.
//
// .fullscreen-mode (see style.css) is toggled unconditionally on every
// click -- the CSS-only presentation layer that actually makes the page go
// edge-to-edge, applied immediately and synchronously. The real Fullscreen
// API is ALSO always attempted alongside it (not only as a fallback): on
// platforms that support it, this additionally sheds browser chrome; on
// iOS Safari/Chrome -- where requestFullscreen is either undefined or
// exists but silently rejects when called on a non-video element -- it's
// a harmless no-op, and the CSS layer is all the user ever sees.
export function setUpFullscreenToggle() {
  const button = document.getElementById('fullscreen-btn');

  const isFullscreenActive = () =>
    Boolean(document.fullscreenElement || document.webkitFullscreenElement) ||
    document.body.classList.contains('fullscreen-mode');

  const updateIcon = () => {
    if (!button) return;
    const active = isFullscreenActive();
    button.textContent = active ? '🗗' : '⛶';
    button.classList.toggle('is-active', active);
  };

  function toggleFullscreen() {
    const isFull = document.body.classList.toggle('fullscreen-mode');

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try {
          const result = exit.call(document);
          if (result && result.catch) result.catch(() => {});
        } catch (err) {
          /* ignore */
        }
      }
    } else {
      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (request) {
        try {
          const result = request.call(root);
          if (result && result.catch) result.catch(() => {});
        } catch (err) {
          /* ignore -- the .fullscreen-mode class above is already doing the work */
        }
      }
    }

    if (isFull) {
      // Nudges Safari's address bar out of the way so the 100dvh fallback
      // in style.css actually gets the space it's asking for.
      window.scrollTo(0, 1);
    }

    // Lets anything else listening for resize (e.g. a canvas-size
    // recompute) know the usable viewport just changed, even though no
    // real window resize happened.
    window.dispatchEvent(new Event('resize'));

    updateIcon();
  }

  wireUiButton(button, toggleFullscreen);

  // The browser's own fullscreen state can change independently of this
  // button -- Esc, F11, a window-manager shortcut. If native fullscreen
  // just ended that way, don't leave .fullscreen-mode's layout stuck on.
  const reconcileAfterNativeChange = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      document.body.classList.remove('fullscreen-mode');
    }
    updateIcon();
  };
  document.addEventListener('fullscreenchange', reconcileAfterNativeChange);
  document.addEventListener('webkitfullscreenchange', reconcileAfterNativeChange);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });
}
