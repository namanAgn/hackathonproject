// enemies.js
import * as C from './constants.js';
import { state } from './state.js';
import { explode } from './explosions.js';
import { gridToWorld, worldToGrid, findPath } from './map.js';

export function spawnEnemyPredefined(x, y, type) {
    const cfg = C.ENEMY_CONFIGS[type];
    let spawnX = x;
    let spawnY = y;
    const enemy = {
        type,
        x: spawnX,
        y: spawnY,
        velocity: { x: 0, y: 0 },
        force: { x: 0, y: 0 },
        knockback: { x: 0, y: 0 },
        speed: cfg.speed,
        health: cfg.health,
        maxHealth: cfg.health,
        w: cfg.w,
        h: cfg.h,
        color: cfg.color,
        angle: 0,
        hitFlash: 0,
        damage: cfg.damage,
        cooldown: cfg.attackCooldown,
        nextAttack: 0,
        focusReward: cfg.focusReward,
        scoreReward: cfg.scoreReward,
        gravityResistance: cfg.gravityResistance,
        knockbackResistance: cfg.knockbackResistance,
        path: [],
        pathTimer: 0
    };
    if (enemy.type === "explosive") {
        enemy.explosiveRadius = C.ENEMY_CONFIGS[enemy.type].explosiveRadius;
        enemy.explosiveDamage = C.ENEMY_CONFIGS[enemy.type].explosiveDamage;
    }
    state.enemies.push(enemy);
}

export function spawnEnemy() {
    let type;
    const r = Math.random();
    if (r < 0.35) type = "regular";
    else if (r < 0.55) type = "fast";
    else if (r < 0.70) type = "explosive";
    else if (r < 0.78) type = "splitter1";
    else if (r < 0.85) type = "splitter2";
    else if (r < 0.91) type = "splitter3";
    else if (r < 0.97) type = "heavy";
    else type = "regular";
    const cfg = C.ENEMY_CONFIGS[type];
    const openTiles = [];
    for (let y1 = 0; y1 < state.map.length; y1++) {
        for (let x1 = 0; x1 < state.map[y1].length; x1++) {
            if (state.map[y1][x1] === C.TILE.FLOOR) openTiles.push({ x: x1, y: y1 });
        }
    }
    const MIN_SPAWN_DISTANCE = 800;
    let spawnX = state.player.x + MIN_SPAWN_DISTANCE;
    let spawnY = state.player.y;
    if (openTiles.length > 0) {
        let found = false;
        for (let attempts = 0; attempts < 100; attempts++) {
            const tile = openTiles[Math.floor(Math.random() * openTiles.length)];
            const worldPos = gridToWorld(tile.x, tile.y);
            const dx = worldPos.x - state.player.x;
            const dy = worldPos.y - state.player.y;
            if (dx * dx + dy * dy >= MIN_SPAWN_DISTANCE * MIN_SPAWN_DISTANCE) {
                spawnX = worldPos.x - cfg.w / 2;
                spawnY = worldPos.y - cfg.h / 2;
                found = true;
                break;
            }
        }
        if (!found) {
            const tile = openTiles[Math.floor(Math.random() * openTiles.length)];
            const worldPos = gridToWorld(tile.x, tile.y);
            spawnX = worldPos.x - cfg.w / 2;
            spawnY = worldPos.y - cfg.h / 2;
        }
    }
    const enemy = {
        type,
        x: spawnX,
        y: spawnY,
        velocity: { x: 0, y: 0 },
        force: { x: 0, y: 0 },
        knockback: { x: 0, y: 0 },
        speed: cfg.speed,
        health: cfg.health,
        maxHealth: cfg.health,
        w: cfg.w,
        h: cfg.h,
        color: cfg.color,
        angle: 0,
        hitFlash: 0,
        damage: cfg.damage,
        cooldown: cfg.attackCooldown,
        nextAttack: 0,
        focusReward: cfg.focusReward,
        scoreReward: cfg.scoreReward,
        gravityResistance: cfg.gravityResistance,
        knockbackResistance: cfg.knockbackResistance,
        path: [],
        pathTimer: 0
    };
    if (enemy.type === "explosive") {
        enemy.explosiveRadius = C.ENEMY_CONFIGS[enemy.type].explosiveRadius;
        enemy.explosiveDamage = C.ENEMY_CONFIGS[enemy.type].explosiveDamage;
    }
    state.enemies.push(enemy);
}

export function spawnEnemies() {
    if (state.enemies.length <= 35 && state.time >= state.nextEnemySpawnTime && state.enableSpawnEnemies) {
        spawnEnemy();
        state.nextEnemySpawnTime = state.time + C.ENEMY_SPAWN_COOLDOWN;
    }
}

export function spawnDeathParticles(enemy) {
    const count = 14;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        const size = 4 + Math.random() * 6;
        state.deathParticles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.35,
            life: 30,
            maxLife: 30,
            color: enemy.color
        });
    }
}

export function separateEnemies(enemy) {
    let pushX = 0;
    let pushY = 0;
    state.enemies.forEach(other => {
        if (enemy === other) return;
        const dx = enemy.x - other.x;
        const dy = enemy.y - other.y;
        const dist = Math.hypot(dx, dy);
        const minDist = enemy.w;
        if (dist < minDist && dist > 0) {
            pushX += dx / dist;
            pushY += dy / dist;
        }
    });
    enemy.force.x += pushX * 0.5;
    enemy.force.y += pushY * 0.5;
}

function checkEntityTileCollision(entity) {
    const left = Math.floor(entity.x / C.GRID_SIZE);
    const right = Math.floor((entity.x + entity.w - 1) / C.GRID_SIZE);
    const top = Math.floor(entity.y / C.GRID_SIZE);
    const bottom = Math.floor((entity.y + entity.h - 1) / C.GRID_SIZE);
    for (let y1 = top; y1 <= bottom; y1++) {
        for (let x1 = left; x1 <= right; x1++) {
            if (state.map[y1] && state.map[y1][x1] === C.TILE.WALL) return true;
        }
    }
    return false;
}

export function updateEnemies() {
    const pCenter = { x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2 };
    const playerGrid = worldToGrid(pCenter.x, pCenter.y);
    state.enemies.forEach((enemy) => {
        const ex = enemy.x + enemy.w / 2;
        const ey = enemy.y + enemy.h / 2;
        const distToPlayer = Math.hypot(pCenter.x - ex, pCenter.y - ey);
        if (distToPlayer < state.player.w && state.time >= enemy.nextAttack) {
            if (enemy.type === "explosive") {
                state.player.hitFlash = 0.1;
                state.damageReceived += enemy.damage;
                enemy.nextAttack = state.time + enemy.cooldown;
                explode(enemy.x, enemy.x, enemy.explosiveRadius, enemy.explosiveDamage);
                return;
            }

            state.player.health -= enemy.damage;
            state.damageReceived += enemy.damage;
            state.player.hitFlash = 0.1;
            enemy.nextAttack = state.time + enemy.cooldown;
        }
        enemy.pathTimer--;
        if (enemy.pathTimer <= 0) {
            const enemyGrid = worldToGrid(ex, ey);
            enemy.path = findPath(enemyGrid, playerGrid);
            enemy.pathTimer = 15;
        }
        let targetX = pCenter.x;
        let targetY = pCenter.y;
        if (enemy.path && enemy.path.length > 1) {
            const nextNode = enemy.path[1];
            const waypointWorld = gridToWorld(nextNode.x, nextNode.y);
            targetX = waypointWorld.x;
            targetY = waypointWorld.y;
            if (Math.hypot(waypointWorld.x - ex, waypointWorld.y - ey) < 10) enemy.path.shift();
        }
        let dx = targetX - ex;
        let dy = targetY - ey;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) { dx /= dist; dy /= dist; }
        if (enemy.hitFlash > 0) enemy.hitFlash -= 0.01;
        enemy.angle = Math.atan2(pCenter.y - ey, pCenter.x - ex);
        enemy.velocity.x = dx * enemy.speed + enemy.force.x;
        enemy.velocity.y = dy * enemy.speed + enemy.force.y;
        enemy.force.x *= 0.9;
        enemy.force.y *= 0.9;
        const moveX = enemy.velocity.x + enemy.knockback.x;
        const moveY = enemy.velocity.y + enemy.knockback.y;
        enemy.x += moveX;
        if (checkEntityTileCollision(enemy)) {
            enemy.x -= moveX;
            enemy.knockback.x = 0;
        }
        enemy.y += moveY;
        if (checkEntityTileCollision(enemy)) {
            enemy.y -= moveY;
            enemy.knockback.y = 0;
        }
        enemy.knockback.x *= 0.9;
        enemy.knockback.y *= 0.9;
        const pDx = ex - pCenter.x;
        const pDy = ey - pCenter.y;
        const pDist = Math.hypot(pDx, pDy);
        const minPlayerDist = (enemy.w + state.player.w) / 2;
        if (pDist < minPlayerDist) {
            if (pDist > 0) {
                const pushX = (pDx / pDist) * (minPlayerDist - pDist);
                const pushY = (pDy / pDist) * (minPlayerDist - pDist);
                enemy.x += pushX;
                enemy.y += pushY;
            } else {
                enemy.x += minPlayerDist;
            }
            if (checkEntityTileCollision(enemy)) {
                enemy.x -= (pDist > 0 ? (pDx / pDist) * (minPlayerDist - pDist) : minPlayerDist);
                enemy.y -= (pDist > 0 ? (pDy / pDist) * (minPlayerDist - pDist) : 0);
            }
        }
    });
}

export function traceEnemyShape(enemy, w, h, ctx) {
    switch (enemy.type) {
        case "fast": {
            ctx.beginPath();
            ctx.moveTo(w * 0.52, 0);
            ctx.lineTo(-w * 0.38, -h * 0.42);
            ctx.lineTo(-w * 0.16, 0);
            ctx.lineTo(-w * 0.38, h * 0.42);
            ctx.closePath();
            break;
        }
        case "explosive": {
            ctx.beginPath();
            ctx.moveTo(w * 0.78, 0);
            ctx.lineTo(-w * 0.57, -h * 0.63);
            ctx.lineTo(-w * 0.24, 0);
            ctx.lineTo(-w * 0.57, h * 0.63);
            ctx.closePath();
            break;
        }
        case "heavy": {
            const rx = w / 2, ry = h / 2;
            const cx = rx * 0.38, cy = ry * 0.38;
            ctx.beginPath();
            ctx.moveTo(-rx + cx, -ry);
            ctx.lineTo(rx - cx, -ry);
            ctx.lineTo(rx, -ry + cy);
            ctx.lineTo(rx, ry - cy);
            ctx.lineTo(rx - cx, ry);
            ctx.lineTo(-rx + cx, ry);
            ctx.lineTo(-rx, ry - cy);
            ctx.lineTo(-rx, -ry + cy);
            ctx.closePath();
            break;
        }
        case "splitter1":
        case "splitter2":
        case "splitter3": {
            const scale = 1.35;
            const rx = (w / 2) * scale, ry = (h / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.lineTo(0, -ry);
            ctx.lineTo(-rx, 0);
            ctx.lineTo(0, ry);
            ctx.closePath();
            break;
        }
        default: {
            const radius = Math.min(w, h) * 0.18;
            // draw rounded rectangle path
            const r = radius;
            ctx.beginPath();
            ctx.moveTo(-w/2 + r, -h/2);
            ctx.arcTo(w/2, -h/2, w/2, h/2, r);
            ctx.arcTo(w/2, h/2, -w/2, h/2, r);
            ctx.arcTo(-w/2, h/2, -w/2, -h/2, r);
            ctx.arcTo(-w/2, -h/2, w/2, -h/2, r);
            ctx.closePath();
            break;
        }
    }
}

export function drawEnemyBody(enemy, ctx) {
    const center = { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 };
    const w = enemy.w * state.camera.scale;
    const h = enemy.h * state.camera.scale;
    const lightColor = shadeColor(enemy.color, 28);
    const darkColor = shadeColor(enemy.color, -32);
    ctx.save();
    ctx.translate(center.x * state.camera.scale + state.camera.x, center.y * state.camera.scale + state.camera.y);
    ctx.rotate(enemy.angle);
    traceEnemyShape(enemy, w, h, ctx);
    if (enemy.hitFlash > 0) ctx.fillStyle = "#ffffff"; else ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 3 * state.camera.scale);
    ctx.strokeStyle = enemy.hitFlash > 0 ? "#ffffff" : darkColor;
    ctx.stroke();
    ctx.restore();
}

export function drawEnemyHealthBar(enemy, ctx) {
    const barWidth = enemy.w * 0.9;
    const barHeight = 7;
    const offsetY = 12;
    const worldX = enemy.x + (enemy.w - barWidth) / 2;
    const worldY = enemy.y - offsetY - barHeight;
    const topLeft = { x: worldX * state.camera.scale + state.camera.x, y: worldY * state.camera.scale + state.camera.y };
    const w = barWidth * state.camera.scale;
    const h = barHeight * state.camera.scale;
    const pct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(topLeft.x - 1, topLeft.y - 1, w + 2, h + 2);
    let fillColor;
    if (pct > 0.5) fillColor = "#4caf50";
    else if (pct > 0.2) fillColor = "#ffb300";
    else fillColor = "#f44336";
    ctx.fillStyle = fillColor;
    ctx.fillRect(topLeft.x, topLeft.y, w * pct, h);
}

export function drawEnemies(ctx) {
    state.enemies.forEach(enemy => {
        drawEnemyBody(enemy, ctx);
        drawEnemyHealthBar(enemy, ctx);
    });
}

// small color utility reimplemented locally to avoid circular import
function shadeColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    let r = (num >> 16) + amt;
    let g = (num >> 8 & 0x00ff) + amt;
    let b = (num & 0x0000ff) + amt;
    r = r < 255 ? (r < 0 ? 0 : r) : 255;
    g = g < 255 ? (g < 0 ? 0 : g) : 255;
    b = b < 255 ? (b < 0 ? 0 : b) : 255;
    return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}