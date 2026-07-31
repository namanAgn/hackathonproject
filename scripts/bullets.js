// bullets.js
import * as C from './constants.js';
import { state } from './state.js';
import { worldToScreen, drawRect } from './utils.js';
import { spawnEnemyPredefined, spawnDeathParticles } from './enemies.js'; // enemies.js exports these
import { damageBarrelsInRadius, isSolidTile } from './map.js';
import { explode } from './explosions.js';
import { playSound } from './audio.js';

export function spawnBullet() {
    const cfg = C.BULLET_CONFIGS[state.selectedTool];
    if (!cfg) return;
    const bulletSpeed = cfg.speed;
    const bulletDamage = cfg.damage;
    const bulletW = cfg.w;
    const bulletH = cfg.h;
    const bulletLife = cfg.life;
    const bullet = {
        type: state.selectedTool,
        x: state.player.x + state.player.w / 2 - bulletW / 2,
        y: state.player.y + state.player.h / 2 - bulletH / 2,
        velocity: { x: Math.cos(state.player.angle) * bulletSpeed, y: Math.sin(state.player.angle) * bulletSpeed },
        speed: bulletSpeed,
        w: bulletW,
        h: bulletH,
        angle: state.player.angle,
        damage: bulletDamage,
        life: bulletLife,
        maxLife: bulletLife
    };
    if (state.selectedTool === "rifle") {
        state.rifleBulletsShot++;
        // Rapid clicking/holding fires many of these per second — a slight
        // random pitch wobble keeps that from sounding like a single sample
        // stuttering, and the pool in audio.js keeps overlapping copies from
        // cutting each other off.
        playSound('rifleFire', { volume: 0.2, rate: 0.95 + Math.random() * 0.1 });
    }
    if (state.selectedTool === "orb") {
        bullet.markedEnemies = [];
        bullet.pullStrength = 1;
        bullet.radius = 150;
        bullet.explosionDamage = 75;
        state.orbsShot++;
        playSound('wellPlace', { volume: 0.3, rate: 0.95 + Math.random() * 0.1 });
    }
    if (state.selectedTool === "rocket") {
        bullet.explosionRadius = C.BULLET_CONFIGS.rocket.explosionRadius;
        bullet.explosionDamage = C.BULLET_CONFIGS.rocket.explosionDamage;
        bullet.explosionForce = C.BULLET_CONFIGS.rocket.explosionForce;
        state.rocketsShot++;
        playSound('rocketLaunch', { volume: 0.85 });
    }
    state.player.recoil = 20;
    state.bullets.push(bullet);
}

function drawBulletShape(x, y, w, h, color, angle, ctx) {
    const center = worldToScreen(x + w / 2, y + h / 2);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.scale(state.camera.scale, state.camera.scale);
    const r = h / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -r);
    ctx.lineTo(w / 2 - r, -r);
    ctx.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-w / 2, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a3952b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 + 2 - r - 3, -r);
    ctx.lineTo(w / 2 + 2 - r - 3, r);
    ctx.stroke();
    ctx.restore();
}

function drawRocket(x, y, w, h, angle, ctx) {
    const center = worldToScreen(x + w / 2, y + h / 2);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.fillStyle = "#777";
    ctx.fillRect(-w / 2 + 6, -h / 2, w - 12, h);
    ctx.fillStyle = "#d84343";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 - 10, -h / 2);
    ctx.lineTo(w / 2 - 10, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#444";
    ctx.fillRect(-w / 2, -h / 2 + 2, 6, h - 4);
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, -h / 2);
    ctx.lineTo(-w / 2 - 5, -h);
    ctx.lineTo(-w / 2 + 10, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, h / 2);
    ctx.lineTo(-w / 2 - 5, h);
    ctx.lineTo(-w / 2 + 10, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d8c72d";
    ctx.fillRect(w / 2 - 20, -h / 2, 3, h);
    ctx.restore();
}

export function spawnOrbExplosionEffect(x, y, radius) {
    state.deathParticles.push({ x: x, y: y, vx: 0, vy: 0, size: 8, targetSize: radius, life: 16, maxLife: 16, isShockwave: true, color: C.ORB_GLOW_INNER });
    const particleCount = 36;
    const colors = ["#f3e8ff", "#d8b4fe", "#c084fc", "#a855f7", "#7c3aed", "#3b0764"];
    for (let p = 0; p < particleCount; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 9;
        const particleColor = colors[Math.floor(Math.random() * colors.length)];
        state.deathParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 10,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.5,
            life: 18 + Math.floor(Math.random() * 18),
            maxLife: 36,
            color: particleColor
        });
    }
}

export function explodeOrb(orb) {
    playSound('orbExplosion');
    spawnOrbExplosionEffect(orb.x, orb.y, orb.radius);
    damageBarrelsInRadius(orb.x, orb.y, orb.radius, orb.explosionDamage);
    orb.markedEnemies.forEach(enemy => {
        enemy.health -= orb.explosionDamage;
        state.deathParticles.push({ x: enemy.x + enemy.w / 2, y: enemy.y, vx: 0, vy: 0, size: 6, life: 20, maxLife: 20, color: "#fff" });
        const dx = enemy.x - orb.x;
        const dy = enemy.y - orb.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            enemy.knockback.x += ((dx / dist) * 20) / enemy.knockbackResistance;
            enemy.knockback.y += ((dy / dist) * 20) / enemy.knockbackResistance;
        }
    });
}

export function updateOrbs() {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const orb = state.bullets[i];
        if (orb.type === "orb") {
            orb.x += orb.velocity.x;
            orb.y += orb.velocity.y;
            orb.life--;
            state.enemies.forEach(enemy => {
                const ex = enemy.x + enemy.w / 2;
                const ey = enemy.y + enemy.h / 2;
                let dx = orb.x - ex;
                let dy = orb.y - ey;
                const dist = Math.hypot(dx, dy);
                if (dist < orb.radius && dist > 0) {
                    dx /= dist;
                    dy /= dist;
                    enemy.force.x += dx * orb.pullStrength / enemy.gravityResistance;
                    enemy.force.y += dy * orb.pullStrength / enemy.gravityResistance;
                    if (!orb.markedEnemies.includes(enemy)) orb.markedEnemies.push(enemy);
                }
            });
            if (orb.life <= 0) {
                explodeOrb(orb);
                state.camera.shakeIntensity = 20;
                state.camera.shakeDuration = 15;
                state.bullets.splice(i, 1);
            }
        }
    }
}

export function updateBullets(map) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        if (bullet.type === "rifle") {
            bullet.x += bullet.velocity.x;
            bullet.y += bullet.velocity.y;
            bullet.life--;
            if (bullet.life <= 0) { state.bullets.splice(i, 1); continue; }
            const gridX = Math.floor(bullet.x / C.GRID_SIZE);
            const gridY = Math.floor(bullet.y / C.GRID_SIZE);
            if (gridY < 0 || gridY >= map.length || gridX < 0 || gridX >= map[0].length || isSolidTile(map[gridY][gridX])) {
                state.bullets.splice(i, 1);
                continue;
            }
            for (let k = state.barrels.length - 1; k >= 0; k--) {
                const barrel = state.barrels[k];
                if (barrel.destroyed || barrel.health <= 0) continue;
                const bxw = barrel.x + C.BARREL_R * 2;
                const byw = barrel.y + C.BARREL_R * 2;
                const dist = Math.hypot(bxw - bullet.x, byw - bullet.y);
                if (dist < barrel.r + bullet.w / 2) {
                    barrel.health -= bullet.damage;
                    barrel.hitFlash = 0.1;
                    state.bullets.splice(i, 1);
                    continue;
                }
            }
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const enemy = state.enemies[j];
                const bx = bullet.x + bullet.w / 2;
                const by = bullet.y + bullet.h / 2;
                const ex = enemy.x + enemy.w / 2;
                const ey = enemy.y + enemy.h / 2;
                const dx = ex - bx;
                const dy = ey - by;
                const dist = Math.hypot(dx, dy);
                if (dist < enemy.w / 2 + 16) {
                    enemy.health -= bullet.damage;
                    state.damageDealt += bullet.damage;
                    enemy.hitFlash = 0.1;
                    enemy.knockback.x += (dx / dist) * 5;
                    enemy.knockback.y += (dy / dist) * 5;
                    state.deathParticles.push({ x: enemy.x + enemy.w / 2, y: enemy.y, vx: 0, vy: 0, size: 6, life: 20, maxLife: 20, color: "#fff" });
                    if (enemy.health > 0) playSound('enemyHit', { volume: 0.5, rate: 0.9 + Math.random() * 0.2 });
                    if (enemy.health <= 0) {
                        spawnDeathParticles(enemy);
                        state.enemies.splice(j, 1);
                        state.drops.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, value: enemy.focusReward || 30, size: 12, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, friction: 0.92, life: C.DROP_LIFE, type: "focus" });
                        state.killsTillBlue++;
                        state.killsTillRed++;

                        const shouldSpawnHealth = Math.random();
                        if (shouldSpawnHealth <= C.HEALTH_PROBABILITY) {
                            state.drops.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, value: 15, size: 12, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, friction: 0.92, life: C.DROP_LIFE, type: "health" });
                        }

                        state.score += enemy.scoreReward;
                        state.enemiesKilled++;

                        if (enemy.type === "splitter1") {
                            playSound('splitterSplit');
                            spawnEnemyPredefined(enemy.x, enemy.y, "fast");
                            spawnEnemyPredefined(enemy.x - 50, enemy.y, "fast");
                            spawnEnemyPredefined(enemy.x + 50, enemy.y, "fast");
                        } else if (enemy.type === "splitter2") {
                            playSound('splitterSplit');
                            spawnEnemyPredefined(enemy.x, enemy.y, "regular");
                            spawnEnemyPredefined(enemy.x + 50, enemy.y, "regular");
                        } else if (enemy.type === "splitter3") {
                            playSound('splitterSplit');
                            spawnEnemyPredefined(enemy.x, enemy.y, "regular");
                            spawnEnemyPredefined(enemy.x - 50, enemy.y, "fast");
                            spawnEnemyPredefined(enemy.x + 50, enemy.y, "fast");
                        } else if (enemy.type === "splitter4") {
                            playSound('splitterSplit');
                            spawnEnemyPredefined(enemy.x - 50, enemy.y, "sniper");
                            spawnEnemyPredefined(enemy.x + 50, enemy.y, "sniper");
                        }
                        
                        if (enemy.type === "explosive") {
                            explode(enemy.x, enemy.y, enemy.explosiveRadius, enemy.explosiveDamage)
                        }
                    }
                    state.bullets.splice(i, 1);
                    break;
                }
            }
        } else if (bullet.type === "rocket") {
            bullet.x += bullet.velocity.x;
            bullet.y += bullet.velocity.y;
            bullet.life--;
            const bx = bullet.x + bullet.w / 2;
            const by = bullet.y + bullet.h / 2;
            if (bullet.life <= 0) {
                // explode
                explode(bx, by, bullet.explosionRadius, bullet.explosionDamage);
                state.bullets.splice(i, 1);
                continue;
            }
            const gridX = Math.floor(bx / C.GRID_SIZE);
            const gridY = Math.floor(by / C.GRID_SIZE);
            if (gridY < 0 || gridY >= map.length || gridX < 0 || gridX >= map[0].length || isSolidTile(map[gridY][gridX])) {
                explode(bx, by, bullet.explosionRadius, bullet.explosionDamage);
                state.bullets.splice(i, 1);
                continue;
            }
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const enemy = state.enemies[j];
                const ex = enemy.x + enemy.w / 2;
                const ey = enemy.y + enemy.h / 2;
                const dist = Math.hypot(ex - bx, ey - by);
                if (dist < enemy.w / 2 + bullet.w / 2) {
                    explode(bx, by, bullet.explosionRadius, bullet.explosionDamage);
                    state.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
}

export function drawBullets(ctx) {
    state.bullets.forEach(bullet => {
        if (bullet.type === "rifle") drawBulletShape(bullet.x, bullet.y, bullet.w, bullet.h, C.BULLET_COLOR, bullet.angle, ctx);
        else if (bullet.type === "orb") {
            // reuse draw patterns from original -- simplified to radial glow
            const lifePct = bullet.life / bullet.maxLife;
            let chargeScale = 1;
            if (lifePct < C.ORB_CHARGE_THRESHOLD) {
                const t = 1 - lifePct / C.ORB_CHARGE_THRESHOLD;
                chargeScale = 1 + t * t * 0.8;
            }
            const pulse = 1 + Math.sin(state.time * 14) * 0.05;
            const scale = chargeScale * pulse;
            const centerX = bullet.x + bullet.w / 2;
            const centerY = bullet.y + bullet.h / 2;
            const pos = worldToScreen(centerX, centerY);
            const baseR = (bullet.w / 2) * state.camera.scale;
            const r = baseR * scale;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            const gradient = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.6);
            gradient.addColorStop(0, C.ORB_GLOW_INNER);
            gradient.addColorStop(0.45, C.ORB_GLOW_OUTER);
            gradient.addColorStop(1, "rgba(124, 58, 237, 0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = C.ORB_CORE_COLOR;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = C.ORB_RING_COLOR;
            ctx.lineWidth = Math.max(1, 2 * state.camera.scale);
            ctx.globalAlpha = 0.8;
            ctx.save();
            ctx.rotate(state.time * 3.2);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.0, r * 0.38, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.rotate(-state.time * 2.3 + Math.PI / 3);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.9, r * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (bullet.type === "rocket") drawRocket(bullet.x, bullet.y, bullet.w, bullet.h, bullet.angle, ctx);
    });
}