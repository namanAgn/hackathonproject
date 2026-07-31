import { ctx } from './main.js';
import * as C from './constants.js';
import { state } from './state.js';
import { worldToScreen, drawRect, drawEntityShadow, drawCircle, screenToWorld } from './utils.js';
import { explode } from './explosions.js';
import { playSound } from './audio.js';

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

// Built once from constants.js's SOLID_TILES name list. Replaces every old
// `=== C.TILE.FLOOR` / `=== C.TILE.WALL` check, which broke silently (or,
// in getRandomTileNearPlayer's case, hung forever) once the tileset moved
// away from a simple FLOOR/WALL enum.
const SOLID_TILE_IDS = new Set(C.SOLID_TILES.map(name => C.TILE[name]));

export function isSolidTile(id) {
    return SOLID_TILE_IDS.has(id);
}

export function isWalkableTile(id) {
    return id !== undefined && !isSolidTile(id);
}

export let map = [
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 25, 25, 24, 24, 28, 24, 22, 22, 22, 24, 25, 24, 28, 24, 9 , 4 , 4 , 4,  8 , 22, 22, 22, 26, 24, 24, 25, 24, 28, 24, 24, 11, 12, 24, 25, 24, 28, 24, 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 9 , 4 , 4 , 4 , 4 , 4 , 8 , 11, 17, 12, 24, 24, 24, 24, 28, 5 , 1 , 1 , 1,  3 , 17, 17, 17, 27, 25, 24, 24, 24, 24, 24, 24, 11, 12, 9 , 4 , 4 , 4 , 8 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 24, 30, 29, 24, 24, 5 , 1 , 1 , 1,  3 , 17, 16, 17, 24, 24, 9 , 4 , 4 , 4 , 4 , 8 , 11, 12, 5 , 1 , 1 , 1 , 3 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 24, 24, 24, 24, 24, 5 , 1 , 1 , 1,  3 , 17, 16, 17, 24, 24, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 6 , 2 , 2 , 2 , 7 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 6 , 2 , 2 , 2 , 2 , 2 , 7 , 11, 16, 12, 28, 28, 24, 24, 24, 6 , 2 , 2 , 2,  7 , 17, 16, 17, 24, 24, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 24, 25, 28, 24, 24, 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 14, 14, 14, 14, 14, 14, 14, 20, 16, 21, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 17, 16, 17, 29, 27, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 9 , 4 , 4 , 4 , 8 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 10, 10, 10, 10, 10, 10, 10, 18, 16, 19, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 17, 16, 17, 26, 24, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 5 , 1 , 1 , 1 , 3 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 9 , 4 , 4 , 4 , 4 , 4 , 8 , 11, 16, 12, 9 , 4 , 4 , 8 , 26, 24, 9 , 4 , 4 , 8 , 17, 16, 17, 24, 24, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 6 , 2 , 2 , 2 , 7 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 5 , 1 , 1 , 3 , 29, 27, 5 , 1 , 1 , 3 , 17, 16, 17, 24, 24, 5 , 1 , 1 , 1 , 1 , 3 , 11, 12, 24, 25, 24, 24, 24, 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 5 , 1 , 1 , 3 , 24, 24, 5 , 1 , 1 , 3 , 17, 16, 17, 24, 24, 6 , 2 , 2 , 2 , 2 , 7 , 11, 12, 9 , 4 , 4 , 4 , 8 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 6 , 2 , 2 , 2 , 2 , 2 , 7 , 11, 17, 12, 6 , 2 , 2 , 7 , 24, 24, 6 , 2 , 2 , 7 , 17, 17, 17, 25, 24, 28, 24, 24, 24, 24, 24, 11, 12, 5 , 1 , 1 , 1 , 3 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 28, 24, 24, 24, 25, 24, 22, 22, 22, 24, 25, 25, 24, 24, 28, 24, 24, 24, 24, 22, 22, 22, 24, 24, 24, 24, 28, 28, 24, 24, 11, 12, 6 , 2 , 2 , 2 , 7 , 11, 12, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 15, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 25, 25, 24, 24, 28, 24, 22, 22, 22, 24, 27, 24, 28, 28, 24, 24, 28, 24, 24, 24, 26, 24, 25, 28, 24, 24, 24, 29, 26, 24, 25, 28, 24, 22, 22, 22, 9 , 4 , 8 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 9 , 4 , 4 , 4 , 4 , 4 , 8 , 11, 17, 12, 26, 24, 24, 24, 24, 24, 9 , 4 , 4 , 4 , 8 , 24, 29, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 26, 17, 17, 17, 5 , 1 , 3 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 24, 24, 24, 24, 26, 24, 6 , 2 , 2 , 2 , 7 , 24, 24, 24, 24, 27, 28, 24, 24, 24, 25, 28, 24, 24, 17, 16, 17, 6 , 2 , 7 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 12, 9 , 4 , 4 , 8 , 33, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 34, 24, 9 , 4 , 8 , 17, 16, 17, 24, 24, 26, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 6 , 2 , 2 , 2 , 2 , 2 , 7 , 11, 16, 12, 5 , 1 , 1 , 3 , 11, 19, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 18, 12, 28, 5 , 1 , 3 , 17, 16, 17, 24, 24, 27, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 14, 14, 14, 14, 14, 14, 14, 20, 16, 12, 5 , 1 , 1 , 3 , 11, 12, 24, 24, 25, 28, 24, 24, 24, 24, 24, 24, 9 , 8 , 11, 12, 25, 5 , 1 , 3 , 17, 16, 17, 9 , 4 , 8 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 10, 10, 10, 10, 10, 10, 10, 18, 16, 12, 6 , 2 , 2 , 7 , 11, 12, 26, 24, 9 , 8 , 24, 24, 24, 24, 24, 24, 6 , 7 , 11, 12, 24, 5 , 1 , 3 , 17, 16, 17, 5 , 1 , 3 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 9 , 4 , 4 , 4 , 4 , 4 , 8 , 11, 16, 12, 24, 24, 27, 24, 11, 12, 24, 24, 6 , 7 , 24, 24, 24, 29, 26, 24, 25, 28, 11, 12, 24, 6 , 2 , 7 , 17, 16, 17, 6 , 2 , 7 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 21, 14, 14, 14, 14, 20, 12, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 24, 24, 11, 21, 14, 14, 14, 14, 17, 16, 17, 27, 25, 30, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 5 , 1 , 1 , 1 , 1 , 1 , 3 , 11, 16, 19, 10, 10, 10, 10, 18, 12, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 28, 24, 11, 19, 10, 10, 10, 10, 17, 16, 17, 24, 24, 24, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 6 , 2 , 2 , 2 , 2 , 2 , 7 , 11, 16, 12, 9 , 4 , 4 , 8 , 11, 12, 24, 24, 9 , 4 , 8 , 24, 24, 24, 24, 24, 24, 24, 11, 12, 24, 9 , 4 , 8 , 17, 16, 17, 9 , 4 , 8 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 25, 28, 24, 24, 24, 25, 24, 11, 16, 12, 5 , 1 , 1 , 3 , 11, 12, 27, 24, 5 , 1 , 3 , 24, 24, 24, 24, 24, 24, 24, 11, 12, 24, 5 , 1 , 3 , 17, 16, 17, 5 , 1 , 3 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 29, 24, 24, 24, 24, 24, 24, 11, 16, 12, 5 , 1 , 1 , 3 , 11, 12, 26, 24, 6 , 2 , 7 , 25, 24, 24, 26, 24, 25, 28, 11, 12, 26, 5 , 1 , 3 , 17, 16, 17, 6 , 2 , 7 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 24, 24, 24, 24, 24, 24, 11, 16, 12, 6 , 2 , 2 , 7 , 11, 21, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 20, 12, 27, 6 , 2 , 7 , 17, 16, 17, 24, 24, 25, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 9 , 4 , 4 , 4 , 8 , 25, 11, 16, 12, 24, 24, 24, 24, 31, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 32, 30, 25, 24, 26, 17, 16, 17, 24, 29, 26, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 25, 5 , 1 , 1 , 1 , 3 , 26, 11, 16, 12, 25, 24, 26, 24, 24, 24, 26, 24, 24, 26, 24, 24, 9 , 4 , 8 , 9 , 4 , 8 , 9 , 4 , 8 , 24, 24, 24, 17, 16, 17, 9 , 4 , 8 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 25, 5 , 1 , 1 , 1 , 3 , 27, 11, 16, 12, 24, 28, 24, 24, 9 , 4 , 8 , 9 , 4 , 8 , 24, 24, 5 , 1 , 3 , 5 , 1 , 3 , 5 , 1 , 3 , 28, 24, 24, 17, 16, 17, 5 , 1 , 3 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 25, 5 , 1 , 1 , 1 , 3 , 24, 11, 17, 12, 24, 24, 24, 24, 5 , 1 , 3 , 5 , 1 , 3 , 24, 24, 5 , 1 , 3 , 5 , 1 , 3 , 5 , 1 , 3 , 24, 24, 24, 17, 16, 17, 6 , 2 , 7 , 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 24, 6 , 2 , 2 , 2 , 7 , 24, 22, 22, 22, 25, 24, 24, 25, 6 , 2 , 7 , 6 , 2 , 7 , 29, 26, 6 , 2 , 7 , 6 , 2 , 7 , 6 , 2 , 7 , 24, 24, 24, 22, 22, 22, 24, 25, 28, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 15, 15, 15, 15, 15, 17, 23, 17, 17, 17, 23, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 23, 17, 17, 17, 23, 17, 15, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 37, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 23, 17, 17, 17, 23, 17, 17, 36, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
    [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39],
]

const tileNames = {};

for (const [name, id] of Object.entries(C.TILE)) {
    tileNames[id] = name.toLowerCase();
}

const images = {};

for (const [name, id] of Object.entries(C.TILE)) {
    const img = new Image();
    img.src = `./assets/city-map/${name.toLowerCase()}.png`;
    images[id] = img;
}

export function drawMap() {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {

            const type = map[y][x];

            if (type === C.TILE.EMPTY) continue;

            const wx = x * C.GRID_SIZE;
            const wy = y * C.GRID_SIZE;

            const pos = worldToScreen(wx, wy);

            ctx.drawImage(
                images[type],
                pos.x,
                pos.y,
                C.GRID_SIZE * state.camera.scale,
                C.GRID_SIZE * state.camera.scale
            );
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

// Safety net: if a search still explores more nodes than this, bail out with
// no path instead of letting one bad frame hang the tab.
const PATHFINDING_NODE_LIMIT = 4000;

export function findPath(start, end) {
    const key = p => `${p.x},${p.y}`;
    const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const open = [start];
    const openSet = new Set([key(start)]);
    const closed = new Set();

    const cameFrom = {};
    const gCost = { [key(start)]: 0 };
    const fCost = { [key(start)]: heuristic(start, end) };

    let visited = 0;

    while (open.length > 0) {
        if (++visited > PATHFINDING_NODE_LIMIT) return [];

        let bestIdx = 0;
        for (let i = 1; i < open.length; i++) {
            if (fCost[key(open[i])] < fCost[key(open[bestIdx])]) bestIdx = i;
        }
        const current = open.splice(bestIdx, 1)[0];
        const currentKey = key(current);
        openSet.delete(currentKey);

        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
        }
        closed.add(currentKey);

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const next of neighbors) {
            const nextKey = key(next);
            if (closed.has(nextKey)) continue;

            const isTarget = next.x === end.x && next.y === end.y;
            if (
                next.y < 0 || next.y >= map.length ||
                next.x < 0 || next.x >= map[0].length ||
                (!isWalkableTile(map[next.y][next.x]) && !isTarget)
            ) {
                continue;
            }

            const tentativeG = gCost[currentKey] + 1;
            if (gCost[nextKey] === undefined || tentativeG < gCost[nextKey]) {
                cameFrom[nextKey] = current;
                gCost[nextKey] = tentativeG;
                fCost[nextKey] = tentativeG + heuristic(next, end);
                if (!openSet.has(nextKey)) {
                    open.push(next);
                    openSet.add(nextKey);
                }
            }
        }
    }
    return [];
}

// Zoomed, player-centered minimap: shows roughly a MINIMAP_TILE_SPAN x
// MINIMAP_TILE_SPAN window of tiles around the player instead of the whole
// map shrunk down, so detail near the player is actually readable. Potions
// (red/blue) that fall outside that window get an arrow on the minimap's
// border pointing toward them instead.
const MINIMAP_SIZE = 260;
const MINIMAP_TILE_SPAN = 25; // tiles visible across the minimap
const MINIMAP_TILE_RADIUS = MINIMAP_TILE_SPAN / 2;

function minimapTileColor(tileId) {
    if (tileId === undefined) return "#0a0a0a";
 
    if (tileId === 2 || tileId === 3 || tileId === 4 || tileId === 5 ||
        tileId === 6 || tileId === 7 || tileId === 8 || tileId === 9
    ) {
        return "#b7b7b7";
    }
    else if (tileId === 10 || tileId === 11 || tileId === 12 || tileId === 13 || tileId === 14) {
        return "#434343";
    }
    else if (tileId === 15 || tileId === 16 || tileId === 17 || tileId === 31 || tileId === 32 || tileId === 33 || tileId === 34) {
        return "#434343";
    }
    else if (tileId === 18 || tileId === 19 || tileId === 20 || tileId === 21 || tileId === 22 || tileId === 23) {
        return "#434343";
    }
    else if (tileId === 24 || tileId === 29 || tileId === 30) {
        return "#6aa84f";
    }
    else if (tileId === 25 || tileId === 26 || tileId === 27 || tileId === 28) {
        return "#6aa84f";
    }
}

function drawMinimapPotionIndicators(ctx, cx, cy, size) {
    const edgeRadius = size / 2 - 12;
    state.drops.forEach(drop => {
        if (drop.type !== "red" && drop.type !== "blue") return;
        const dx = drop.x - state.player.x;
        const dy = drop.y - state.player.y;
        const distTiles = Math.max(Math.abs(dx), Math.abs(dy)) / C.GRID_SIZE;
        if (distTiles <= MINIMAP_TILE_RADIUS) return; // already visible on the map itself

        const angle = Math.atan2(dy, dx);
        const ix = cx + Math.cos(angle) * edgeRadius;
        const iy = cy + Math.sin(angle) * edgeRadius;

        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(angle);
        ctx.fillStyle = drop.type === "red" ? "#ff4d4d" : "#22c3ff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}

export function drawMinimap(ctx, canvas) {
    const margin = 16;
    const size = MINIMAP_SIZE;
    const minimapX = canvas.width - size - margin;
    const minimapY = canvas.height - size - margin;
    const tileSize = size / MINIMAP_TILE_SPAN;

    const playerCol = state.player.x / C.GRID_SIZE;
    const playerRow = state.player.y / C.GRID_SIZE;

    // World -> minimap pixel, centered on the player.
    const toMinimap = (wx, wy) => ({
        x: minimapX + size / 2 + (wx / C.GRID_SIZE - playerCol) * tileSize,
        y: minimapY + size / 2 + (wy / C.GRID_SIZE - playerRow) * tileSize
    });

    ctx.save();

    // Panel background
    ctx.fillStyle = "rgba(18, 18, 20, 0.9)";
    ctx.fillRect(minimapX - 4, minimapY - 4, size + 8, size + 8);

    // Clip everything below to the minimap square
    ctx.save();
    ctx.beginPath();
    ctx.rect(minimapX, minimapY, size, size);
    ctx.clip();

    const startCol = Math.floor(playerCol - MINIMAP_TILE_RADIUS) - 1;
    const endCol = Math.ceil(playerCol + MINIMAP_TILE_RADIUS) + 1;
    const startRow = Math.floor(playerRow - MINIMAP_TILE_RADIUS) - 1;
    const endRow = Math.ceil(playerRow + MINIMAP_TILE_RADIUS) + 1;

    for (let row = startRow; row <= endRow; row++) {
        const mapRow = map[row];
        for (let col = startCol; col <= endCol; col++) {
            const tileId = mapRow ? mapRow[col] : undefined;
            const pos = toMinimap(col * C.GRID_SIZE, row * C.GRID_SIZE);
            ctx.fillStyle = minimapTileColor(tileId);
            ctx.fillRect(pos.x, pos.y, tileSize + 0.5, tileSize + 0.5);
        }
    }

    ctx.fillStyle = "red";
    for (const enemy of state.enemies) {
        const pos = toMinimap(enemy.x, enemy.y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#8000ff";
    for (const well of state.wells) {
        const pos = toMinimap(well.x, well.y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const drop of state.drops) {
        if (drop.type !== "red" && drop.type !== "blue") continue;
        const pos = toMinimap(drop.x, drop.y);
        ctx.fillStyle = drop.type === "red" ? "#e46666" : "#00d4ff";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(minimapX + size / 2, minimapY + size / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // undo clip

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.strokeRect(minimapX - 4, minimapY - 4, size + 8, size + 8);

    drawMinimapPotionIndicators(ctx, minimapX + size / 2, minimapY + size / 2, size);

    ctx.restore();
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
            trappedEnemies: [],
            explosionSoundPlayed: false
        });
        state.wellsPlaced++;
        state.nextWellSpawnTime += C.WELL_SPAWN_COOLDOWN;
        playSound('wellPlace');
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
        // Cue the explosion sfx before the well actually detonates (see
        // WELL_EXPLOSION_SOUND_LEAD) so the sound's impact — not its
        // start — lands on the same frame as the visual/damage burst
        // below. Guarded by explosionSoundPlayed so it fires exactly once
        // per well, even though this check runs every frame the well is
        // within its lead window.
        if (!well.explosionSoundPlayed && well.life <= C.WELL_EXPLOSION_SOUND_LEAD) {
            well.explosionSoundPlayed = true;
            playSound('wellExplosion', { volume: 0.3 });
        }
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

    if (map[centerRow] && isWalkableTile(map[centerRow][centerCol])) {
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

                if (map[r] && isWalkableTile(map[r][c])) {
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
            if (map[y] && isSolidTile(map[y][x])) {
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