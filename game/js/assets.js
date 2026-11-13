// Trapped in Vim :: :wq!
// Asset manifest + AssetManager (image/audio loading, SFX playback, mute).

import { ASSET_ROOT } from './constants.js';

export const IMAGE_MANIFEST = {
  bg_start_screen: `${ASSET_ROOT}/backgrounds/bg_start_screen.png`,
  bg_level_1: `${ASSET_ROOT}/backgrounds/bg_level_1.png`,
  bg_level_2: `${ASSET_ROOT}/backgrounds/bg_level_2.png`,
  bg_boss_fight: `${ASSET_ROOT}/backgrounds/bg_boss_fight.png`,
  bg_secret_room: `${ASSET_ROOT}/backgrounds/bg_secret_room.png`,
  bg_game_over: `${ASSET_ROOT}/backgrounds/bg_game_over.png`,
  bg_you_win: `${ASSET_ROOT}/backgrounds/bg_you_win.png`,
  cutscene_boss_defeat: `${ASSET_ROOT}/backgrounds/cutscene_boss_defeat.png`,
  cutscene_escape: `${ASSET_ROOT}/backgrounds/cutscene_escape.png`,
  hero_movement: `${ASSET_ROOT}/sprites/hero_movement.png`,
  hero_action: `${ASSET_ROOT}/sprites/hero_action.png`,
  hero_death: `${ASSET_ROOT}/sprites/hero_death.png`,
  boss_monitor: `${ASSET_ROOT}/sprites/boss_monitor.png`,
  items_and_fx: `${ASSET_ROOT}/sprites/items_and_fx.png`,
};

export const AUDIO_MANIFEST = {
  bgm_gameplay: `${ASSET_ROOT}/audio/music/bgm_gameplay_8bit.mp3`,
  bgm_intro: `${ASSET_ROOT}/audio/music/bgm_intro_vox.MP3`,
  bgm_outro: `${ASSET_ROOT}/audio/music/bgm_outro_vox.MP3`,
  jingle_game_over: `${ASSET_ROOT}/audio/music/jingle_game_over.mp3`,
  jingle_results: `${ASSET_ROOT}/audio/music/jingle_results.mp3`,
  sfx_coin: `${ASSET_ROOT}/audio/sfx/sfx_coin.wav`,
  sfx_explosion: `${ASSET_ROOT}/audio/sfx/sfx_explosion.wav`,
  sfx_hurt: `${ASSET_ROOT}/audio/sfx/sfx_hurt.wav`,
  sfx_jetpack: `${ASSET_ROOT}/audio/sfx/sfx_jetpack.wav`,
  sfx_jump: `${ASSET_ROOT}/audio/sfx/sfx_jump.wav`,
  sfx_laser: `${ASSET_ROOT}/audio/sfx/sfx_laser.wav`,
  sfx_select: `${ASSET_ROOT}/audio/sfx/sfx_select.wav`,
  sfx_teleport: `${ASSET_ROOT}/audio/sfx/sfx_teleport.wav`,
};

// Rapid-fire/overlapping one-shots -- decoded into AudioBuffers and played
// through the Web Audio API (see AssetManager) instead of cloned
// HTMLAudioElements, since on iOS Safari overlapping cloneNode().play()
// calls are prone to silently dropping sounds. Everything else (menu
// blips, one-off jingles, and sfx_jetpack, which is also used as a
// sustained loop via playMusic()/stopMusic()) stays on the old
// HTMLAudioElement path -- they're never triggered rapidly enough to hit
// the same issue.
export const SFX_KEYS = new Set(['sfx_coin', 'sfx_hurt', 'sfx_jump', 'sfx_laser']);

export class AssetManager {
  constructor(imageManifest, audioManifest) {
    this.imageManifest = imageManifest;
    this.audioManifest = audioManifest;
    this.images = {};
    this.audio = {};
    this.total = Object.keys(imageManifest).length + Object.keys(audioManifest).length;
    this.loaded = 0;
    this.failed = [];
    this.muted = false;

    // Web Audio API for short SFX -- see playSfx()/_loadSfxBuffer(). Created
    // up front so decoding can happen during the loading screen; it starts
    // (or resumes) suspended on browsers that require a user gesture, which
    // unlockAudioContext() handles on the first touchstart.
    this.sfxBuffers = {};
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = AudioContextCtor ? new AudioContextCtor() : null;
    this.sfxGainNode = this.audioCtx ? this.audioCtx.createGain() : null;
    if (this.sfxGainNode) {
      this.sfxGainNode.connect(this.audioCtx.destination);
    }
  }

  // iOS Safari (and other mobile WebKit/Chrome builds) keep a freshly created
  // AudioContext suspended until it's resumed from inside a user-gesture
  // event handler. Call this once during bootstrap -- it resumes immediately
  // if already inside a gesture, and otherwise arms a one-time touchstart
  // listener to resume on the player's first tap.
  unlockAudioContext() {
    if (!this.audioCtx) return;
    const resume = () => {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    };
    resume();
    window.addEventListener('touchstart', resume, { once: true, passive: true });
  }

  _loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        this._tick(key);
        resolve();
      };
      img.onerror = () => {
        this.failed.push(src);
        this._tick(key);
        resolve();
      };
      img.src = src;
    });
  }

  _loadAudio(key, src) {
    return new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.audio[key] = audio;
        this._tick(key);
        resolve();
      };
      audio.addEventListener('canplaythrough', finish, { once: true });
      audio.addEventListener('error', () => {
        this.failed.push(src);
        this._tick(key);
        if (!settled) {
          settled = true;
          resolve();
        }
      }, { once: true });
      audio.preload = 'auto';
      audio.src = src;
      audio.load();
    });
  }

  // Decodes a short SFX into an AudioBuffer for playSfx() instead of loading
  // it as an HTMLAudioElement. Falls back to leaving the key unset (playSfx
  // then silently no-ops for it) when there's no AudioContext or decoding
  // fails, same failure behavior as a failed _loadAudio().
  async _loadSfxBuffer(key, src) {
    try {
      if (!this.audioCtx) throw new Error('Web Audio API unavailable');
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      this.sfxBuffers[key] = await this._decodeAudioData(arrayBuffer);
    } catch (err) {
      this.failed.push(src);
    }
    this._tick(key);
  }

  // Wraps AudioContext#decodeAudioData's legacy callback signature (still
  // needed on older Safari) in a Promise alongside its modern return value.
  _decodeAudioData(arrayBuffer) {
    return new Promise((resolve, reject) => {
      const maybePromise = this.audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, reject);
      }
    });
  }

  _tick(key) {
    this.loaded += 1;
    if (this.onProgress) {
      this.onProgress(this.loaded, this.total, key);
    }
  }

  async loadAll(onProgress) {
    this.onProgress = onProgress;
    const imageJobs = Object.entries(this.imageManifest).map(([key, src]) =>
      this._loadImage(key, src)
    );
    const audioJobs = Object.entries(this.audioManifest).map(([key, src]) =>
      SFX_KEYS.has(key) ? this._loadSfxBuffer(key, src) : this._loadAudio(key, src)
    );
    await Promise.all([...imageJobs, ...audioJobs]);
    if (this.failed.length) {
      console.warn('AssetManager: failed to load', this.failed);
    }
    return { images: this.images, audio: this.audio };
  }

  getImage(key) {
    return this.images[key] || null;
  }

  // Plays a short SFX. Keys in SFX_KEYS go through Web Audio
  // (AudioBufferSourceNode) rather than cloning/playing an
  // HTMLAudioElement -- each call gets its own node, so rapid or
  // overlapping triggers (e.g. machine-gunning the fire button) layer
  // cleanly instead of one instance's play() call stepping on another's,
  // which is what drops sounds on iOS Safari. Everything else falls back
  // to the original cloneNode()/play() approach.
  playSfx(key, { volume = 1 } = {}) {
    const buffer = this.sfxBuffers[key];
    if (buffer && this.audioCtx && this.sfxGainNode) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioCtx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.sfxGainNode);
      source.start(0);
      return;
    }

    const base = this.audio[key];
    if (!base) return;
    const instance = base.cloneNode(true);
    instance.volume = volume;
    instance.muted = this.muted;
    instance.play().catch(() => {});
  }

  playMusic(key, { volume = 0.6, loop = true } = {}) {
    const track = this.audio[key];
    if (!track) return null;
    track.volume = volume;
    track.loop = loop;
    track.muted = this.muted;
    track.currentTime = 0;
    track.play().catch(() => {});
    return track;
  }

  stopMusic(key) {
    const track = this.audio[key];
    if (!track) return;
    track.pause();
    track.currentTime = 0;
  }

  // Stops every currently-playing track this manager owns. playSfx() clones nodes to
  // play them, so one-shot sound effects are untouched -- only loops/jingles started
  // via playMusic() (which plays the stored original) ever show up here as "playing".
  stopAllMusic() {
    Object.values(this.audio).forEach((track) => {
      if (!track.paused) {
        track.pause();
        track.currentTime = 0;
      }
    });
  }

  // Uses the native .muted flag (not volume 0) so unmuting restores playback
  // exactly where it was, and applies to every loaded track -- including ones
  // not currently playing -- so anything started later picks it up too.
  toggleMute() {
    this.muted = !this.muted;
    Object.values(this.audio).forEach((track) => {
      track.muted = this.muted;
    });
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.muted ? 0 : 1;
    }
    return this.muted;
  }
}
