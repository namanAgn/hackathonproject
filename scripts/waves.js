// Edit this list to tune Wave Mode. Each object is one wave; enemy names must
// match a key in ENEMY_CONFIGS. `spawnInterval` and `breakDuration` are seconds.
// Developer shortcut: set this to the one-based wave number you want to test.
export const DEV_START_WAVE = 1;
export const WAVES = [
    { enemies: { regular: 6, fast: 2 }, spawnInterval: 0.55, breakDuration: 4 },
    { enemies: { regular: 8, fast: 4, heavy: 1 }, spawnInterval: 0.5, breakDuration: 5 },
    { enemies: { fast: 7, sniper: 2, explosive: 3 }, spawnInterval: 0.45, breakDuration: 5 },
    { enemies: { regular: 10, heavy: 3, sniper: 3, splitter1: 4 }, spawnInterval: 0.4, breakDuration: 6 },
    { enemies: { regular: 20 }, spawnInterval: 0.5, breakDuration: 5 },
    { enemies: { fast: 40 }, spawnInterval: 0.5, breakDuration: 5 },
    { enemies: { heavy: 20 }, spawnInterval: 0.4, breakDuration: 6 },
    { enemies: { explosive: 10 }, spawnInterval: 0.4, breakDuration: 6 },
    { enemies: { sniper: 10 }, spawnInterval: 0.4, breakDuration: 6 },
    { enemies: { splitter3: 10 }, spawnInterval: 0.4, breakDuration: 6 },
    { enemies: { splitter1: 50 }, spawnInterval: 0.4, breakDuration: 6 }
];

import { state } from './state.js';
import { spawnEnemyOfType } from './enemies.js';

function queueForWave(wave) {
    return Object.entries(wave.enemies).flatMap(([type, count]) =>
        Array.from({ length: count }, () => type)
    );
}

export function startWaveMode() {
    state.wave = {
        number: Math.min(Math.max(DEV_START_WAVE - 1, 0), WAVES.length - 1),
        queue: [],
        nextSpawnTime: state.time,
        nextWaveTime: state.time,
        waitingForNextWave: true,
        complete: false
    };
}

// Returns event text for the UI, or null while the current wave is in progress.
export function updateWaves() {
    const waveState = state.wave;
    if (!waveState || waveState.complete) return null;

    if (waveState.waitingForNextWave && state.time >= waveState.nextWaveTime) {
        const wave = WAVES[waveState.number];
        if (!wave) {
            waveState.complete = true;
            return "All waves complete!";
        }
        waveState.number++;
        waveState.queue = queueForWave(wave);
        waveState.waitingForNextWave = false;
        waveState.nextSpawnTime = state.time;
        return `Wave ${waveState.number}`;
    }

    const currentWave = WAVES[waveState.number - 1];
    if (waveState.queue.length && state.time >= waveState.nextSpawnTime) {
        spawnEnemyOfType(waveState.queue.shift());
        waveState.nextSpawnTime = state.time + currentWave.spawnInterval;
    }

    if (!waveState.waitingForNextWave && !waveState.queue.length && !state.enemies.length) {
        waveState.waitingForNextWave = true;
        waveState.nextWaveTime = state.time + currentWave.breakDuration;
        return `Wave ${waveState.number} cleared`;
    }

    return null;
}