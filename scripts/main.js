// main.js (entry)
import * as C from './constants.js';
import { state } from './state.js';
import { initUtils, drawGrid, worldToScreen, screenToWorld, lerp } from './utils.js';
import * as Map from './map.js';
import * as Player from './player.js';
import * as Enemies from './enemies.js';
import * as Bullets from './bullets.js';

// Canvas and ctx
export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

initUtils(ctx);

// DOM UI elements (if present)
const rifleButton = document.querySelector(".rifle");
const rocketButton = document.querySelector(".rocket");
const orbButton = document.querySelector(".orb");
const wellButton = document.querySelector(".well");
const pauseButton = document.querySelector(".pause");

const healthBar = document.querySelector(".health-bar");
const focusBar = document.querySelector(".focus-bar");
const scoreBar = document.querySelector(".score-amount");

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
Player.initInput({ rifleButton, rocketButton, orbButton, wellButton, pauseButton });

// mouse/input events
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mousedown', e => { if (e.button === 0) state.mouse.left = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) state.mouse.left = false; });
window.addEventListener('mousemove', e => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; });

// resize handling
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.dispatchEvent(new Event('resize'));

// pause button
if (pauseButton) {
    pauseButton.addEventListener('click', () => {
        state.gamePaused = !state.gamePaused;
        pauseButton.classList.toggle("paused");
    });
}

export function incrementTime() {
    state.time += 0.01;
}

const healthAmount = document.querySelector(".health-amount");
const focusAmount = document.querySelector(".focus-amount");

function updateDisplays() {
    if (healthBar) healthBar.style.width = `${state.player.health}px`;
    if (focusBar) focusBar.style.width = `${state.focusCurrency}px`;
    if (healthAmount) healthAmount.textContent = `${state.player.health}/${C.MAX_HEALTH}`;
    if (focusAmount) focusAmount.textContent = `${Math.min(state.focusCurrency, C.MAX_FOCUS)}/${C.MAX_FOCUS}`;
    if (scoreBar) scoreBar.textContent = state.score;
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
        if (dist < MAGNET_RADIUS && dist > 0) {
            drop.x += (dx / dist) * 6;
            drop.y += (dy / dist) * 6;
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
            }
            else if (drop.type === "health") {
                state.player.health = Math.min(state.player.health + drop.value, C.MAX_HEALTH);
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
            state.player.health = Math.min(state.player.health + C.HEALTH_REGEN_AMOUNT, C.MAX_HEALTH);
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

function drawBarrels(ctx) { Map.drawBarrels(ctx); }

function drawWells(ctx) { Map.drawWells(ctx); }

function drawEnemies(ctx) { Enemies.drawEnemies(ctx); }

function drawBullets(ctx) { Bullets.drawBullets(ctx); }

function update() {
    if (!state.gameOver && !state.gamePaused) {
        regenFocus();
        regenHealth();
        Player.updatePlayer();
        Player.aimPlayer();
        updateDeathParticles();
        Enemies.spawnEnemies();
        state.enemies.forEach(enemy => Enemies.separateEnemies(enemy));
        Enemies.updateEnemies();
        updateDrops();
        updateDamageTexts();
        Player.spawnTool();
        updateBarrels();
        Bullets.updateBullets(state.map);
        Enemies.updateEnemyBullets();
        Map.updateWells();
        Bullets.updateOrbs();
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
    ctx.fillText("Press R to restart", canvas.width / 2, currentY);
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
    drawEnemies(ctx);
    drawBarrels(ctx);
    drawDrops(ctx);
    drawDeathParticles(ctx);
    Player.drawPlayer(ctx);
    drawDamageTexts(ctx);
    Map.drawMinimap(ctx, canvas);
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
    incrementTime();
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();