Project Singularity — ~4 Minute Pitch Script

Speakers: Naman and Priyansh

Stage directions are in italics — don't read those aloud.

[0:00–0:45] NAMAN — The Hook & Core Game Systems

Say this slowly, confidently, and set the stage.

"What if the arena itself could turn against you — not with more enemies, but with gravity?

That's Project Singularity: a top-down, endless arena shooter built on HTML5 Canvas where you're not just shooting things, you're bending physics to survive. Every fight is really a small physics puzzle in disguise.

Rather than traditional set waves, the game runs on a continuous, endless survival loop. Enemies continuously stream in out of sight — weighted across regular runners, tanky heavies, splitters, snipers, and kamikaze explosives — scaling in density up to a hard cap of 24 active units.

Survival comes down to managing space, passive regeneration, and a dynamic pickup ecosystem: defeated enemies drop purple Focus diamonds for high-tier abilities, while red health hearts drop at a 15% rate and magnetize toward you when you get close.

When you eventually go down, a comprehensive end-game overlay tallies your total score, focus collected, damage metrics, and combat stats down to every bullet, rocket, and placed structure."

Hand off to Priyansh here — quick glance or gesture.

[0:45–2:00] PRIYANSH — Gameplay & Weapons

"Thanks, Naman. So here's how it actually plays:

Enemies spawn with genuinely distinct behaviours — fast ones that swarm, heavy ones that tank hits, snipers that lock on with a red laser telegraph before firing, and splitters that break apart into smaller runners upon death.

To fight back, you have four distinct weapons and tools on hotkeys, each serving a different tactical role and costing specific amounts of Focus:

The Rifle: A fast 1-Focus single-target weapon for sustained damage and light knockback.
The Rocket Launcher: Costs 8 Focus, dealing 140 splash damage across a 220-unit explosion radius with screen shake.
The Gravitational Orb: Costs 35 Focus. It moves slowly across the map, pulling nearby enemies into its centre before exploding for massive area damage.
The Gravity Well: Costs 80 Focus. A stationary trap placed directly on floor tiles to group swarms and lock down entire zones.

There's a full risk-reward economy underneath it all. Focus gates your access to stronger weapons, so you're constantly deciding: do I spend what I have now on cheap rifle shots, or hold off and save up for an orb or gravity well to wipe out an entire cluster at once?"

Hand off to Naman here.

[2:00–3:15] NAMAN — Playtesting, Design, Mechanics & Tech

Say this with pride — you earned it.

"A lot of that balance — how fast enemies swarm, how strong each weapon feels, even how enemy types interact — came out of constant playtesting between the two of us. We'd run it, catch what felt unfair or slow, and tune it.

That extended to the visual feedback system too: dynamic floating text showing damage numbers and score rewards, hit flashes, particle debris, screen shake, and an integrated minimap that tracks terrain, enemies, and barrels in real time.

We also populated the arena with interactive environment objects like explosive barrels. You can shoot or detonate them with rockets to trigger massive 300-unit chain explosions that clear out nearby swarms.

Underneath all of this, the entire game is built in pure vanilla JavaScript and HTML5 Canvas — zero game engines, zero external frameworks, and no libraries.

Every line of collision detection, camera shake, particle physics, spatial gravity pulling, and enemy AI was written entirely from scratch in three days. The codebase is cleanly split into decoupled modules — state, physics, enemies, weapons, and rendering — making it modular and ready to expand."

[3:15–4:00] NAMAN — The Close

Take this solo — confident, steady, finish strong.

"So that's Project Singularity: a physics-driven, endless survival shooter built entirely from scratch in three days, and refined through real playtesting until it actually felt good to play, not just functional.

We'd love for you to try pulling an enemy into a gravity well yourselves — it's a lot more fun to feel than to hear about.

Thank you."

Delivery & Pitch Notes

Pace: Aim for 130–150 words per minute.

Roles
Naman: Hook, endless mode mechanics, technical engine design, secondary interactive mechanics (barrels, HUD, particle/minimap systems), and the closing summary.
Priyansh: Combat loop, enemy AI types, and weapon/economy breakdown.
Eye Contact

Keep your eyes on the judges, making eye contact with each other only during the two quick handoff moments.

If interrupted or the demo lags

Continue speaking smoothly. You both know the physics rules and weapon specs well enough to explain them verbally without relying on the screen.