// constants.js
export const GRID_SIZE = 96;

export const TILE = {
  FLOOR: 0,
  WALL: 1,
  BARREL: 2,
  BARREL_DESTROYED: 3,
  CRATE: 4
};

export const ENEMY_SPAWN_COOLDOWN = 0.5;
export const HEALTH_PROBABILITY = 0.1;

export const BG_COLOR = "#1a1a1a";
export const GRID_COLOR = "#232323";

export const ROCKET_COST = 10;
export const ROCKET_SPAWN_COOLDOWN = 4;

export const BULLET_COLOR = "#fdfd60";
export const BULLET_W = 12;
export const BULLET_H = 5;
export const BULLET_SPAWN_COOLDOWN = 0.08;
export const WELL_SPAWN_COOLDOWN = 2;

export const BARREL_R = GRID_SIZE / 4;
export const BARREL_EXPLOSION_R = 300;
export const BARREL_DAMAGE = 100;
export const BARREL_HEALTH = 75;
export const BARREL_RESPAWN_TIME = 1800;

export const FOCUS_REGEN_COOLDOWN = 2;
export const HEALTH_REGEN_COOLDONW = 2;

export const RIFLE_COST = 2;
export const ORB_COST = 45;
export const WELL_COST = 100;
export const WALL_COST = 30;

export const MAX_HEALTH = 200;
export const MAX_FOCUS = 200;

export const DROP_LIFE = 900;

export const MAP_BORDER_THICKNESS = 6;

export const HAZARD_YELLOW = "#d4a017";
export const HAZARD_DARK = "#1a1a1a";
export const BORDER_WALL_BASE = "#2b2b2e";
export const IMPASSABLE_ACCENT = "rgba(255, 176, 32, 0.5)";

export const FLOOR_LIGHT = "#c6c6c6";
export const FLOOR_DARK = "#a3a3a3";
export const FLOOR_HILIGHT = "rgba(255,255,255,0.15)";
export const FLOOR_SHADOW = "rgba(0,0,0,0.10)";

export const GHOST_COLOR = "#3b8dd47c";
export const WELL_RADIUS = 150;
export const WELL_CORE_COLOR = "#050208";
export const WELL_GLOW_COLOR = "#3b0764";
export const WELL_RING_COLOR = "#a855f7";
export const WELL_SWELL_THRESHOLD = 0.3;

export const ORB_CORE_COLOR = "#0d0614";
export const ORB_GLOW_INNER = "#c084fc";
export const ORB_GLOW_OUTER = "#7c3aed";
export const ORB_RING_COLOR = "#d8b4fe";
export const ORB_CHARGE_THRESHOLD = 0.25;

export const BULLET_CONFIGS = {
  rifle: { speed: 18, damage: 20, w: 12, h: 5, life: 120 },
  orb: { speed: 2, damage: 75, w: 60, h: 60, life: 480 },
  rocket: { speed: 8, damage: 140, w: 24, h: 12, life: 180, explosionRadius: 220, explosionDamage: 140, explosionForce: 30 }
};

export const ENEMY_CONFIGS = {
  regular: { health: 100, speed: 3, damage: 15, w: GRID_SIZE * 0.75, h: GRID_SIZE * 0.75, color: "#db5757", attackCooldown: 1, focusReward: 30, scoreReward: 15, gravityResistance: 1, knockbackResistance: 1 },
  fast: { health: 65, speed: 6, damage: 10, w: GRID_SIZE * 0.5, h: GRID_SIZE * 0.5, color: "#57a0db", attackCooldown: 0.5, focusReward: 20, scoreReward: 10, gravityResistance: 0.4, knockbackResistance: 0.3 },
  heavy: { health: 200, speed: 2, damage: 50, w: GRID_SIZE * 1, h: GRID_SIZE * 1, color: "#555555", attackCooldown: 2, focusReward: 50, scoreReward: 20, gravityResistance: 2.5, knockbackResistance: 3 },
  splitter1: { health: 100, speed: 4, damage: 20, w: GRID_SIZE * 0.65, h: GRID_SIZE * 0.65, color: "#efde21", attackCooldown: 0.8, focusReward: 30, scoreReward: 20, gravityResistance: 0.9, knockbackResistance: 0.8 },
  splitter2: { health: 170, speed: 3, damage: 35, w: GRID_SIZE * 0.8, h: GRID_SIZE * 0.8, color: "#6a1f1f", attackCooldown: 1, focusReward: 40, scoreReward: 25, gravityResistance: 1.5, knockbackResistance: 1.4 },
  splitter3: { health: 150, speed: 3, damage: 45, w: GRID_SIZE * 0.95, h: GRID_SIZE * 0.95, color: "#51dddd", attackCooldown: 1.5, focusReward: 60, scoreReward: 40, gravityResistance: 2.2, knockbackResistance: 2 },
  explosive: { health: 100, speed: 5, damage: 10, w: GRID_SIZE * 0.5, h: GRID_SIZE * 0.5, color: "#2a2a2a", attackCooldown: 0.5, explosiveRadius: 200, explosiveDamage: 60, focusReward: 30, scoreReward: 20, gravityResistance: 0.8, knockbackResistance: 0.6 }
};
