// Trapped in Vim :: :wq!
// Keyboard + virtual touch-button input handling, hardened against
// keyboard-driven browser extensions (Vimium's Link Hints/'f', Surfingkeys,
// etc.) stealing H/J/K/L/F before the game ever sees them.

// The full gameplay key set -- e.code is the physical key, so it already
// reads 'h'/'H'/caps-lock 'H' alike, no separate uppercase handling needed.
export const GAME_KEY_CODES = [
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyF',
];

// Shared by input.js and ui.js so "is this a touch device" is answered the
// same way everywhere -- the vim-trap focus trick is desktop-only (see
// InputManager#_setUpVimTrap) and the on-screen D-pad is touch-only (see
// ui.js#setUpTouchControls); both need to agree on which device they're on.
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();

    // Layer 1: capture-phase + stopImmediatePropagation on `window`.
    //
    // The capture phase always runs window -> document -> ... -> target,
    // in that order, regardless of when each listener was registered --
    // unlike the bubble phase (target -> ... -> document -> window), where
    // a content script sitting on `document` would see the keystroke
    // *before* a plain window-level bubble listener ever ran. Attaching
    // here, in capture, on `window` specifically (the outermost node) wins
    // that ordering unconditionally against anything on `document` or
    // deeper, no matter whether that extension's own listener is itself
    // capture or bubble. stopImmediatePropagation (not just stopPropagation)
    // additionally blocks any other listener still queued on `window`
    // itself from ever running.
    //
    // This works independently of DOM focus -- it's a hard backstop even if
    // focus is ever (briefly) not on #vim-trap below.
    window.addEventListener(
      'keydown',
      (e) => {
        this._press(e.code);
        if (GAME_KEY_CODES.includes(e.code)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true }
    );
    window.addEventListener(
      'keyup',
      (e) => {
        this._release(e.code);
        if (GAME_KEY_CODES.includes(e.code)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true }
    );

    // Layer 2: a focused, genuinely-editable element.
    //
    // Layer 1 stops the keystroke from reaching an extension's handler, but
    // some extensions decide whether to act at all by checking
    // document.activeElement up front (Vimium drops into its own "insert
    // mode" -- hands off entirely -- whenever focus sits on an editable
    // field). Keeping a hidden text input focused during gameplay is what
    // actually satisfies that check, rather than just racing it.
    this.isTouchDevice = isTouchDevice();
    this.vimTrap = document.getElementById('vim-trap');
    this._setUpVimTrap();
  }

  // No-ops entirely on touch devices: focusing a real <input> on iOS/Android
  // pops the on-screen keyboard, and Link Hint-style extensions aren't a
  // concern there (they're desktop browser extensions), so there's nothing
  // to trade off by skipping it.
  _setUpVimTrap() {
    if (this.isTouchDevice || !this.vimTrap) return;

    this.focusTrap();

    // Re-grab focus whenever something plausibly stole it: clicking/tapping
    // the canvas or page chrome, or the whole window regaining focus (e.g.
    // alt-tabbing back). A bubble-phase, document-wide listener is enough --
    // it naturally skips anything that already stopped propagation itself
    // (the mute/fullscreen buttons' own handlers, see ui.js#wireUiButton).
    document.addEventListener('pointerdown', () => this.focusTrap());
    window.addEventListener('focus', () => this.focusTrap());
  }

  // Public so scene transitions can re-assert focus too (see Game#setScene
  // in game.js) -- entering a new scene never itself moves DOM focus today,
  // but a scene is exactly the kind of moment where focus could have
  // drifted since the last re-grab, so it's a natural place to double-check.
  // Safe to call unconditionally (including on touch devices, where it's a
  // deliberate no-op) rather than making every call site check first.
  focusTrap() {
    if (this.isTouchDevice || !this.vimTrap) return;
    if (document.activeElement !== this.vimTrap) {
      this.vimTrap.focus({ preventScroll: true });
    }
  }

  _press(code) {
    if (!this.keys.has(code)) {
      this.justPressed.add(code);
    }
    this.keys.add(code);
  }

  _release(code) {
    this.keys.delete(code);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  endFrame() {
    this.justPressed.clear();
  }

  // Wires a virtual touch button to behave exactly like holding the given key:
  // isDown() is true while held, wasPressed() fires once on the initial touch.
  bindTouchButton(el, code) {
    const press = (e) => {
      e.preventDefault();
      this._press(code);
      el.classList.add('is-pressed');
    };
    const release = (e) => {
      e.preventDefault();
      this._release(code);
      el.classList.remove('is-pressed');
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
  }

  // A single tap-to-confirm, for advancing menu/status screens on devices with
  // no keyboard -- presses and releases the key within the same frame, so it
  // can never get "stuck" held down for something like jetpack thrust.
  simulateTap(code) {
    this._press(code);
    this._release(code);
  }
}
