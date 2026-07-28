// explosions.js
// Single shared explosion routine used by rockets, barrels, and (optionally) other
// area-effect sources. Handles: screen shake, particles, barrel damage, player damage
// + knockback, enemy damage + knockback + kill/loot/splitter logic.
import * as C from './constants.js';
import { state } from './state.js';
import { spawnDeathParticles, spawnEnemyPredefined } from './enemies.js';
import { damageBarrelsInRadius } from './map.js';
import { triggerScreenShake } from './utils.js';

export function spawnFloatingText(x, y, text, color, type = "damage") {
    state.damageTexts.push({
        x,
        y,
        text,
        color,
        type,
        life: 40,
        velocityY: -1
    });
}

export function explode(x, y, radius = 280, damage = 160, options = {}) {
    const {
        shakeIntensity = 18,
        shakeDuration = 15,
        spawnVisuals = true,
        shockwaveColor = "#ffa500",
        particleColors = ["#ffffff", "#ffe600", "#ff6600", "#ff2200", "#444444"],
        particleCount = 50,
        knockbackForce = 35,
        playerDamageMultiplier = 0.5
    } = options;

    // 1. Screen shake
    triggerScreenShake(shakeIntensity, shakeDuration);

    if (spawnVisuals) {
        // 2. Expanding shockwave ring
        state.deathParticles.push({
            x, y, vx: 0, vy: 0,
            size: 10,
            targetSize: radius,
            life: 18,
            maxLife: 18,
            isShockwave: true,
            color: shockwaveColor
        });

        // 3. Debris/fire particles
        for (let p = 0; p < particleCount; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 12;
            const particleColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            state.deathParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6 + Math.random() * 14,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.6,
                life: 20 + Math.floor(Math.random() * 20),
                maxLife: 40,
                color: particleColor
            });
        }
    }

    damageBarrelsInRadius(x, y, radius, damage);

    // Player damage + knockback
    const player = state.player;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const pdx = px - x;
    const pdy = py - y;
    const pDist = Math.hypot(pdx, pdy);

    if (pDist <= radius) {
        const playerDamage = Math.max(1, Math.round(damage * (1 - pDist / radius) * playerDamageMultiplier));
        player.health -= playerDamage;
        state.damageReceived += playerDamage;
        player.hitFlash = 0.1;
        spawnFloatingText(px, player.y, `-${playerDamage}`, "#ff3333");

        const pForce = knockbackForce * (1 - pDist / radius);
        const pSafeDist = pDist || 1;
        if (player.knockback) {
            player.knockback.x += (pdx / pSafeDist) * pForce;
            player.knockback.y += (pdy / pSafeDist) * pForce;
        }
    }

    // 4. Enemy damage, knockback, kill/loot/splitter logic
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        const ex = enemy.x + enemy.w / 2;
        const ey = enemy.y + enemy.h / 2;
        const dx = ex - x;
        const dy = ey - y;
        const dist = Math.hypot(dx, dy);

        if (dist > radius) continue;

        const dealtDamage = Math.max(1, Math.round(damage * (1 - dist / radius)));
        enemy.health -= dealtDamage;
        enemy.hitFlash = 0.2;

        const force = knockbackForce * (1 - dist / radius);
        const kRes = enemy.knockbackResistance || 1;
        const safeDist = dist || 1;
        enemy.knockback.x += ((dx / safeDist) * force) / kRes;
        enemy.knockback.y += ((dy / safeDist) * force) / kRes;

        spawnFloatingText(ex, enemy.y, `-${dealtDamage}`, "#ff6600");
        state.damageDealt += dealtDamage;

        if (enemy.health <= 0) {
            spawnDeathParticles(enemy);
            state.drops.push({ x: ex, y: ey, value: enemy.focusReward || 30, size: 12, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, friction: 0.92, life: C.DROP_LIFE, type: "focus" });
            state.score += enemy.scoreReward;
            state.enemiesKilled++;

            const shouldSpawnHealth = Math.random();
            if (shouldSpawnHealth <= C.HEALTH_PROBABILITY) {
                state.drops.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, value: 15, size: 12, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, friction: 0.92, life: C.DROP_LIFE, type: "health" });
            }

            spawnFloatingText(ex, enemy.y, `+${enemy.scoreReward}`, "#fde61c", "score");

            if (enemy.type === "splitter1") {
                spawnEnemyPredefined(enemy.x, enemy.y, "fast");
                spawnEnemyPredefined(enemy.x - 50, enemy.y, "fast");
                spawnEnemyPredefined(enemy.x + 50, enemy.y, "fast");
            } else if (enemy.type === "splitter2") {
                spawnEnemyPredefined(enemy.x, enemy.y, "regular");
                spawnEnemyPredefined(enemy.x + 50, enemy.y, "regular");
            } else if (enemy.type === "splitter3") {
                spawnEnemyPredefined(enemy.x, enemy.y, "regular");
                spawnEnemyPredefined(enemy.x - 50, enemy.y, "fast");
                spawnEnemyPredefined(enemy.x + 50, enemy.y, "fast");
            } else if (enemy.type === "splitter4") {
                spawnEnemyPredefined(enemy.x - 50, enemy.y, "sniper");
                spawnEnemyPredefined(enemy.x + 50, enemy.y, "sniper");
            }

            state.enemies.splice(i, 1);
        }
    }
}