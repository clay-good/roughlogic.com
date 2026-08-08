# roughlogic.com Specification v1266 -- Dynamic Hydroplaning Speed (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J), no new module or dependency. Inherits spec.md through spec-v1265.md.
>
> **The gap.** The catalog has braking/stopping-distance and rollover tiles but nothing for hydroplaning -- the
> speed at which a tire rides up on a water film and loses road contact. `grep hydroplan/aquaplan` is empty across
> all modules.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive tire pressure returns `{ error }`. Citation discipline (v19/v22): NASA TN D-2056 (Horne & Dreher) and
FAA AC 91-6A, both public-domain U.S. Government documents; `GOVERNANCE.general`. The relation is a public-domain
scaled constant -- no table.

## 2. The tile

### 2.1 `hydroplaning-speed` -- Dynamic Hydroplaning Speed

```
spin-down (rolling wheel):  Vp = 9   sqrt(P) knots = 10.35 sqrt(P) mph
spin-up   (locked wheel):   Vp = 7.7 sqrt(P) knots           (more conservative onset)
P = tire inflation pressure (psi);  1 knot = 1.1507794 mph
```

**Input:** tire inflation pressure (psi).

**Outputs:** hydroplaning speed (mph and knots, spin-down), spin-up onset (mph and knots).

## 3. Worked example

100 psi (heavy-truck / aircraft tire):

```
spin-down = 9 x sqrt(100) = 90 knots = 103.6 mph
spin-up   = 7.7 x sqrt(100) = 77 knots = 88.6 mph
```

Passenger-car check, 32 psi: 9 x sqrt(32) = 50.9 knots = 58.6 mph.

## 4. Scope and non-goals

A screening figure. It assumes standing water at least about 0.1 in deep and smooth or worn tread; deeper water or
bald tires lower it, good tread channels water and raises it. It does not model tread depth, water depth, pavement
texture, or vehicle load. A safety screen; road conditions and the driver govern.
