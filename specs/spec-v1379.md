# roughlogic.com Specification v1379 -- Safe Downgrade Descent Speed and Brake Thermal Load (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes braking distance and startable grade but not the descent problem, which is the one that kills people. On a long grade the truck's whole potential energy has to go somewhere every minute, and whether the engine brake can absorb it -- or whether the service brakes have to, and will fade -- is a horsepower comparison nobody makes on the shoulder at the top of the hill.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive weight, speed, or grade, an engine-brake rating below zero, or a grade expressed outside 0-100 percent, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the gravitational power relation P = W v sin(theta) / 550 and the engine-brake retarding-power comparison, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `safe-descent-speed` -- Safe Downgrade Descent Speed and Brake Thermal Load

```
descent power (hp) = weight x speed(ft/s) x grade / 550
balance speed      = engine brake hp x 550 / (weight x grade)
service brake load = descent power - engine brake capacity
```

Going downhill, gravity does work on the truck at a rate proportional to weight times speed times grade. That
power has to be dissipated continuously or the truck accelerates. An engine brake absorbs a fixed amount of it --
a few hundred horsepower on a modern truck, and much less on an older one or at low engine speed. Whatever is
left over goes into the service brakes as heat, and service brakes have no steady-state capacity at all: they
absorb heat, they do not reject it, so any sustained shortfall ends in fade.

The *balance speed* is the useful output: the speed at which the engine brake alone exactly holds the truck on
that grade. Below it, the truck is under control with the service brakes in reserve for emergencies. Above it,
the service brakes are carrying the difference continuously and the countdown to fade has started. This is the
arithmetic behind the old rule about descending in a lower gear than you climbed in, and it makes the rule
quantitative.

**Inputs:** gross combination weight (lb), grade (percent), descent speed (mph), engine brake / retarder rating
(hp) at the engine speed being held.

**Outputs:** descent power (hp), balance speed (mph), service-brake shortfall (hp), and a plain statement of
whether the descent is engine-brake-controlled.

## 3. Worked example

An 80,000 lb combination on a 6% grade with a 400 hp engine brake:

```
at 25 mph: power = 80,000 x 36.67 x 0.06 / 550 = 320 hp  -> engine brake covers it, 80 hp in reserve
balance speed    = 400 x 550 / (80,000 x 0.06) = 45.8 ft/s = 31.2 mph
at 45 mph: power = 80,000 x 66.0 x 0.06 / 550  = 576 hp  -> 176 hp into the service brakes, continuously
```

Twenty-five miles an hour is controlled; forty-five is not, and the difference is not gradual -- at 45 mph the
service brakes are absorbing 176 horsepower with nowhere to put it, and on a six-mile grade they will be gone
before the bottom. Note how sharply the balance speed falls with weight: at 80,000 lb it is 31 mph, and the same
truck at 105,000 lb on a permit load balances at only 23.8 mph.

## 4. Scope and non-goals

A first-order energy balance. It neglects rolling resistance and aerodynamic drag, both of which help on a
descent -- so the real balance speed is somewhat higher than computed, which is the conservative direction. It
takes engine-brake horsepower as a single number, but retarding power varies strongly with engine speed and is
far lower in a high gear than the rating implies; use the figure for the gear actually held. It does not model
brake temperature, fade onset, drum versus disc behavior, brake balance across axles, or the condition and
adjustment of the brakes, which is what actually determines whether they survive. Posted grade speeds and runaway
ramps exist because this calculation has already been done by the state; obey them. The state DOT, the vehicle
manufacturer, and the driver's judgment govern.
