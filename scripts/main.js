// main.js (entry)
import * as C from './constants.js';
import { state } from './state.js';
import { initUtils, drawGrid, worldToScreen, screenToWorld, lerp, drawText } from './utils.js';
import * as Map from './map.js';
import * as Player from './player.js';
import * as Enemies from './enemies.js';
import * as Bullets from './bullets.js';
import * as Waves from './waves.js';
import { initTouchControls } from './touch-controls.js';
import { initAudio, playMusic, pauseMusic, resumeMusic, playSound } from './audio.js';

// Canvas and ctx
export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

initUtils(ctx);

const modalTexts = [];

const homeScreen = document.querySelector("#home-screen");
const gameUi = document.querySelector("#game-ui");
const modeMessage = document.querySelector(".mode-message");
const endlessModeButton = document.querySelector('[data-mode="endless"]');
const waveModeButton = document.querySelector('[data-mode="wave"]');
const pauseMenu = document.querySelector("#pause-menu");
const resumeButton = document.querySelector(".resume-button");
const quitButton = document.querySelector(".quit-button");
const waveStatus = document.querySelector("#wave-status");
const timerAmount = document.querySelector(".timer-amount");

function resetRunClock() {
    state.runStartTime = performance.now();
    state.pausedDuration = 0;
    state.pauseStartedAt = null;
}

function getRunElapsedSeconds() {
    if (!state.runStartTime) return 0;
    const now = state.pauseStartedAt || performance.now();
    return Math.floor((now - state.runStartTime - state.pausedDuration) / 1000);
}

function formatRunTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function updatePauseStats() {
    document.querySelectorAll("[data-stat]").forEach(stat => {
        stat.textContent = stat.dataset.stat === "time"
            ? formatRunTime(getRunElapsedSeconds())
            : state[stat.dataset.stat];
    });
}

function setPaused(paused) {
    if (paused) state.pauseStartedAt = performance.now();
    else if (state.pauseStartedAt) {
        state.pausedDuration += performance.now() - state.pauseStartedAt;
        state.pauseStartedAt = null;
    }
    state.gamePaused = paused;
    pauseButton?.classList.toggle("paused", paused);
    pauseMenu.hidden = !paused;
    if (paused) {
        updatePauseStats();
        // Duck into the pause theme rather than just silencing the gameplay
        // track — reuses the shared "menu-ish" music slot per the spec's
        // "pause menu music (or reuse menu music if more appropriate)".
        playMusic('pause');
    } else {
        playMusic('gameplay');
    }
    playSound('buttonClick');
}

function startEndlessMode() {
    resetRunClock();
    state.gameStarted = true;
    state.gameMode = "endless";
    state.endless = true;
    waveStatus.hidden = true;
    homeScreen.hidden = true;
    gameUi.hidden = false;
    playSound('buttonClick');
    playMusic('gameplay');
}

function startWaveMode() {
    resetRunClock();
    state.gameStarted = true;
    state.gameMode = "wave";
    state.endless = false;
    Waves.startWaveMode();
    waveStatus.hidden = false;
    waveStatus.textContent = `Wave ${state.wave.number + 1}`;
    homeScreen.hidden = true;
    gameUi.hidden = false;
    playSound('buttonClick');
    playMusic('gameplay');
}

// Menu music starts as soon as the home screen is showing. Wrapped so a
// blocked-autoplay rejection (before the user has interacted with the
// page at all) is retried automatically by audio.js rather than left
// silent forever.
initAudio();
playMusic('menu');

if (endlessModeButton) {
    endlessModeButton.addEventListener("click", startEndlessMode);
    endlessModeButton.addEventListener("mouseenter", () => playSound('buttonHover'));
}

if (waveModeButton) {
    waveModeButton.addEventListener("click", startWaveMode);
    waveModeButton.addEventListener("mouseenter", () => playSound('buttonHover'));
}

const quitModeButton = document.querySelector(".mode-card.quit");
if (quitModeButton) {
    quitModeButton.addEventListener("mouseenter", () => playSound('buttonHover'));
    quitModeButton.addEventListener("click", () => playSound('buttonClick'));
}

// A restart links straight back into the existing Endless mode.
if (new URLSearchParams(window.location.search).get("mode") === "endless") {
    startEndlessMode();
}

export function spawnModalText(text, color = "white", y = 80, text_size = 32, life = 120) {
    modalTexts.push({
        text,
        text_size: text_size,
        color,
        alpha: 1,
        y: y,
        timer: 0,
        speed: 1,
        duration: life
    });
}

const redTaskGoalAmount = document.querySelector(".task-goal.red");
const blueTaskGoalAmount = document.querySelector(".task-goal.blue");

function spawnPotion(x, y, type) {
    // getRandomTileNearPlayer() already guarantees (x, y) is on a walkable
    // tile. Unlike other drops, potions don't need to "pop" outward from an
    // explosion — giving them scatter velocity let friction-decayed drift
    // carry them off that validated tile and onto solid ground over the
    // following frames, since drops have no tile collision of their own.
    state.drops.push({ x: x, y: y, size: 24, vx: 0, vy: 0, friction: 0.98, life: Infinity, type });
}

function updatePlayerPotion() {
    if (state.player.activePotion) {
        state.player.potionLife--;
        if (state.player.potionLife <= 0) {
            state.player.activePotion = null;
            state.player.potionLife = 0;
        }
    }
    // Derive both flags from the current potion every frame, rather than only
    // clearing a flag inside its own "red"/"blue" branch. Previously, picking
    // up a blue potion while red was still active (or vice versa) overwrote
    // activePotion without ever running the old branch's "potionLife <= 0"
    // check again, so the old buff's flag (and its speed/damage bonus, or its
    // infinite focus) got stuck on permanently.
    state.buffActive = state.player.activePotion === "red";
    state.blueActive = state.player.activePotion === "blue";
}

function drawPlayerPotionOverlay() {
    if (state.buffActive) {
        drawText(ctx, "Red Potion consumed! ", canvas.width / 2, 50, 24, "#ff0000");
        drawText(ctx, "+50% Dmg and +50% Spd for: ", canvas.width / 2, 80, 24);
        
        const timeRemaining = state.player.potionLife / 60;
        drawText(ctx, `${timeRemaining.toFixed(2)}s`, canvas.width / 2, 120, 32, "#fde61c");

        const pulse = (Math.sin(state.time * 8) + 1) / 2; // 0 → 1

        const thickness = 8 + pulse * 8;
        const alpha = 0.4 + pulse * 0.6;
        const blur = 10 + pulse * 20;

        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#ff2b2b";
        ctx.lineWidth = thickness;

        ctx.shadowColor = "#ff2b2b";
        ctx.shadowBlur = blur;

        ctx.strokeRect(
            thickness / 2,
            thickness / 2,
            canvas.width - thickness,
            canvas.height - thickness
        );

        ctx.restore();
    }
    else if (state.blueActive) {
        drawText(ctx, "Blue Potion consumed! ", canvas.width / 2, 50, 24, "#0091ff");
        drawText(ctx, "Infinite Focus For: ", canvas.width / 2, 80, 24);
        
        const timeRemaining = state.player.potionLife / 60;
        drawText(ctx, `${timeRemaining.toFixed(2)}s`, canvas.width / 2, 120, 32, "#fde61c");

        const pulse = (Math.sin(state.time * 8) + 1) / 2; // 0 → 1

        const thickness = 8 + pulse * 8;
        const alpha = 0.4 + pulse * 0.6;
        const blur = 10 + pulse * 20;

        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#0091ff";
        ctx.lineWidth = thickness;

        ctx.shadowColor = "#0091ff";
        ctx.shadowBlur = blur;

        ctx.strokeRect(
            thickness / 2,
            thickness / 2,
            canvas.width - thickness,
            canvas.height - thickness
        );

        ctx.restore();
    }
}

function getRandomTileNearPlayer() {
    const playerTileX = Math.floor(state.player.x / C.GRID_SIZE);
    const playerTileY = Math.floor(state.player.y / C.GRID_SIZE);

    const minRadius = 5;
    const maxRadius = 20;

    // Hard cap so this can never hang the tab again, even on a map where the
    // annulus around the player has no walkable tile at all (e.g. player
    // backed into a corner near the map edge).
    const MAX_ATTEMPTS = 300;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const tileX = playerTileX + Math.floor(Math.random() * (maxRadius * 2 + 1)) - maxRadius;
        const tileY = playerTileY + Math.floor(Math.random() * (maxRadius * 2 + 1)) - maxRadius;

        const dx = tileX - playerTileX;
        const dy = tileY - playerTileY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (
            tileX >= 0 &&
            tileY >= 0 &&
            tileY < state.map.length &&
            tileX < state.map[0].length &&
            dist >= minRadius &&
            dist <= maxRadius &&
            Map.isWalkableTile(state.map[tileY][tileX])
        ) {
            return {
                tileX,
                tileY,
                x: tileX * C.GRID_SIZE + C.GRID_SIZE / 2,
                y: tileY * C.GRID_SIZE + C.GRID_SIZE / 2
            };
        }
    }

    // Fallback: spawn right on the player's own tile rather than hang.
    return {
        tileX: playerTileX,
        tileY: playerTileY,
        x: state.player.x,
        y: state.player.y
    };
}

export function drawModalTexts(ctx, canvas) {
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    modalTexts.forEach(modal => {
        ctx.font = `bold ${modal.text_size}px Montserrat`;
        ctx.globalAlpha = modal.alpha;

        // Shadow
        ctx.fillStyle = "black";
        ctx.fillText(modal.text, canvas.width / 2 + 2, modal.y + 2);

        // Main text
        ctx.fillStyle = modal.color;
        ctx.fillText(modal.text, canvas.width / 2, modal.y);
    });

    ctx.restore();
}

function updateTasks() {
    if (state.killsTillBlue >= C.BLUE_KILL_QUOTA) {
        state.killsTillBlue = 0;
        const { x, y } = getRandomTileNearPlayer();
        spawnPotion(x, y, "blue");

        spawnModalText("Objective Complete!", "#ffd700", 80, 32);
        spawnModalText("Blue Potion Spawned", "#1788df", 115, 24);
        playSound('objectiveComplete');
    }

    if (state.killsTillRed >= C.RED_KILL_QUOTA) {
        state.killsTillRed = 0;
        const { x, y } = getRandomTileNearPlayer();
        spawnPotion(x, y, "red");

        spawnModalText("Objective Complete!", "#ffd700", 80, 32);
        spawnModalText("Red Potion Spawned", "#df1717", 115, 24);
        playSound('objectiveComplete');
    }

    blueTaskGoalAmount.textContent = `${state.killsTillBlue}/${C.BLUE_KILL_QUOTA}`;
    redTaskGoalAmount.textContent = `${state.killsTillRed}/${C.RED_KILL_QUOTA}`;
}

// DOM UI elements (if present)
const rifleButton = document.querySelector(".rifle");
const rocketButton = document.querySelector(".rocket");
const orbButton = document.querySelector(".orb");
const wellButton = document.querySelector(".well");
const pauseButton = document.querySelector(".pause");

const healthBar = document.querySelector(".health-bar");
const focusBar = document.querySelector(".focus-bar");
const scoreBar = document.querySelector(".score-amount");

const rifleCooldownFill = document.querySelector(".tool.rifle .cooldown-fill");
const rocketCooldownFill = document.querySelector(".tool.rocket .cooldown-fill");
const orbCooldownFill = document.querySelector(".tool.orb .cooldown-fill");
const wellCooldownFill = document.querySelector(".tool.well .cooldown-fill");
const dashCooldownFill = document.querySelector(".dash-indicator .cooldown-fill");

// set map into state for global access
state.map = Map.map;

// setup spawn barrels array from map
state.barrels = [];
for (let r = 0; r < state.map.length; r++) {
    for (let c = 0; c < state.map[r].length; c++) {
        if (state.map[r][c] === C.TILE.BARREL) {
            state.barrels.push({ row: r, col: c, x: c * C.GRID_SIZE, y: r * C.GRID_SIZE, r: C.BARREL_R, health: C.BARREL_HEALTH, hitFlash: 0, destroyed: false, respawnTimer: 0 });
        }
    }
}

// create player and init input wiring
Player.createPlayer();
Player.initInput({ rifleButton, rocketButton, orbButton, wellButton, pauseButton, setPaused });
initTouchControls();

// mouse/input events
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mousedown', e => {
    if (e.button === 0) state.mouse.left = true;
    if (e.button === 2) {
        state.mouse.right = true;
        Player.tryDash();
    }
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) state.mouse.left = false;
    if (e.button === 2) state.mouse.right = false;
});
window.addEventListener('mousemove', e => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; });

// resize handling
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.dispatchEvent(new Event('resize'));

// pause button
if (pauseButton) {
    pauseButton.addEventListener('click', () => {
        setPaused(!state.gamePaused);
    });
    pauseButton.addEventListener('mouseenter', () => playSound('buttonHover'));
}

if (resumeButton) {
    resumeButton.addEventListener("click", () => setPaused(false));
    resumeButton.addEventListener("mouseenter", () => playSound('buttonHover'));
}

if (quitButton) {
    quitButton.addEventListener("click", () => {
        playSound('buttonClick');
        window.location.assign(window.location.pathname);
    });
    quitButton.addEventListener("mouseenter", () => playSound('buttonHover'));
}

export function incrementTime() {
    state.time += 0.01;
}

const healthAmount = document.querySelector(".health-amount");
const focusAmount = document.querySelector(".focus-amount");

function updateDisplays() {
    if (healthBar) healthBar.style.width = `${state.player.health}px`;
    if (focusBar) focusBar.style.width = `${state.focusCurrency}px`;
    if (healthAmount) healthAmount.textContent = `${Math.max(state.player.health, 0)}/${C.MAX_HEALTH}`;
    if (focusAmount) focusAmount.textContent = state.focusCurrency === Infinity ? "♾️" : `${Math.min(state.focusCurrency, C.MAX_FOCUS)}/${C.MAX_FOCUS}`;
    if (scoreBar) scoreBar.textContent = state.score;
    if (timerAmount) timerAmount.textContent = formatRunTime(getRunElapsedSeconds());
    updateCooldownDisplays();
}

// Fraction of a cooldown still remaining: 1 = just used, 0 = ready again.
function cooldownFraction(nextReadyTime, duration) {
    if (!duration) return 0;
    return Math.max(0, Math.min(1, (nextReadyTime - state.time) / duration));
}

// Fills each toolbar/dash slot's background from the bottom up: full when
// the tool was just used, draining to empty once it's ready again. Rifle,
// orb, well, rocket, and dash each read their own independent timer.
let rocketWasCoolingDown = false;
function updateCooldownDisplays() {
    if (rifleCooldownFill) rifleCooldownFill.style.height = `${cooldownFraction(state.nextShotTime, C.BULLET_SPAWN_COOLDOWN) * 100}%`;
    if (orbCooldownFill) orbCooldownFill.style.height = `${cooldownFraction(state.nextOrbShootTime, C.BULLET_SPAWN_COOLDOWN) * 100}%`;
    if (wellCooldownFill) wellCooldownFill.style.height = `${cooldownFraction(state.nextWellShootTime, C.BULLET_SPAWN_COOLDOWN) * 100}%`;
    const rocketCooldownPct = cooldownFraction(state.nextRocketShootTime, C.ROCKET_SPAWN_COOLDOWN);
    if (rocketCooldownFill) rocketCooldownFill.style.height = `${rocketCooldownPct * 100}%`;
    // "Rocket cooldown clicking" (per SOUNDS.txt) reads best as a single
    // ready-tick the instant the launcher comes off cooldown, rather than a
    // sound tied to a specific fraction — ties it to a real state
    // transition instead of polling a magic threshold every frame.
    const rocketIsCoolingDown = rocketCooldownPct > 0;
    if (rocketWasCoolingDown && !rocketIsCoolingDown) {
        playSound('rocketCooldownClick', { volume: 0.5 });
    }
    rocketWasCoolingDown = rocketIsCoolingDown;
    if (dashCooldownFill) dashCooldownFill.style.height = `${cooldownFraction(state.nextDashTime, C.DASH_COOLDOWN) * 100}%`;
}

function spawnDrop(x, y, value) {
    state.drops.push({ x: x, y: y, value: value, size: 12, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, friction: 0.92, life: C.DROP_LIFE });
}

function updateDrops() {
    const px = state.player.x + state.player.w / 2;
    const py = state.player.y + state.player.h / 2;
    for (let i = state.drops.length - 1; i >= 0; i--) {
        const drop = state.drops[i];
        drop.life--;
        drop.x += drop.vx;
        drop.y += drop.vy;
        drop.vx *= drop.friction;
        drop.vy *= drop.friction;
        const dx = px - drop.x;
        const dy = py - drop.y;
        const dist = Math.hypot(dx, dy);
        const MAGNET_RADIUS = 150;

        const isPotion = drop.type === "blue" || drop.type === "red";

        if (!isPotion || !state.player.activePotion) {
            if (dist < MAGNET_RADIUS && dist > 0) {
                drop.x += (dx / dist) * 6;
                drop.y += (dy / dist) * 6;
            }
        }

        if (drop.life <= 0) {
            state.drops.splice(i, 1);
        }
        
        if (dist < state.player.w / 2 + drop.size) {
            if (drop.type === "focus") {
                if (state.focusCurrency === C.MAX_FOCUS || state.infiniteFocus) {
                    state.score += drop.value / 2;
                }
                else {
                    state.focusCurrency = state.infiniteFocus ? Infinity : Math.min(state.focusCurrency + drop.value, C.MAX_FOCUS);
                    state.focusPicked += drop.value;
                }
                playSound('pickupFocus', { volume: 0.2 });
            }
            else if (drop.type === "health") {
                state.player.health = Math.min(state.player.health + drop.value, C.MAX_HEALTH);
                playSound('pickupHealth', { volume: 0.4 });
            }
            else if (isPotion) {
                state.player.activePotion = drop.type;
                state.player.potionLife = drop.type === "red" ? C.RED_POTION_DURATION : C.BLUE_POTION_DURATION;
                playSound('pickupPotion', { volume: 1 });
            }
            state.drops.splice(i, 1);
        }
    }
}

function regenFocus() {
    if (state.time >= state.nextFocusRegeneratonTime) {
        if (state.focusCurrency < C.MAX_FOCUS) {
            state.focusCurrency += 10;
            state.focusPicked += 10;
            state.nextFocusRegeneratonTime = state.time + C.FOCUS_REGEN_COOLDOWN;
        }
        else if (state.focusCurrency + 10 > C.MAX_FOCUS) {
            state.focusPicked = C.MAX_FOCUS - state.focusCurrency;
            state.focusCurrency = state.infiniteFocus ? Infinity : C.MAX_FOCUS;
            state.nextFocusRegeneratonTime = state.time + C.FOCUS_REGEN_COOLDOWN;
        }
    }
}

function regenHealth() {
    if (state.time >= state.nextHealthRegenerationTime) {
        if (state.player.health > 0 && state.player.health < C.MAX_HEALTH) {
            state.player.health = Math.max(Math.min(state.player.health + C.HEALTH_REGEN_AMOUNT, C.MAX_HEALTH), 0);
        }
        state.nextHealthRegenerationTime = state.time + C.HEALTH_REGEN_COOLDONW;
    }
}

function updateDeathParticles() {
    for (let i = state.deathParticles.length - 1; i >= 0; i--) {
        const p = state.deathParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.vy += 0.08;
        p.angle = p.angle || 0;
        p.angle += p.spin || 0;
        p.life--;
        if (p.life <= 0) {
            state.deathParticles.splice(i, 1);
        }
    }
}

function updateDashTrails() {
    for (let i = state.dashTrails.length - 1; i >= 0; i--) {
        const trail = state.dashTrails[i];
        trail.life--;
        if (trail.life <= 0) state.dashTrails.splice(i, 1);
    }
}

function updateDamageTexts() {
    for (let i = state.damageTexts.length - 1; i >= 0; i--) {
        const text = state.damageTexts[i];
        text.y += text.velocityY;
        text.life--;
        if (text.life <= 0) state.damageTexts.splice(i, 1);
    }
}

function drawDeathParticles(ctx) {
    state.deathParticles.forEach(p => {
        const alpha = p.life / p.maxLife;
        const pos = worldToScreen(p.x, p.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        if (p.isShockwave) {
            const currentRadius = (p.targetSize || p.size) * state.camera.scale * (p.life / p.maxLife);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 6 * state.camera.scale * alpha;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.translate(pos.x, pos.y);
            ctx.rotate(p.angle || 0);
            ctx.scale(state.camera.scale, state.camera.scale);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function drawDrops(ctx) {
    state.drops.forEach(drop => {
        const pos = worldToScreen(drop.x, drop.y);
        let s = drop.size * state.camera.scale;
        if (drop.type === "health") s *= 1.5;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        ctx.shadowBlur = 10 * state.camera.scale;

        if (drop.type === "focus") {
            ctx.fillStyle = "#a855f7";
            ctx.shadowColor = "#c084fc";

            // Diamond
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.7, 0);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.7, 0);
            ctx.closePath();
            ctx.fill();

        } else if (drop.type === "health") {
            ctx.fillStyle = "#ef4444";
            ctx.shadowColor = "#f87171";

            // Heart
            ctx.beginPath();
            ctx.moveTo(0, s);

            ctx.bezierCurveTo(
                s * 1.2, s * 0.3,
                s * 1.2, -s * 0.8,
                0, -s * 0.2
            );

            ctx.bezierCurveTo(
                -s * 1.2, -s * 0.8,
                -s * 1.2, s * 0.3,
                0, s
            );

            ctx.fill();
        }
        else if (drop.type === "blue") {
            ctx.fillStyle = "#3b82f6";
            ctx.shadowColor = "#60a5fa";

            // Bottle
            ctx.beginPath();
            ctx.arc(0, s * 0.2, s * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Neck
            ctx.fillStyle = "#d1d5db";
            ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.4, s * 0.5);

            // Cork
            ctx.fillStyle = "#8b5a2b";
            ctx.fillRect(-s * 0.15, -s * 1.1, s * 0.3, s * 0.2);
        }
        else if (drop.type === "red") {
            ctx.fillStyle = "#ef4444";
            ctx.shadowColor = "#f87171";

            // Bottle
            ctx.beginPath();
            ctx.arc(0, s * 0.2, s * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Neck
            ctx.fillStyle = "#d1d5db";
            ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.4, s * 0.5);

            // Cork
            ctx.fillStyle = "#8b5a2b";
            ctx.fillRect(-s * 0.15, -s * 1.1, s * 0.3, s * 0.2);
        }

        ctx.restore();
    });
}

function drawDamageTexts(ctx) {
    ctx.font = "bold 24px Montserrat";
    ctx.textAlign = "center";
    state.damageTexts.forEach(text => {
        const pos = worldToScreen(text.x, text.y);
        ctx.fillStyle = text.color;
        ctx.fillText(text.text, pos.x, pos.y);
    });
}

export function updateModalTexts() {
    for (let i = modalTexts.length - 1; i >= 0; i--) {
        const modal = modalTexts[i];

        modal.timer++;

        // Fade out during the last second
        if (modal.timer > modal.duration - 60) {
            modal.alpha -= 1 / 60;
        }

        if (modal.alpha <= 0) {
            modalTexts.splice(i, 1);
        }
    }
}

function drawBarrels(ctx) { Map.drawBarrels(ctx); }

function drawWells(ctx) { Map.drawWells(ctx); }

function drawEnemies(ctx) { Enemies.drawEnemies(ctx); }

function drawBullets(ctx) { Bullets.drawBullets(ctx); }

function applyPlayerBuffs() {
    if (state.buffActive) {
        state.player.speed = 7.5;
        C.multiplyBulletDamage();
    }
    else {
        state.player.speed = 5;
        C.resetBulletDamage();
    }

    if (state.blueActive) {
        state.infiniteFocus = true;
        state.focusCurrency = Infinity;
    }
    else if (state.infiniteFocus) {
        // The blue potion just ended (or got overridden by picking up a red
        // one). state.focusCurrency was being left at the literal value
        // Infinity forever here — nothing ever brought it back down to a real
        // number, so infinite focus silently never actually went away.
        state.infiniteFocus = false;
        state.focusCurrency = C.MAX_FOCUS;
    }
}

function update() {
    if (state.gameStarted && !state.gameOver && !state.gamePaused) {
        applyPlayerBuffs();
        regenFocus();
        regenHealth();
        Player.updatePlayer();
        Player.aimPlayer();
        updateDeathParticles();
        updateDashTrails();
        updateModalTexts();
        if (state.gameMode === "endless") {
            Enemies.spawnEnemies();
        } else if (state.gameMode === "wave") {
            const waveEvent = Waves.updateWaves();
            if (waveEvent) {
                spawnModalText(waveEvent, "#fde61c", 80, 32, 120);
                waveStatus.textContent = state.wave.complete ? "Complete" : `Wave ${state.wave.number}`;
            }
        }
        state.enemies.forEach(enemy => Enemies.separateEnemies(enemy));
        Enemies.updateEnemies();
        updateDrops();
        updateDamageTexts();
        updatePlayerPotion();
        Player.spawnTool();
        updateBarrels();
        Bullets.updateBullets(state.map);
        Enemies.updateEnemyBullets();
        Map.updateWells();
        Bullets.updateOrbs();
        updateTasks();
        updateDisplays();
    }
}

function drawGameOverScreen() {
    ctx.fillStyle = "#ed424265";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `bold 192px Impact`;
    ctx.fillStyle = "#ff2b2b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", canvas.width / 2, 0 + canvas.height / 3);

    const normalStats = [
        { label: "Enemies Killed", value: state.enemiesKilled },
        { label: "Rifle Bullets Shot", value: state.rifleBulletsShot },
        { label: "Rockets Shot", value: state.rocketsShot },
        { label: "Wells Placed", value: state.wellsPlaced },
        { label: "Orbs Shot", value: state.orbsShot },
    ];

    const importantStats = [
        { label: "Score", value: state.score },
        { label: "Focus Picked", value: state.focusPicked },
        { label: "Damage Dealt", value: state.damageDealt },
        { label: "Damage Received", value: state.damageReceived },
    ];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const startY = canvas.height / 2;
    const lineHeight = 26;
    let currentY = startY;

    ctx.font = `bold 22px Arial`;
    ctx.fillStyle = "#ffe14d";
    importantStats.forEach((stat) => {
        ctx.fillText(`${stat.label}: ${stat.value}`, canvas.width / 2, currentY);
        currentY += lineHeight;
    });

    ctx.font = `20px Arial`;
    ctx.fillStyle = "#ffffff";
    normalStats.forEach((stat) => {
        ctx.fillText(`${stat.label}: ${stat.value}`, canvas.width / 2, currentY);
        currentY += lineHeight;
    });

    currentY += 15;
    ctx.font = `bold 28px Arial`;
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("Press R or Enter to restart", canvas.width / 2, currentY);
}

function updateBarrels() { Map.updateBarrels(); }

function draw() {
    ctx.fillStyle = C.BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(canvas);
    Map.drawMap(state.map, ctx);
    drawBullets(ctx);
    Enemies.drawEnemyBullets(ctx);
    drawWells(ctx);
    Map.drawGhostWell(ctx);
    drawModalTexts(ctx, canvas);
    drawEnemies(ctx);
    drawBarrels(ctx);
    drawDrops(ctx);
    drawDeathParticles(ctx);
    Player.drawDashTrails(ctx);
    Player.drawPlayer(ctx);
    drawDamageTexts(ctx);
    Map.drawMinimap(ctx, canvas);
    drawPlayerPotionOverlay(ctx);
    if (state.gameOver) {
        drawGameOverScreen();
    }
    if (state.gamePaused) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = `Bold 96px Arial`;
        ctx.fillStyle = "#fff";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }
}

function loop() {
    const targetCamX = lerp(state.camera.x, state.target.x, 0.1);
    const targetCamY = lerp(state.camera.y, state.target.y, 0.1);
    state.camera.scale = lerp(state.camera.scale, state.target.scale, 0.1);
    if (state.camera.shakeDuration > 0) {
        state.camera.shakeDuration--;
        const offsetX = (Math.random() - 0.5) * state.camera.shakeIntensity;
        const offsetY = (Math.random() - 0.5) * state.camera.shakeIntensity;
        state.camera.x = targetCamX + offsetX;
        state.camera.y = targetCamY + offsetY;
        state.camera.shakeIntensity *= 0.9;
    } else {
        state.camera.x = targetCamX;
        state.camera.y = targetCamY;
    }
    if (state.gameStarted) incrementTime();
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();