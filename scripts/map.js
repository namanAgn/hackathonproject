import { ctx } from './main.js';
import * as C from './constants.js';
import { state } from './state.js';
import { worldToScreen, drawRect, drawEntityShadow, drawCircle, screenToWorld } from './utils.js';
import { explode } from './explosions.js';

export function hashTile(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return (h ^ (h >>> 16)) >>> 0;
}
export function tileVariant(x, y, count) {
    return hashTile(x, y) % count;
}

export function damageBarrelsInRadius(x, y, radius, damage) {
    state.barrels.forEach(barrel => {
        if (barrel.destroyed || barrel.health <= 0) return;
        const bx = barrel.x + C.BARREL_R * 2;
        const by = barrel.y + C.BARREL_R * 2;
        const dist = Math.hypot(bx - x, by - y);
        if (dist < radius + barrel.r) {
            const dealt = Math.max(1, Math.round(damage * (1 - dist / radius)));
            barrel.health -= dealt;
            barrel.hitFlash = 0.1;
        }
    });
}

export function drawFloorTile(gx, gy, ctx) {
    const wx = gx * C.GRID_SIZE, wy = gy * C.GRID_SIZE;
    const h = hashTile(gx, gy);
    const base = (h % 5 === 0) ? C.FLOOR_DARK : C.FLOOR_LIGHT;
    const variant = Math.floor(h / 5) % 5;
    drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, base);
    const p = worldToScreen(wx, wy);
    const size = C.GRID_SIZE * state.camera.scale;
    ctx.save();
    ctx.fillStyle = C.FLOOR_HILIGHT;
    ctx.fillRect(p.x, p.y, size, size * 0.12);
    ctx.fillStyle = C.FLOOR_SHADOW;
    ctx.fillRect(p.x, p.y + size * 0.85, size, size * 0.15);
    if (variant === 1) {
        ctx.fillStyle = C.FLOOR_SHADOW;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + size * 0.15);
        ctx.lineTo(p.x + size * 0.6, p.y);
        ctx.lineTo(p.x + size, p.y);
        ctx.lineTo(p.x + size, p.y + size * 0.1);
        ctx.lineTo(p.x + size * 0.2, p.y + size * 0.35);
        ctx.closePath();
        ctx.fill();
    } else if (variant === 2) {
        ctx.fillStyle = C.FLOOR_HILIGHT;
        ctx.fillRect(p.x, p.y, size * 0.1, size);
    } else if (variant === 3) {
        ctx.fillStyle = C.FLOOR_SHADOW;
        ctx.fillRect(p.x + size * 0.9, p.y, size * 0.1, size);
    }
    ctx.restore();
}

export function drawImpassableAccent(p, size, ctx) {
    ctx.save();
    ctx.strokeStyle = C.IMPASSABLE_ACCENT;
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.strokeRect(p.x + size * 0.05, p.y + size * 0.05, size * 0.9, size * 0.9);
    ctx.restore();
}

export function isBorderWall(gx, gy, map) {
    return (gx < C.MAP_BORDER_THICKNESS || gy < C.MAP_BORDER_THICKNESS || gx >= map[0].length - C.MAP_BORDER_THICKNESS || gy >= map.length - C.MAP_BORDER_THICKNESS);
}

export function isInnerBorderEdge(gx, gy, map) {
    const neighbors = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    return neighbors.some(([nx, ny]) => map[ny] && map[ny][nx] !== C.TILE.WALL);
}

export function drawHazardStripes(p, size, ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, size, size);
    ctx.clip();
    ctx.globalAlpha = 0.6;
    const stripeW = size * 0.22;
    ctx.translate(p.x + size / 2, p.y + size / 2);
    ctx.rotate(Math.PI / 4);
    for (let i = -3; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? C.HAZARD_YELLOW : C.HAZARD_DARK;
        ctx.fillRect(-size * 1.5, i * stripeW - size, size * 3, stripeW);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

export function drawWallTile(gx, gy, ctx, map) {
    const wx = gx * C.GRID_SIZE, wy = gy * C.GRID_SIZE;
    const variant = tileVariant(gx, gy, 5);
    drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, C.WALL_BASE);
    const p = worldToScreen(wx, wy);
    const size = C.GRID_SIZE * state.camera.scale;
    ctx.save();
    if (variant === 1) {
        ctx.fillStyle = "#54524f";
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(p.x + size * 0.1, p.y + size * (0.28 + i * 0.16), size * 0.8, size * 0.06);
        }
    } else if (variant === 2) {
        ctx.fillStyle = "#57544f";
        ctx.fillRect(p.x + size * 0.38, p.y + size * 0.1, size * 0.06, size * 0.8);
        ctx.fillRect(p.x + size * 0.56, p.y + size * 0.1, size * 0.06, size * 0.8);
    } else if (variant === 3) {
        const grad = ctx.createRadialGradient(p.x + size / 2, p.y + size / 2, size * 0.1, p.x + size / 2, p.y + size / 2, size * 0.7);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.35)");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, size, size);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.strokeRect(p.x, p.y, size, size);
    ctx.restore();
    drawImpassableAccent(worldToScreen(gx * C.GRID_SIZE, gy * C.GRID_SIZE), C.GRID_SIZE * state.camera.scale, ctx);
}

export function drawCrateTile(gx, gy, ctx) {
    const wx = gx * C.GRID_SIZE, wy = gy * C.GRID_SIZE;
    const variant = tileVariant(gx, gy, 5);
    drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, "#333330");
    const p = worldToScreen(wx, wy);
    const size = C.GRID_SIZE * state.camera.scale;
    ctx.save();
    if (variant === 0) {
        ctx.fillStyle = "#4a4842";
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(p.x + size * (0.12 + i * 0.2), p.y + size * 0.1, size * 0.08, size * 0.8);
        }
    } else if (variant === 1) {
        ctx.fillStyle = "#4a4842";
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(p.x + size * 0.1, p.y + size * (0.12 + i * 0.2), size * 0.8, size * 0.08);
        }
    } else if (variant === 2) {
        ctx.fillStyle = "#a85a3c";
        ctx.fillRect(p.x, p.y, size * 0.45, size);
    } else if (variant === 3) {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x + size, p.y + size);
        grad.addColorStop(0, "#8a4a34");
        grad.addColorStop(1, "#5c3020");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, size, size);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeRect(p.x, p.y, size, size);
    ctx.restore();
    drawImpassableAccent(worldToScreen(gx * C.GRID_SIZE, gy * C.GRID_SIZE), C.GRID_SIZE * state.camera.scale, ctx);
}

export function drawBorderWallTile(gx, gy, ctx, map) {
    const wx = gx * C.GRID_SIZE, wy = gy * C.GRID_SIZE;
    drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, C.BORDER_WALL_BASE);
    const p = worldToScreen(wx, wy);
    const size = C.GRID_SIZE * state.camera.scale;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(p.x + size * 0.08, p.y + size * 0.08, size * 0.84, size * 0.84);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(p.x, p.y, size, size * 0.08);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    const rivetR = size * 0.045;
    [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]].forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(p.x + size * rx, p.y + size * ry, rivetR, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.strokeRect(p.x, p.y, size, size);
    ctx.restore();
    if (isInnerBorderEdge(gx, gy, map)) {
        drawHazardStripes(p, size, ctx);
    }
}

export const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,2,2,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,2,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,2,2,0,0,0,0,2,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,2,2,2,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,2,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,2,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,2,2,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export function drawMap() {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {

            const wx = x * C.GRID_SIZE;
            const wy = y * C.GRID_SIZE;

            if (map[y][x] === C.TILE.WALL)
                drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, "#444");

            else
                drawRect(wx, wy, C.GRID_SIZE, C.GRID_SIZE, "#222");
        }
    }
}


export function worldToGrid(x, y) {
    return { x: Math.floor(x / C.GRID_SIZE), y: Math.floor(y / C.GRID_SIZE) };
}
export function gridToWorld(x, y) {
    return { x: x * C.GRID_SIZE + C.GRID_SIZE / 2, y: y * C.GRID_SIZE + C.GRID_SIZE / 2 };
}

export function reconstructPath(cameFrom, current) {
    const key = p => `${p.x},${p.y}`;
    const totalPath = [current];
    let currentKey = key(current);
    while (currentKey in cameFrom) {
        current = cameFrom[currentKey];
        currentKey = key(current);
        totalPath.unshift(current);
    }
    return totalPath;
}

export function findPath(start, end) {
    const open = [start];
    const cameFrom = {};
    const key = p => `${p.x},${p.y}`;
    const cost = {};
    cost[key(start)] = 0;
    while (open.length > 0) {
        open.sort((a, b) => cost[key(a)] - cost[key(b)]);
        const current = open.shift();
        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
        }
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];
        for (const next of neighbors) {
            if (next.y < 0 || next.y >= map.length || next.x < 0 || next.x >= map[0].length || (map[next.y][next.x] !== C.TILE.FLOOR && map[next.y][next.x] !== C.TILE.BARREL_DESTROYED && !(next.x === end.x && next.y === end.y))) {
                continue;
            }
            const newCost = cost[key(current)] + 1;
            if (cost[key(next)] === undefined || newCost < cost[key(next)]) {
                cost[key(next)] = newCost;
                open.push(next);
                cameFrom[key(next)] = current;
            }
        }
    }
    return [];
}

export function createMinimap(mapArr, width = 300, height = 300) {
    const minimap = document.createElement("canvas");
    const ctx = minimap.getContext("2d");
    minimap.width = width;
    minimap.height = height;
    const tileWidth = width / mapArr[0].length;
    const tileHeight = height / mapArr.length;
    for (let row = 0; row < mapArr.length; row++) {
        for (let col = 0; col < mapArr[row].length; col++) {
            switch (mapArr[row][col]) {
                case C.TILE.FLOOR:
                    ctx.fillStyle = "#777";
                    break;
                case C.TILE.WALL:
                    ctx.fillStyle = "#222";
                    break;
                default:
                    ctx.fillStyle = "#777";
            }
            ctx.fillRect(col * tileWidth, row * tileHeight, tileWidth, tileHeight);
        }
    }
    return { canvas: minimap, scaleX: tileWidth, scaleY: tileHeight };
}

export const minimap = createMinimap(map);

export function drawMinimap(ctx, canvas) {
    const minimapX = canvas.width - minimap.canvas.width;
    const minimapY = canvas.height - minimap.canvas.height;
    ctx.drawImage(minimap.canvas, minimapX, minimapY);
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(minimapX + (state.player.x / C.GRID_SIZE) * minimap.scaleX, minimapY + (state.player.y / C.GRID_SIZE) * minimap.scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "red";
    for (const enemy of state.enemies) {
        ctx.beginPath();
        ctx.arc(minimapX + (enemy.x / C.GRID_SIZE) * minimap.scaleX, minimapY + (enemy.y / C.GRID_SIZE) * minimap.scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "#8000ff";
    for (const well of state.wells) {
        ctx.beginPath();
        ctx.arc(minimapX + (well.x / C.GRID_SIZE) * minimap.scaleX, minimapY + (well.y / C.GRID_SIZE) * minimap.scaleY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawExplodedBarrel(barrel) {
    const wx = barrel.x;
    const wy = barrel.y;

    const d = C.BARREL_R * 2;
    const cx = wx + d;
    const cy = wy + d;

    drawCircle(cx, cy, C.BARREL_R + 5, "#181818");
    drawCircle(cx, cy, C.BARREL_R + 1, "#4a4a4a");
    drawCircle(cx, cy, C.BARREL_R - 4, "#252525");

    // dents
    drawCircle(cx - 5, cy - 3, 2, "#111");
    drawCircle(cx + 4, cy + 2, 2.5, "#111");
    drawCircle(cx - 2, cy + 5, 1.5, "#111");

    // debris
    drawCircle(cx - 10, cy - 8, 2, "#555");
    drawCircle(cx + 11, cy + 7, 2, "#555");
    drawCircle(cx - 8, cy + 9, 1.5, "#666");

    // ----- Countdown ring -----
    const progress = barrel.respawnTimer / C.BARREL_RESPAWN_TIME;

    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.arc(
        cx,
        cy,
        C.BARREL_R + 8,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress
    );
    ctx.stroke();

    // ----- Seconds remaining -----
    const seconds = (barrel.respawnTimer / 60).toFixed(1);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seconds, cx, cy);
}

export function drawBarrels(ctx) {
    state.barrels.forEach(barrel => {
        if (map[barrel.row][barrel.col] === C.TILE.BARREL) {
            const d = C.BARREL_R * 2;
            if (barrel.hitFlash > 0) {
                drawCircle(barrel.x + d, barrel.y + d, C.BARREL_R, barrel.hitFlash > 0 ? "#ffffff" : "#e35c5c");
            }
            else {
                drawCircle(barrel.x + d, barrel.y + d, C.BARREL_R + 3, "#6e2424");
                drawCircle(barrel.x + d, barrel.y + d, C.BARREL_R, "#e35c5c");
                drawCircle(barrel.x + d, barrel.y + d, C.BARREL_R / 2, "#fff");
            }
        }
        if (map[barrel.row][barrel.col] === C.TILE.BARREL_DESTROYED) {
            drawExplodedBarrel(barrel);
        }
    });
}

export function updateBarrels() {
    state.barrels.forEach(barrel => {
        if (barrel.health > 0) {
            if (barrel.hitFlash > 0) {
                barrel.hitFlash -= 0.01;
            }
            return;
        }
        if (!barrel.destroyed) {
            // trigger explosion
            const explosionX = barrel.x + C.BARREL_R * 2;
            const explosionY = barrel.y + C.BARREL_R * 2;
            barrel.destroyed = true;
            map[barrel.row][barrel.col] = C.TILE.BARREL_DESTROYED;
            barrel.respawnTimer = C.BARREL_RESPAWN_TIME;

            explode(explosionX, explosionY, C.BARREL_EXPLOSION_R, C.BARREL_DAMAGE);
        }
        barrel.respawnTimer--;
        if (barrel.respawnTimer <= 0) {
            barrel.health = C.BARREL_HEALTH;
            map[barrel.row][barrel.col] = C.TILE.BARREL;
            barrel.destroyed = false;
            barrel.hitFlash = 0;
        }
    });
}

export function drawGhostWell(ctx) {
    if (state.selectedTool === "well") {
        const worldMouse = screenToWorld(state.mouse.x, state.mouse.y);
        const pos = worldToScreen(worldMouse.x, worldMouse.y);
        const r = C.WELL_RADIUS * state.camera.scale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 7, 100, 0.15)";
        ctx.fill();
        ctx.strokeStyle = "rgba(192, 132, 252, 0.7)";
        ctx.lineWidth = Math.max(1, 2 * state.camera.scale);
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

export function spawnWell(x, y) {
    if (state.time >= state.nextWellSpawnTime) {
        state.wells.push({
            x: x,
            y: y,
            radius: 300,
            pullStrength: 1.5,
            life: 480,
            maxLife: 480,
            explosionDamage: 99,
            explosionForce: 35,
            trappedEnemies: []
        });
        state.wellsPlaced++;
        state.nextWellSpawnTime += C.WELL_SPAWN_COOLDOWN;
    }
}

export function spawnWellExplosionEffect(x, y, radius) {
    state.deathParticles.push({ x: x, y: y, vx: 0, vy: 0, size: 12, targetSize: radius, life: 20, maxLife: 20, isShockwave: true, color: C.WELL_RING_COLOR });
    state.deathParticles.push({ x: x, y: y, vx: 0, vy: 0, size: 6, targetSize: radius * 0.55, life: 14, maxLife: 14, isShockwave: true, color: "#f3e8ff" });
    const particleCount = 60;
    const colors = ["#f3e8ff", "#d8b4fe", "#c084fc", "#a855f7", "#7c3aed", "#3b0764"];
    for (let p = 0; p < particleCount; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 12;
        const particleColor = colors[Math.floor(Math.random() * colors.length)];
        state.deathParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 12,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.6,
            life: 22 + Math.floor(Math.random() * 20),
            maxLife: 42,
            color: particleColor
        });
    }
}

export function explodeWell(well) {
    spawnWellExplosionEffect(well.x, well.y, well.radius);
    damageBarrelsInRadius(well.x, well.y, well.radius, well.explosionDamage);
    well.trappedEnemies.forEach(enemy => {
        enemy.health -= well.explosionDamage;
        state.damageDealt += well.explosionDamage;
        state.deathParticles.push({ x: enemy.x + enemy.w/2, y: enemy.y, vx: 0, vy: 0, size: 6, life: 20, maxLife: 20, color: "#fff" });
        if (enemy.health <= 0) {
            // spawn death particles, drop and score handled in enemies module when enemy removed
        }
        const dx = enemy.x - well.x;
        const dy = enemy.y - well.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            enemy.knockback.x += ((dx / dist) * well.explosionForce) / enemy.knockbackResistance;
            enemy.knockback.y += ((dy / dist) * well.explosionForce) / enemy.knockbackResistance;
        }
    });
}

export function updateWells() {
    for (let i = state.wells.length - 1; i >= 0; i--) {
        const well = state.wells[i];
        well.life--;
        state.enemies.forEach(enemy => {
            const ex = enemy.x + enemy.w / 2;
            const ey = enemy.y + enemy.h / 2;
            let dx = well.x - ex;
            let dy = well.y - ey;
            const dist = Math.hypot(dx, dy);
            if (dist < well.radius && dist > 0) {
                dx /= dist;
                dy /= dist;
                enemy.force.x += dx * well.pullStrength / enemy.gravityResistance;
                enemy.force.y += dy * well.pullStrength / enemy.gravityResistance;
                if (!well.trappedEnemies.includes(enemy)) {
                    well.trappedEnemies.push(enemy);
                }
            }
        });
        if (well.life <= 0) {
            explodeWell(well);
            state.camera.shakeIntensity = 30;
            state.camera.shakeDuration = 30;
            state.wells.splice(i, 1);
        }
    }
}

export function drawWellVisual(well, ctx) {
    const pos = worldToScreen(well.x, well.y);
    const baseR = C.WELL_RADIUS * state.camera.scale;
    const lifePct = well.life / well.maxLife;
    let swellScale = 1;
    if (lifePct < C.WELL_SWELL_THRESHOLD) {
        const t = 1 - lifePct / C.WELL_SWELL_THRESHOLD;
        swellScale = 1 + t * t * 0.9;
    }
    const pulse = 1 + Math.sin(state.time * 4) * 0.03;
    const r = baseR * swellScale * pulse;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const gradient = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
    gradient.addColorStop(0, "#1a0b2e");
    gradient.addColorStop(0.55, C.WELL_GLOW_COLOR);
    gradient.addColorStop(1, "rgba(59,7,100,0)");
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.WELL_CORE_COLOR;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.WELL_RING_COLOR;
    ctx.lineWidth = Math.max(1, 2 * state.camera.scale);
    ctx.setLineDash([r * 0.14, r * 0.1]);
    for (let i = 0; i < 3; i++) {
        const ringR = r * (0.45 + i * 0.18);
        const rotSpeed = (i % 2 === 0 ? 1 : -1) * (1.1 + i * 0.4) * swellScale;
        ctx.save();
        ctx.rotate(state.time * rotSpeed);
        ctx.globalAlpha = 0.75 - i * 0.18;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
}

export function findSpawnTile() {
    const centerCol = Math.floor(map[0].length / 2);
    const centerRow = Math.floor(map.length / 2);

    if (map[centerRow] && map[centerRow][centerCol] === C.TILE.FLOOR) {
        return { row: centerRow, col: centerCol };
    }

    const maxRadius = Math.max(map.length, map[0].length);
    for (let radius = 1; radius < maxRadius; radius++) {
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                // only scan the outer ring at this radius — interior already checked
                if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;

                const r = centerRow + dr;
                const c = centerCol + dc;

                if (map[r] && map[r][c] === C.TILE.FLOOR) {
                    return { row: r, col: c };
                }
            }
        }
    }

    return { row: centerRow, col: centerCol }; // fallback, shouldn't be hit
}

function checkEntityTileCollision(entity) {
    const left = Math.floor(entity.x / C.GRID_SIZE);
    const right = Math.floor((entity.x + entity.w - 1) / C.GRID_SIZE);
    const top = Math.floor(entity.y / C.GRID_SIZE);
    const bottom = Math.floor((entity.y + entity.h - 1) / C.GRID_SIZE);

    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            if (map[y] && map[y][x] === C.TILE.WALL) {
                return true;
            }
        }
    }
    return false;
}

export function checkTileCollision(entity) {
    return checkEntityTileCollision(entity);
}

export function drawWells(ctx) {
    state.wells.forEach(well => {
        drawWellVisual(well, ctx);
    });
}