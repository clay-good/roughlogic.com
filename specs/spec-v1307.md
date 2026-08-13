# roughlogic.com Specification v1307 -- Free-Fall Drop (Time, Impact Speed, Energy) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/rigging/construction), no new module or dependency. Inherits spec.md through spec-v1306.md.
>
> **The gap.** The catalog has personal fall-arrest clearance tiles but nothing for a **dropped object** -- how fast
> a tool or part hits and with how much energy after falling from a height. It is the number behind hard hats, toe
> boards, tool tethers, and drop zones (the DROPS problem). This adds the free-fall time, impact speed, and impact
> energy.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive drop height, or a negative object weight returns `{ error }`; no numeric field is ever `Infinity`.
Citation discipline (v19/v22): the free-fall relations `v = sqrt(2 g h)`, `t = sqrt(2 h / g)`, and the impact energy
`KE = W h` (standard kinematics; energy conservation), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `free-fall-drop` -- Free-Fall Drop Time, Impact Speed, and Energy

```
v = sqrt(2 g h)                        impact speed (g = 32.174 ft/s^2)
t = sqrt(2 h / g)                      time to fall the height h
KE = W h                               impact (kinetic) energy at the bottom (= m g h)
```

`h` is the drop height and `W` the object weight (optional, for the energy). Speed grows with the square root of
height, so it climbs fast at first and then slowly; the energy, though, grows in direct proportion to height. Air
resistance is neglected -- fine for a dense, compact object over the heights on a jobsite, optimistic for a light or
bluff one.

**Inputs:** drop height h (ft), object weight W (lb, optional -- for the impact energy).

**Outputs:** impact speed (ft/s and mph), time to fall (s), and impact energy (ft-lbf, when a weight is given).

## 3. Worked example

A 5 lb hand tool dropped 50 ft from a scaffold:

```
v = sqrt(2 x 32.174 x 50) = 56.7 ft/s = 38.7 mph
t = sqrt(2 x 50 / 32.174) = 1.76 s
KE = 5 x 50 = 250 ft-lbf
```

A 5 lb tool hits at 38.7 mph with 250 ft-lbf of energy after only 50 ft and 1.8 seconds -- easily fatal, and the
reason for hard hats, toe boards, tethers, and a cleared drop zone. Double the height to 100 ft and the energy
doubles to 500 ft-lbf while the speed only rises to 54.7 mph.

## 4. Scope and non-goals

The still-air free-fall speed, time, and energy from a height; air drag (which caps a real object at its terminal
velocity), the deceleration force on impact (which depends on how far the object and surface give -- see
`impact-load-factor`), a horizontal launch (`projectile-range`), and bounce are separate. A safety-planning
estimate; the competent person and the site safety plan govern.
