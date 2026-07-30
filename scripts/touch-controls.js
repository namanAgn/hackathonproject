// touch-controls.js
// Twin-stick layer for phones/tablets. Left stick drives movement (feeds
// state.moveVector, which player.js now blends with WASD). Right stick aims
// and fires by pushing a fake mouse target out past the player in the stick's
// direction and reusing the exact same screenToWorld() aim path the desktop
// mouse already takes — so bullets.js/player.js need no touch-specific branch
// beyond the moveVector blend in player.js.
//
// Only activates on devices that report touch support; on desktop this is a
// no-op and the DOM elements stay hidden (see the .touch-device rules in
// style.css).
import { state } from './state.js';
import { tryDash } from './player.js';
import { worldToScreen } from './utils.js';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// How far (world px) the fake aim target is thrown out from the player —
// just needs to be far enough that aimPlayer()'s atan2 gets a clean angle.
const AIM_THROW_DISTANCE = 300;
// Fraction of the stick's radius a thumb has to cross before it counts as
// an aim/fire input, so resting a thumb near center doesn't fire the tool.
const FIRE_DEADZONE = 0.25;
const MOVE_DEADZONE = 0.15;

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
        onMove(dx, dy, dist / radius, angle);
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

    const moveBase = document.getElementById('move-joystick');
    const aimBase = document.getElementById('aim-joystick');
    const dashIndicator = document.querySelector('.dash-indicator');
    if (!moveBase || !aimBase) return;
    const moveKnob = moveBase.querySelector('.joystick-knob');
    const aimKnob = aimBase.querySelector('.joystick-knob');

    state.moveVector = { x: 0, y: 0 };

    setupStick(moveBase, moveKnob,
        (dx, dy, mag) => {
            if (mag < MOVE_DEADZONE) { state.moveVector = { x: 0, y: 0 }; return; }
            const len = Math.hypot(dx, dy) || 1;
            state.moveVector = { x: dx / len, y: dy / len };
        },
        () => { state.moveVector = { x: 0, y: 0 }; }
    );

    setupStick(aimBase, aimKnob,
        (dx, dy, mag, angle) => {
            if (mag < FIRE_DEADZONE) { state.mouse.left = false; return; }
            const playerScreen = worldToScreen(
                state.player.x + state.player.w / 2,
                state.player.y + state.player.h / 2
            );
            state.mouse.x = playerScreen.x + Math.cos(angle) * AIM_THROW_DISTANCE;
            state.mouse.y = playerScreen.y + Math.sin(angle) * AIM_THROW_DISTANCE;
            state.mouse.left = true;
        },
        () => { state.mouse.left = false; }
    );

    // Reuse the existing dash-indicator element (already right-click-dashes
    // on desktop) as the tap target on touch, rather than adding a duplicate
    // button.
    if (dashIndicator) {
        dashIndicator.addEventListener('touchstart', e => {
            e.preventDefault();
            tryDash();
        }, { passive: false });
    }
}