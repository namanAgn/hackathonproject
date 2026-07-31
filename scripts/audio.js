// audio.js
//
// Centralized audio system. This is the ONLY module allowed to construct
// `Audio` objects. Every other module imports the helpers below
// (playSound, stopSound, playMusic, stopMusic, pauseMusic, resumeMusic,
// setSfxVolume, setMusicVolume, ...) instead of touching the Audio API
// directly.
//
// Responsibilities of this module:
//   - Own every sound asset path (single source of truth, all under
//     ./assets/audio/).
//   - Load/pool/play/stop sounds and music.
//   - Provide independent volume control for music vs. sound effects.
//   - Handle overlapping one-shots (e.g. rapid rifle fire) without cutting
//     earlier copies off.
//
// Explicitly NOT a responsibility of this module: deciding *when* a sound
// should play. That decision belongs to the gameplay module that owns the
// event (bullets.js decides a rifle shot happened and calls
// playSound('rifleFire'); audio.js just knows how to play 'rifleFire').

// ---------------------------------------------------------------------
// Asset manifest — single source of truth for every audio file.
// To add a new sound: add one line here (and to SFX_KEYS/MUSIC_KEYS
// below if you want editor-time autocomplete-style clarity), then call
// playSound()/playMusic() with that key from wherever the event happens.
// ---------------------------------------------------------------------
const AUDIO_BASE_PATH = './assets/audio/';

const SFX_FILES = {
    // weapons
    rifleFire: 'rifle-fire.mp3',
    sniperShot: 'sniper-shot.mp3',
    rocketLaunch: 'rocket-launch.mp3',
    rocketCooldownClick: 'rocket-cooldown-click.mp3',
    orbExplosion: 'gravity-orb-explosion.mp3',
    wellPlace: 'gravity-well-place.mp3',
    wellExplosion: 'gravity-well-explosion.mp3',
    explosion: 'explosion.mp3',

    // enemies
    enemyHit: 'enemy-hit.mp3',
    enemyDeath: 'enemy-death.mp3',
    splitterSplit: 'splitter-split.mp3',

    // player
    playerHurt: 'player-hurt.mp3',
    playerDash: 'player-dash.mp3',
    footstepGrass: 'footstep-grass.mp3',
    footstepRoad: 'footstep-road.mp3',
    gameOver: 'game-over.mp3',

    // pickups
    pickupHealth: 'pickup-health.mp3',
    pickupFocus: 'pickup-focus.mp3',
    pickupPotion: 'pickup-potion.mp3',

    // progression / meta
    objectiveComplete: 'objective-complete.mp3',
    waveStart: 'wave-start.mp3',
    waveCleared: 'wave-cleared.mp3',

    // UI
    toolSelect: 'tool-select.mp3',
    actionDenied: 'action-denied.mp3',
    buttonHover: 'button-hover.mp3',
    buttonClick: 'button-click.mp3'
};

const MUSIC_FILES = {
    menu: 'menu-theme.mp3',
    gameplay: 'gameplay-theme.mp3',
    pause: 'pause-theme.mp3'
};

// ---------------------------------------------------------------------
// Volume state
// ---------------------------------------------------------------------
// Independently controllable, both 0-1. Stored/restored so future work
// (settings menu, mute button, persistence) has a single place to hook
// into.
let sfxVolume = 0.8;
let musicVolume = 0.5;
let sfxMuted = false;
let musicMuted = false;

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------
// SFX pooling
// ---------------------------------------------------------------------
// A single shared <audio> element per sound would cut itself off on
// overlap (calling .play() on an in-flight element restarts it instead of
// layering). Rapid rifle fire, several enemies dying in the same frame
// from a rocket, etc. all need multiple simultaneous copies of the same
// clip. Each SoundPool keeps a small ring of pre-created Audio instances
// per sound and hands out whichever is free, only stealing (cutting off)
// the oldest instance if literally all of them are busy at once.
class SoundPool {
    constructor(key, src, size = 6) {
        this.key = key;
        this.src = src;
        this.instances = [];
        for (let i = 0; i < size; i++) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            this.instances.push(audio);
        }
        this.cursor = 0;
    }

    _acquire() {
        for (let i = 0; i < this.instances.length; i++) {
            const idx = (this.cursor + i) % this.instances.length;
            const audio = this.instances[idx];
            if (audio.paused || audio.ended) {
                this.cursor = (idx + 1) % this.instances.length;
                return audio;
            }
        }
        // Every instance is currently playing — steal the least-recently
        // started one rather than silently dropping the new sound.
        const audio = this.instances[this.cursor];
        this.cursor = (this.cursor + 1) % this.instances.length;
        return audio;
    }

    play({ volume = 1, rate = 1, loop = false } = {}) {
        if (sfxMuted) return null;
        const audio = this._acquire();
        try {
            audio.currentTime = 0;
        } catch (err) {
            // Some browsers throw if the element hasn't loaded enough yet;
            // playing from wherever it currently is beats hard-failing.
        }
        audio.volume = clamp01(volume * sfxVolume);
        audio.playbackRate = rate;
        audio.loop = loop;
        const playPromise = audio.play();
        if (playPromise && playPromise.catch) {
            // Autoplay-policy rejections etc. — never let a sound effect
            // throw an unhandled rejection into the console.
            playPromise.catch(() => {});
        }
        return audio;
    }

    stopAll() {
        this.instances.forEach(audio => {
            audio.pause();
            try { audio.currentTime = 0; } catch (err) {}
        });
    }
}

const sfxPools = {};
for (const [key, file] of Object.entries(SFX_FILES)) {
    sfxPools[key] = new SoundPool(key, AUDIO_BASE_PATH + file);
}

// ---------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------
// Only one music track plays at a time. Elements are created once and
// reused so switching tracks (e.g. menu -> gameplay -> pause -> gameplay)
// doesn't re-fetch the file every time.
const musicElements = {};
for (const [key, file] of Object.entries(MUSIC_FILES)) {
    const audio = new Audio(AUDIO_BASE_PATH + file);
    audio.preload = 'auto';
    audio.loop = true;
    musicElements[key] = audio;
}

let currentMusicKey = null;

function applyMusicVolume() {
    if (!currentMusicKey) return;
    musicElements[currentMusicKey].volume = musicMuted ? 0 : clamp01(musicVolume);
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Play a one-shot (or looping) sound effect by key. Safe to call rapidly
 * for the same key — overlapping calls layer instead of cutting each
 * other off.
 * @param {string} key - a key from SFX_FILES
 * @param {{volume?: number, rate?: number, loop?: boolean}} [options]
 * @returns {HTMLAudioElement|null} the Audio instance actually played
 */
export function playSound(key, options) {
    const pool = sfxPools[key];
    if (!pool) {
        console.warn(`[audio] Unknown sound effect key: "${key}"`);
        return null;
    }
    return pool.play(options);
}

/**
 * Stop every currently-playing instance of a given sound effect (mainly
 * useful for looping SFX started with { loop: true }).
 * @param {string} key
 */
export function stopSound(key) {
    const pool = sfxPools[key];
    if (!pool) {
        console.warn(`[audio] Unknown sound effect key: "${key}"`);
        return;
    }
    pool.stopAll();
}

/**
 * Stop every sound effect currently playing, across all keys. Handy for
 * hard resets (e.g. returning to the main menu mid-run).
 */
export function stopAllSounds() {
    Object.values(sfxPools).forEach(pool => pool.stopAll());
}

/**
 * Switch the currently playing music track. No-op if that track is
 * already playing. Stops whatever track was previously playing.
 * @param {string} key - a key from MUSIC_FILES ('menu' | 'gameplay' | 'pause')
 * @param {{restart?: boolean}} [options] - restart: force restart even if
 *   this track is already the current one (default false).
 */
export function playMusic(key, options = {}) {
    const { restart = false } = options;
    const track = musicElements[key];
    if (!track) {
        console.warn(`[audio] Unknown music key: "${key}"`);
        return;
    }
    if (currentMusicKey === key && !restart) {
        // Already playing this track; just make sure it's not paused.
        if (track.paused) {
            const p = track.play();
            if (p && p.catch) p.catch(() => {});
        }
        return;
    }
    if (currentMusicKey && musicElements[currentMusicKey]) {
        musicElements[currentMusicKey].pause();
        musicElements[currentMusicKey].currentTime = 0;
    }
    currentMusicKey = key;
    applyMusicVolume();
    track.currentTime = 0;
    const playPromise = track.play();
    if (playPromise && playPromise.catch) {
        // Most likely an autoplay-policy block before the first user
        // gesture. Retry once the user actually interacts with the page.
        playPromise.catch(() => {
            const retry = () => {
                if (currentMusicKey === key) {
                    const p = track.play();
                    if (p && p.catch) p.catch(() => {});
                }
                window.removeEventListener('pointerdown', retry);
                window.removeEventListener('keydown', retry);
            };
            window.addEventListener('pointerdown', retry, { once: true });
            window.addEventListener('keydown', retry, { once: true });
        });
    }
}

/** Stop whatever music is currently playing. */
export function stopMusic() {
    if (!currentMusicKey) return;
    const track = musicElements[currentMusicKey];
    track.pause();
    track.currentTime = 0;
    currentMusicKey = null;
}

/** Pause the current music track without resetting its position (e.g. game pause). */
export function pauseMusic() {
    if (!currentMusicKey) return;
    musicElements[currentMusicKey].pause();
}

/** Resume the current music track from where it was paused. */
export function resumeMusic() {
    if (!currentMusicKey) return;
    const p = musicElements[currentMusicKey].play();
    if (p && p.catch) p.catch(() => {});
}

/** @param {number} volume - 0 to 1 */
export function setSfxVolume(volume) {
    sfxVolume = clamp01(volume);
}

/** @param {number} volume - 0 to 1 */
export function setMusicVolume(volume) {
    musicVolume = clamp01(volume);
    applyMusicVolume();
}

export function getSfxVolume() {
    return sfxVolume;
}

export function getMusicVolume() {
    return musicVolume;
}

/** @param {boolean} muted */
export function setSfxMuted(muted) {
    sfxMuted = !!muted;
}

/** @param {boolean} muted */
export function setMusicMuted(muted) {
    musicMuted = !!muted;
    applyMusicVolume();
}

export function isSfxMuted() {
    return sfxMuted;
}

export function isMusicMuted() {
    return musicMuted;
}

/**
 * Call once at startup. Currently just a documented hook point — kept as
 * a real export (rather than relying on module-load side effects alone)
 * so main.js has one obvious place to initialize audio from, and so a
 * future settings-load (saved volume prefs, etc.) has somewhere to live.
 */
export function initAudio() {
    applyMusicVolume();
}