import * as C from './constants.js';

export const state = {
  camera: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1, min: 1, max: 2, shakeDuration: 0, shakeIntensity: 0 },
  target: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
  time: 0,

  // runtime flags
  godMode: false,
  noCooldown: false,
  endless: false,
  infiniteFocus: false,

  timeSlowed: false,
  buffActive: false,

  // runtime arrays / entities
  barrels: [],
  deathParticles: [],
  walls: [],
  bullets: [],
  enemies: [],
  wells: [],
  drops: [],
  damageTexts: [],
  enemyBullets: [],

  // player placeholder (set by player module)
  player: null,

  // UI / gameplay variables
  focusCurrency: 100,
  score: 0,
  enemiesKilled: 0,
  focusPicked: 0,
  damageDealt: 0,
  damageReceived: 0,
  rifleBulletsShot: 0,
  rocketsShot: 0,
  wellsPlaced: 0,
  orbsShot: 0,

  // timers
  nextShotTime: C.BULLET_SPAWN_COOLDOWN,
  nextEnemySpawnTime: C.ENEMY_SPAWN_COOLDOWN,
  nextFocusRegeneratonTime: C.FOCUS_REGEN_COOLDOWN,
  nextHealthRegenerationTime: C.HEALTH_REGEN_COOLDONW,
  nextRocketShootTime: C.ROCKET_SPAWN_COOLDOWN,
  nextWellSpawnTime: 0,

  enableSpawnEnemies: true,
  gameOver: false,
  gamePaused: false,
  selectedTool: 'none',

  mouse: { x: 0, y: 0, left: false, right: false }
};