// player.js
import * as C from './constants.js';
import { state } from './state.js';
import { spawnBullet } from './bullets.js';
import { spawnWell, checkTileCollision } from './map.js';
import { worldToScreen } from './utils.js';

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
        knockback: { x: 0, y: 0 }
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
        // draw player flashed rounded rect
        ctx.fillRect(-w/2 - 8, -h/2 - 8, w + 16, h + 16);
        ctx.restore();
    }
    ctx.fillStyle = "#fff";
    // draw player body
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.lineWidth = Math.max(1, 3 * state.camera.scale);
    ctx.strokeStyle = "#606260";
    ctx.strokeRect(-w/2, -h/2, w, h);
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
        if (state.mouse.left && state.time >= state.nextShotTime && state.focusCurrency >= C.ORB_COST) {
            state.focusCurrency -= C.ORB_COST;
            spawnBullet();
            state.nextShotTime = state.time + C.BULLET_SPAWN_COOLDOWN;
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
        if (state.mouse.left && state.time >= state.nextShotTime && state.focusCurrency >= C.WELL_COST) {
            const worldMouse = screenToWorld(state.mouse.x, state.mouse.y);
            state.focusCurrency -= C.WELL_COST;
            spawnWell(worldMouse.x, worldMouse.y);
            state.nextShotTime = state.time + C.BULLET_SPAWN_COOLDOWN;
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
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "1") {
            state.selectedTool = "rifle";
            if (dom && dom.rifleButton) dom.rifleButton.classList.add('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "2") {
            state.selectedTool = "rocket";
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.add('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "3") {
            state.selectedTool = "orb";
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.add('selected');
            if (dom.wellButton) dom.wellButton.classList.remove('selected');
        }
        if (e.key === "4") {
            state.selectedTool = "well";
            if (dom && dom.rifleButton) dom.rifleButton.classList.remove('selected');
            if (dom.rocketButton) dom.rocketButton.classList.remove('selected');
            if (dom.orbButton) dom.orbButton.classList.remove('selected');
            if (dom.wellButton) dom.wellButton.classList.add('selected');
        }
        if (e.key === " ") {
            state.gamePaused = !state.gamePaused;
            if (dom && dom.pauseButton) dom.pauseButton.classList.toggle("paused");
        }
        if (state.gameOver && e.key === "r") window.location.reload();
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
