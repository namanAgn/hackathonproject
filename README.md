# hackathonproject

# Project Singularity

A top-down, grid-based arena shooter built with vanilla JavaScript and HTML5 Canvas — no frameworks, no build tools, no dependencies. Just raw code, from scratch, in three days, for CreateX Hackathon 2026 by Saupins School Mohali.

## Overview

You're dropped into a hazard-tiled arena and swarmed by waves of enemies with distinct AI behaviors. Survive, rack up score, and manage a resource economy (Focus) that gates your access to increasingly powerful weapons.

## Core Features

**Weapons**
- **Kinetic Rifle** — fast, cheap, hitscan-style projectile for sustained damage
- **Rocket Launcher** — slow-arming explosive projectile with splash damage and knockback
- **Gravity Orb** — a charge-up projectile that pulls nearby enemies in before detonating in a radial burst
- **Gravity Well** — a placeable structure that warps space around it, dragging enemies toward a central point

**Enemies**
Multiple distinct AI archetypes, each with different stats and behavior:
- Regular, Fast, and Heavy grunts with unique speed/health/knockback tradeoffs
- Splitter enemies that fracture into smaller enemies on death
- Explosive enemies that detonate on death
- Sniper enemies with a telegraphed aim-and-fire attack pattern

**Systems**
- Real-time camera with smoothed follow, zoom, and screen shake on impact
- A destructible barrel/hazard system tied into the explosion engine
- A drop/economy loop: enemies drop Focus (currency) and occasional health pickups, with magnetized pickup radius
- Full HUD: health, focus, live score, kill/shot stats, and a minimap
- Death particle effects, floating damage numbers, and a game-over stats summary screen

## Tech Stack

- **Vanilla JavaScript (ES Modules)** — no framework, no bundler
- **HTML5 Canvas** for all rendering (world, UI overlays, minimap)
- **CSS** for the HUD panels and toolbar

Code is split into clean, single-responsibility modules: `state.js` (single source of truth), `constants.js` (all tunable config), `player.js`, `enemies.js`, `bullets.js`, `explosions.js`, `map.js`, and `utils.js` (coordinate transforms and shared drawing helpers).

## Controls

| Key | Action |
|---|---|
| `W A S D` | Move |
| `Mouse` | Aim |
| `Left Click` | Fire selected weapon |
| `1 / 2 / 3 / 4` | Select Rifle / Rocket / Orb / Well |
| `Space` | Pause |
| `R` | Restart (after game over) |

## Running It

Open `main.html` in a browser (served locally, since it uses ES Modules — a simple local server like `npx serve` or the VS Code Live Server extension works).

## Credits

- **Code, architecture, and systems design:** Naman Agnihotry (Repository Owner)
- **Playtesting, gameplay feedback, and visual/design direction:** Priyansh Vig (Teammate)