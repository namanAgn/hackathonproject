// player.js
import * as C from './constants.js';
import { state } from './state.js';
import { spawnBullet } from './bullets.js';
import { spawnWell, checkTileCollision } from './map.js';
import { worldToScreen } from './utils.js';
import { spawnModalText } from './main.js';

export function tryDash() {
    if (!state.player || !state.gameStarted || state.gameOver || state.gamePaused) return;
    if (state.time < state.nextDashTime) return;

    // Dash toward whatever movement keys are currently held; if none are
    // held, dash toward the aim/mouse direction instead.
    let dx = 0, dy = 0;
    if (state.keys) {
        if (state.keys.a) dx--;
        if (state.keys.d) dx++;
        if (state.keys.w) dy--;
        if (state.keys.s) dy++;
    }
    if (state.moveVector) { dx += state.moveVector.x; dy += state.moveVector.y; }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    else { dx = Math.cos(state.player.angle); dy = Math.sin(state.player.angle); }

    // Flash/shockwave at the point the dash launches from, reusing the same
    // shockwave rendering the explosions use (see drawDeathParticles).
    state.deathParticles.push({
        x: state.player.x + state.player.w / 2,
        y: state.player.y + state.player.h / 2,
        vx: 0, vy: 0,
        size: 14, targetSize: 65,
        life: 12, maxLife: 12,
        isShockwave: true,
        color: "#9be7ff"
    });

    const steps = Math.ceil(C.DASH_DISTANCE / C.DASH_STEP);
    for (let i = 0; i < steps; i++) {
        const beforeX = state.player.x, beforeY = state.player.y;
        const moveX = dx * C.DASH_STEP;
        const moveY = dy * C.DASH_STEP;
        state.player.x += moveX;
        if (checkTileCollision(state.player)) state.player.x -= moveX;
        state.player.y += moveY;
        if (checkTileCollision(state.player)) state.player.y -= moveY;

        // Afterimage silhouette of the player, left behind at every step of
        // the dash and faded out over time in drawDashTrails().
        state.dashTrails.push({
            x: state.player.x,
            y: state.player.y,
            w: state.player.w,
            h: state.player.h,
            angle: state.player.angle,
            life: 14,
            maxLife: 14
        });

        // Sparser speed-line sparks kicked out behind the player for texture.
        if (i % 3 === 0) {
            state.deathParticles.push({
                x: state.player.x + state.player.w / 2 - dx * 20,
                y: state.player.y + state.player.h / 2 - dy * 20,
                vx: -dx * 1.5 + (Math.random() - 0.5),
                vy: -dy * 1.5 + (Math.random() - 0.5),
                size: 5 + Math.random() * 4,
                angle: Math.atan2(dy, dx),
                spin: 0,
                life: 12,
                maxLife: 12,
                color: "#c9f3ff"
            });
        }

        // Fully blocked this step (wall hit) — no point burning the rest of
        // the dash distance into the same wall.
        if (state.player.x === beforeX && state.player.y === beforeY) break;
    }

    state.nextDashTime = state.time + C.DASH_COOLDOWN;
}

// Renders the fading player-shaped afterimages left behind by tryDash().
// Call this before drawPlayer() so the live player renders on top.
export function drawDashTrails(ctx) {
    state.dashTrails.forEach(trail => {
        const alpha = Math.max(0, trail.life / trail.maxLife);
        const center = worldToScreen(trail.x + trail.w / 2, trail.y + trail.h / 2);
        const w = trail.w * state.camera.scale;
        const h = trail.h * state.camera.scale;
        const radius = Math.min(w, h) * 0.22;
        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.translate(center.x, center.y);
        ctx.rotate(trail.angle);
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, radius);
        ctx.fillStyle = "#9be7ff";
        ctx.fill();
        ctx.restore();
    });
}

export function createPlayer() {
    state.player = {
        x: 100,
        y: 100,
        w: 48,
        h: 48,
        velocity: { x: 0, y: 0 },
        speed: 5,
        angle: 0,
        hitFlash: 0,
        health: state.godMode ? Infinity : 200,
        recoil: 0,
        knockback: { x: 0, y: 0 },
        activePotion: null,
    };
    // place on spawn tile if exists
    const spawnTile = findSpawnTile();
    state.player.x = (spawnTile.col + 0.5) * C.GRID_SIZE;
    state.player.y = (spawnTile.row + 0.5) * C.GRID_SIZE;
}

import { findSpawnTile } from './map.js'; // keep import for spawn tile

export function aimPlayer() {
    const worldMouse = screenToWorld(state.mouse.x, state.mouse.y);
    const px = state.player.x + state.player.w / 2;
    const py = state.player.y + state.player.h / 2;
    const dx = worldMouse.x - px;
    const dy = worldMouse.y - py;
    const angle = Math.atan2(dy, dx);
    state.player.angle = angle;
}

// Note: screenToWorld depends on utils; to avoid circular imports we use state.camera directly here
import { screenToWorld } from './utils.js';

export function updatePlayer() {
    let dx = 0;
    let dy = 0;
    if (state.keys && state.keys.w) dy--;
    if (state.keys && state.keys.s) dy++;
    if (state.keys && state.keys.a) dx--;
    if (state.keys && state.keys.d) dx++;
    if (state.moveVector) { dx += state.moveVector.x; dy += state.moveVector.y; }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    if (state.player.hitFlash > 0) state.player.hitFlash -= 0.01;
    if (state.player.health <= 0) state.gameOver = true;
    state.player.velocity.x = dx * state.player.speed;
    state.player.velocity.y = dy * state.player.speed;
    state.player.x += state.player.velocity.x;
    if (checkTileCollision(state.player)) state.player.x -= state.player.velocity.x;
    state.player.y += state.player.velocity.y;
    if (checkTileCollision(state.player)) state.player.y -= state.player.velocity.y;
    state.player.recoil *= 0.75;
    if (state.player.recoil < 0.05) state.player.recoil = 0;
    state.target.x = window.innerWidth / 2 - state.player.x * state.camera.scale;
    state.target.y = window.innerHeight / 2 - state.player.y * state.camera.scale;
}

export function drawRocketLauncher(x, y, angle, ctx) {
    const cx = x + state.player.w / 2;
    const cy = y + state.player.h / 2;
    const offset = 40;
    const wx = cx + Math.cos(angle) * (offset - state.player.recoil);
    const wy = cy + Math.sin(angle) * (offset - state.player.recoil);
    const p = worldToScreen(wx, wy);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.fillStyle = "#555";
    ctx.fillRect(-8, -8, 56, 16);
    ctx.fillStyle = "#949494";
    ctx.fillRect(46, -6, 4, 12);
    ctx.fillStyle = "#777";
    ctx.fillRect(-12, -9, 6, 18);
    ctx.fillStyle = "#999";
    ctx.fillRect(8, -12, 18, 3);
    ctx.fillStyle = "#666";
    ctx.fillRect(2, 8, 18, 4);
    ctx.fillStyle = "#444";
    ctx.fillRect(8, 4, 10, 12);
    ctx.fillStyle = "#5b3a1a";
    ctx.fillRect(10, 10, 6, 16);
    ctx.fillStyle = "#444";
    ctx.fillRect(-22, -5, 12, 10);
    ctx.restore();
}

export function drawRifle(x, y, angle, ctx) {
    const cx = x + state.player.w / 2;
    const cy = y + state.player.h / 2;
    const offset = 40;
    const wx = cx + Math.cos(angle) * (offset - state.player.recoil);
    const wy = cy + Math.sin(angle) * (offset - state.player.recoil);
    const p = worldToScreen(wx, wy);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.fillStyle = "#555";
    ctx.fillRect(-4, -3, 52, 6);
    ctx.fillStyle = "#999";
    ctx.fillRect(48, -2, 6, 4);
    ctx.fillStyle = "#777";
    ctx.fillRect(-10, -6, 14, 12);
    ctx.fillStyle = "#6b4b2a";
    ctx.fillRect(-24, -4, 14, 8);
    ctx.fillStyle = "#333";
    ctx.fillRect(2, 3, 8, 18);
    ctx.fillStyle = "#5b3a1a";
    ctx.fillRect(-2, 4, 6, 12);
    ctx.restore();
}

export function drawPlayer(ctx) {
    if (state.selectedTool === "rifle") drawRifle(state.player.x, state.player.y, state.player.angle, ctx);
    if (state.selectedTool === "rocket") drawRocketLauncher(state.player.x, state.player.y, state.player.angle, ctx);

    const center = worldToScreen(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2);
    const w = state.player.w * state.camera.scale;
    const h = state.player.h * state.camera.scale;
    const radius = Math.min(w, h) * 0.22;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(state.player.angle);

    if (state.player.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, state.player.hitFlash * 7);
        ctx.fillStyle = "#ff4d4d";
        ctx.beginPath();
        ctx.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, radius + 8);
        ctx.fill();
        ctx.restore();
    }

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, radius);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.lineWidth = Math.max(1, 3 * state.camera.scale);
    ctx.strokeStyle = "#606260";
    ctx.stroke();

    ctx.restore();
}

export function spawnTool() {
    if (state.selectedTool === "rifle") {
        if (state.mouse.left && state.time >= state.nextShotTime && state.focusCurrency >= C.RIFLE_COST) {
            state.focusCurrency -= C.RIFLE_COST;
            spawnBullet();
            state.nextShotTime = state.time + C.BULLET_SPAWN_COOLDOWN;
        }
    }
    if (state.selectedTool === "orb") {
        if (state.mouse.left && state.time >= state.nextOrbShootTime && state.focusCurrency >= C.ORB_COST) {
            state.focusCurrency -= C.ORB_COST;
            spawnBullet();
            state.nextOrbShootTime = state.time + C.BULLET_SPAWN_COOLDOWN;
        }
    }
    if (state.selectedTool === "rocket") {
        if (state.mouse.left && state.time >= state.nextRocketShootTime && state.focusCurrency >= C.ROCKET_COST) {
            state.focusCurrency -= C.ROCKET_COST;
            spawnBullet();
            state.nextRocketShootTime = state.time + C.ROCKET_SPAWN_COOLDOWN;
        }
    }
    if (state.selectedTool === "well") {
        if (state.mouse.left && state.time >= state.nextWellShootTime && state.focusCurrency >= C.WELL_COST) {
            const worldMouse = screenToWorld(state.mouse.x, state.mouse.y);
            state.focusCurrency -= C.WELL_COST;
            spawnWell(worldMouse.x, worldMouse.y);
            state.nextWellShootTime = state.time + C.BULLET_SPAWN_COOLDOWN;
        }
    }
}

// Input wiring helper
export function initInput(dom) {
    // dom is an object with references to buttons and UI elements; keep minimal wiring here
    window.addEventListener("keydown", e => {
        const key = e.key.toLowerCase();
        state.keys = state.keys || {};
        if (key === 'w') state.keys.w = true;
        if (key === 'a') state.keys.a = true;
        if (key === 's') state.keys.s = true;
        if (key === 'd') state.keys.d = true;
        if (e.key === '`') {
            state.selectedTool = "none";
            spawnModalText("No Tool Selected", "#fff", window.innerHeight - 60, 24, 45);
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "1") {
            state.selectedTool = "rifle";
            spawnModalText("Rifle Selected", "#fff", window.innerHeight - 60, 24, 45);
            if (dom && dom.rifleButton) dom.rifleButton.classList.add('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "2") {
            state.selectedTool = "rocket";
            spawnModalText("Rocket Selected", "#fff", window.innerHeight - 60, 24, 45);
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.add('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "3") {
            state.selectedTool = "orb";
            spawnModalText("Orb Selected", "#fff", window.innerHeight - 60, 24, 60);
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.add('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "4") {
            state.selectedTool = "well";
            spawnModalText("Well Selected", "#fff", window.innerHeight - 60, 24, 45);
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.add('selected');
        }
        if (e.key === " ") {
            if (dom && dom.setPaused) dom.setPaused(!state.gamePaused);
        }
        if (state.gameOver && (key === "r" || e.key === "Enter")) {
            const restartUrl = new URL(window.location.href);
            restartUrl.searchParams.set("mode", "endless");
            window.location.assign(restartUrl);
        }
        
        if (e.key === "e" || e.key === "E") {
            if (state.selectedTool === "rifle") {
                state.selectedTool = "rocket";
                dom.rifleButton.classList.remove('selected');
                dom.rocketButton.classList.add('selected');
            }
            else if (state.selectedTool === "rocket") {
                state.selectedTool = "orb";
                dom.rocketButton.classList.remove('selected');
                dom.orbButton.classList.add('selected');
            }
            else if (state.selectedTool === "orb") {
                state.selectedTool = "well";
                dom.orbButton.classList.remove('selected');
                dom.wellButton.classList.add('selected');
            }
            else if (state.selectedTool === "well") {
                state.selectedTool = "rifle";
                dom.wellButton.classList.remove('selected');
                dom.rifleButton.classList.add('selected');
            }
        }

        if (e.key === "q" || e.key === "Q") {
            if (state.selectedTool === "rocket") {
                state.selectedTool = "rifle";
                dom.rifleButton.classList.add('selected');
                dom.rocketButton.classList.remove('selected');
            }
            else if (state.selectedTool === "orb") {
                state.selectedTool = "rocket";
                dom.rocketButton.classList.add('selected');
                dom.orbButton.classList.remove('selected');
            }
            else if (state.selectedTool === "well") {
                state.selectedTool = "orb";
                dom.orbButton.classList.add('selected');
                dom.wellButton.classList.remove('selected');
            }
            else if (state.selectedTool === "rifle") {
                state.selectedTool = "well";
                dom.rifleButton.classList.remove('selected');
                dom.wellButton.classList.add('selected');
            }
        }
    });

    window.addEventListener("keyup", e => {
        const key = e.key.toLowerCase();
        state.keys = state.keys || {};
        if (key === 'w') state.keys.w = false;
        if (key === 'a') state.keys.a = false;
        if (key === 's') state.keys.s = false;
        if (key === 'd') state.keys.d = false;
    });

    if (dom && dom.rifleButton) dom.rifleButton.addEventListener('click', () => {
        state.selectedTool = "rifle";
        dom.rifleButton.classList.add("selected");
        if (dom.rocketButton) dom.rocketButton.classList.remove("selected");
        if (dom.orbButton) dom.orbButton.classList.remove("selected");
        if (dom.wellButton) dom.wellButton.classList.remove("selected");
    });
    if (dom && dom.rocketButton) dom.rocketButton.addEventListener('click', () => {
        state.selectedTool = "rocket";
        if (dom.rifleButton) dom.rifleButton.classList.remove("selected");
        dom.rocketButton.classList.add("selected");
        if (dom.orbButton) dom.orbButton.classList.remove("selected");
        if (dom.wellButton) dom.wellButton.classList.remove("selected");
    });
    if (dom && dom.orbButton) dom.orbButton.addEventListener('click', () => {
        state.selectedTool = "orb";
        if (dom.rifleButton) dom.rifleButton.classList.remove("selected");
        if (dom.rocketButton) dom.rocketButton.classList.remove("selected");
        dom.orbButton.classList.add("selected");
        if (dom.wellButton) dom.wellButton.classList.remove("selected");
    });
    if (dom && dom.wellButton) dom.wellButton.addEventListener('click', () => {
        state.selectedTool = "well";
        if (dom.rifleButton) dom.rifleButton.classList.remove("selected");
        if (dom.rocketButton) dom.rocketButton.classList.remove("selected");
        if (dom.orbButton) dom.orbButton.classList.remove("selected");
        dom.wellButton.classList.add("selected");
    });
}