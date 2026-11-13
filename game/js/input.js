// Trapped in Vim :: :wq!
// Keyboard + virtual touch-button input handling.

// The full gameplay key set -- e.code is the physical key, so it already
// reads 'h'/'H'/caps-lock 'H' alike, no separate uppercase handling needed.
// Both preventDefault (stop the browser's own default action, e.g. Space
// scrolling the page) and stopPropagation (stop the event from bubbling
// any further) are called for every one of these on both keydown and
// keyup, so a keyboard-driven browser extension listening document/window-
// wide -- Vimium's 'f' link-hint overlay is the common case -- never sees
// the keystroke to begin with while the canvas has focus.
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

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    window.addEventListener('keydown', (e) => {
      this._press(e.code);
      if (GAME_KEY_CODES.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    window.addEventListener('keyup', (e) => {
      this._release(e.code);
      if (GAME_KEY_CODES.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
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
