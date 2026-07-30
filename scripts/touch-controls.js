// touch-controls.js
// Twin-stick layer for phones/tablets. Left stick drives movement (feeds
// state.moveVector, blended with WASD in player.js). Right stick drives aim:
// it continuously repositions a fake "mouse" out past the player at the
// stick's angle/pull, so aimPlayer() and the well ghost preview (both of
// which just read state.mouse.x/y) behave exactly like they do with a real
// mouse — you can drag around to aim/preview without anything firing yet.
//
// Firing semantics differ by tool because the desktop originals differ:
//   - rifle/rocket/orb are hold-to-fire (checked via state.mouse.left each
//     frame in Player.spawnTool()), so touch keeps that: fire while past the
//     deadzone, stop when you ease back or let go.
//   - well is a single placement per click on desktop — you position the
//     mouse, then click once. Continuously setting mouse.left = true the
//     moment the touch stick left center (the original touch behavior)
//     placed a well on literally the first twitch of the drag, with zero
//     chance to aim first. Fixed here: well only commits on release, and
//     only if the drag actually left the deadzone at some point (so a light
//     tap-and-lift doesn't drop a well on top of the player by accident).
//
// Only activates on devices that report touch support; on desktop this is a
// no-op and the joystick DOM elements stay hidden (see .touch-device in
// style.css).
import { state } from './state.js';
import { tryDash } from './player.js';
import { worldToScreen } from './utils.js';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Max distance (screen px) the fake aim point is thrown from the player;
// actual throw scales with how far the stick is pulled, not just its angle,
// so partial pulls aim closer instead of always snapping to full range.
const AIM_THROW_MAX = 340;
const AIM_THROW_MIN = 60; // floor so a bare-deadzone pull doesn't aim at 0 distance
// Fraction of the stick's radius a thumb has to cross before it counts as
// an aim/fire input. Raised from the first pass — right at the pivot point
// (near-zero radius) tiny thumb wobble swings atan2's angle wildly, which is
// what read as "overly sensitive"; a wider deadzone keeps you out of that
// unstable zone.
const FIRE_DEADZONE = 0.35;
const MOVE_DEADZONE = 0.15;
// How fast the reported aim angle chases the raw stick angle, per update
// (0-1, lower = smoother/laggier). Damps the same near-center jitter without
// needing a bigger deadzone than feels good to use.
const AIM_SMOOTHING = 0.35;

function lerpAngle(from, to, t) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * t;
}

function setupStick(baseEl, knobEl, onMove, onEnd) {
    let touchId = null;
    const radius = baseEl.clientWidth / 2;

    function handleMove(e) {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
        if (!touch) return;
        e.preventDefault();
        const rect = baseEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, radius);
        const angle = Math.atan2(dy, dx);
        knobEl.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
        onMove(dist / radius, angle);
    }

    function handleStart(e) {
        if (touchId !== null) return;
        touchId = e.changedTouches[0].identifier;
        baseEl.classList.add('active');
        handleMove(e);
    }

    function handleEnd(e) {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
        if (!touch) return;
        touchId = null;
        baseEl.classList.remove('active');
        knobEl.style.transform = 'translate(0, 0)';
        onEnd();
    }

    baseEl.addEventListener('touchstart', handleStart, { passive: false });
    // Listened on window (not baseEl) so dragging past the stick's own
    // bounds still tracks — a thumb sliding off the small base shouldn't
    // just drop the input.
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
}

export function initTouchControls() {
    if (!isTouchDevice) return;
    document.body.classList.add('touch-device');
    // Read by enemies.js/waves.js to ease spawn cadence slightly — twin-stick
    // touch aim is genuinely harder to fight with than mouse+keyboard, so
    // enemies piling up faster isn't really a separate balance bug. Starting
    // multiplier, tune to taste.
    state.isTouchDevice = true;

    const moveBase = document.getElementById('move-joystick');
    const aimBase = document.getElementById('aim-joystick');
    const dashIndicator = document.querySelector('.dash-indicator');
    if (!moveBase || !aimBase) return;
    const moveKnob = moveBase.querySelector('.joystick-knob');
    const aimKnob = aimBase.querySelector('.joystick-knob');

    state.moveVector = { x: 0, y: 0 };

    setupStick(moveBase, moveKnob,
        (mag, angle) => {
            if (mag < MOVE_DEADZONE) { state.moveVector = { x: 0, y: 0 }; return; }
            state.moveVector = { x: Math.cos(angle), y: Math.sin(angle) };
        },
        () => { state.moveVector = { x: 0, y: 0 }; }
    );

    let smoothedAngle = 0;
    let hasAngle = false;
    let maxMagThisDrag = 0;

    setupStick(aimBase, aimKnob,
        (mag, rawAngle) => {
            smoothedAngle = hasAngle ? lerpAngle(smoothedAngle, rawAngle, AIM_SMOOTHING) : rawAngle;
            hasAngle = true;
            maxMagThisDrag = Math.max(maxMagThisDrag, mag);

            // Always drive the aim target (and, for "well", the ghost
            // preview) so you can freely reposition without committing.
            const throwDist = AIM_THROW_MIN + Math.min(mag, 1) * (AIM_THROW_MAX - AIM_THROW_MIN);
            const playerScreen = worldToScreen(
                state.player.x + state.player.w / 2,
                state.player.y + state.player.h / 2
            );
            state.mouse.x = playerScreen.x + Math.cos(smoothedAngle) * throwDist;
            state.mouse.y = playerScreen.y + Math.sin(smoothedAngle) * throwDist;

            if (state.selectedTool === 'well') {
                state.mouse.left = false; // commit on release only, see onEnd
            } else {
                state.mouse.left = mag >= FIRE_DEADZONE;
            }
        },
        () => {
            if (state.selectedTool === 'well' && maxMagThisDrag >= FIRE_DEADZONE) {
                // One-frame-ish click: place the well where the drag last
                // pointed, mirroring a desktop mouse click.
                state.mouse.left = true;
                setTimeout(() => { state.mouse.left = false; }, 50);
            } else {
                state.mouse.left = false;
            }
            hasAngle = false;
            maxMagThisDrag = 0;
        }
    );

    if (dashIndicator) {
        dashIndicator.addEventListener('touchstart', e => {
            e.preventDefault();
            tryDash();
        }, { passive: false });
    }
}