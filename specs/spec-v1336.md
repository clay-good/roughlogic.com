# roughlogic.com Specification v1336 -- Wedge Splitting Force and Self-Locking (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, machine elements / mechanisms), no new module or dependency. Inherits spec.md through spec-v1335.md.
>
> **The gap.** The mechanical-advantage bench now has the pulley, rope, chain hoist, toggle, and inclined plane, but
> not the WEDGE -- the last of the classic simple machines, and the one behind a splitting maul or log-splitter wedge,
> a wedge jack, a machine-leveling wedge, or a shim. No existing tile serves "wedge splitting force" or "will this
> shim self-lock."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive driving force, an included angle outside 0-90 degrees, a negative friction coefficient, or a wedge too
blunt for the friction (it jams) returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): wedge statics with dry friction and the self-locking condition (standard mechanics; Machinery's Handbook),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `wedge-force` -- Wedge Splitting Force and Self-Locking

```
b = alpha / 2                                              (half-angle per face)
MA = (cos b - mu sin b) / (sin b + mu cos b)
spreading force = driving force x MA
frictionless MA = cot b
self-locking when b < atan(mu)   (half-angle under the friction angle)
```

A driving force `P` along the centerline of a symmetric wedge of included angle `alpha` drives normal and friction
forces on the two faces; the useful spreading force is `P(cos b - mu sin b)/(sin b + mu cos b)`. Frictionless the
advantage is `cot b` -- a sharp wedge multiplies hugely -- but a wedge lives on friction: much of the drive is spent
overcoming it, and that same friction is what lets a driven wedge or shim STAY put. The wedge self-locks when the
half-angle is under the friction angle, `b < atan(mu)`. A blunt wedge (large angle) can multiply less than 1, and if
friction exceeds the geometry the wedge jams (returns an error).

**Inputs:** driving force along the wedge P (lb), included (total) wedge angle alpha (deg), friction coefficient mu.

**Outputs:** spreading (splitting/lifting) force (lb) with the actual vs frictionless advantage, and the self-locking
verdict with the half-angle and friction angle.

## 3. Worked example

`P = 100 lb`, `alpha = 30 deg` (half-angle `b = 15 deg`), `mu = 0.3`:

```
MA = (cos15 - 0.3 sin15) / (sin15 + 0.3 cos15) = (0.966 - 0.078) / (0.259 + 0.290) = 0.888 / 0.549 = 1.62
spreading = 100 x 1.62 = 162 lb
frictionless MA = cot15 = 3.73  (so friction costs more than half the ideal advantage)
self-lock: 15 deg half-angle < atan(0.3) = 16.7 deg friction angle -> YES, it holds
```

Slicker surface check: at `mu = 0.2` the friction angle drops to 11.3 degrees, below the 15-degree half-angle, so the
same wedge backs out. Frictionless check: with `mu = 0` the spreading force is `P cot 15 = 373 lb` and it never
self-locks.

## 4. Scope and non-goals

An ideal rigid wedge under uniform dry, quasi-static friction. The material's splitting resistance, impact (dynamic)
driving, and the wedge's own strength are separate; the toggle (a clamp linkage) and the inclined plane (a load
sliding along a ramp) are their own tiles. A planning aid; Machinery's Handbook and the tool maker govern.
