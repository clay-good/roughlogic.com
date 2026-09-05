# roughlogic.com Specification v1655 -- Escalator Step Chain Tension and Drive Power (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An escalator step chain drags the whole loaded step band up the incline, and its tension is the sum of the load component along the slope and the friction. It is what sizes the drive and what a worn chain is being asked to carry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, incline angle, or chain speed, or a friction coefficient below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the incline force resolution with ASME A17.1 named as governing brake and safety device requirements, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`escalator step chain tension`, `escalator drive power`, `moving walk chain force`, `escalator brake stopping load`, `step band load incline`.

## 2. The tile

### 2.1 `step-chain-tension` -- Escalator Step Chain Tension and Drive Power

```
load along the incline  F = W_total x sin(theta)
friction                F = W_total x cos(theta) x mu, with mu the roller and track friction
chain tension           the sum, divided between the chains
drive power             P = total tension x chain speed
passenger load          the design load per step, times the steps on the incline
chain elongation        wear elongation is checked as on any roller chain
                        (`roller-chain-wear-elongation`)
brake                   must hold and stop the loaded descending band, which is the worse case
```

The two force components behave differently with the incline. The gravity component grows with the sine of the
angle and dominates on a standard 30 degree escalator; friction grows with the cosine and matters more on a
shallow moving walk. So an escalator's chain tension is mostly holding the load up the slope, and a moving walk's
is mostly overcoming rolling resistance -- which is why their drives are sized so differently for the same
capacity.

The governing case is not the one people picture. A fully loaded escalator running UP is the highest power draw,
but a fully loaded escalator running DOWN is the one that sizes the brake, because the load is driving the machine
and the brake has to stop it within a defined distance without throwing passengers. That is a stopping-distance
requirement rather than a holding one, and it is why escalator brakes are tested with load.

Chain condition ties back to ordinary roller chain practice. A step chain elongates with wear like any other, and
elongation changes how the chain engages the sprockets and the step alignment at the comb plates -- which is where
a worn chain shows itself before it fails.

**Inputs:** the step band weight, the design passenger load per step and the number of loaded steps, the incline angle, the roller friction coefficient, the chain speed, and the number of chains

**Outputs:** the gravity and friction components of the chain force, the total tension and the tension per chain, the drive power at the entered speed, the power and brake demand in the descending loaded case, and the tension at an alternative incline

## 3. Worked example

An escalator at 30 degrees carrying a total moving load of 12,000 lb (step band plus passengers), roller
friction 0.03, running at 100 fpm on 2 chains:

```
gravity component  = 12,000 x sin(30) = 6,000 lb
friction component = 12,000 x cos(30) x 0.03 = 312 lb
total tension      = 6,312 lb
per chain          = 3,156 lb
drive power        = 6,312 x 100 / 33,000 = 19.1 hp
```

**Gravity is 95% of the load** at 30 degrees -- the escalator is
essentially a hoist, and friction is a rounding error.

Now a moving walk at 6 degrees with the same load:

```
gravity  = 12,000 x sin(6)  = 1,254 lb
friction = 12,000 x cos(6) x 0.03 = 358 lb
```

The two are now comparable, and the drive is a much smaller machine.

The descending case: with the same 12,000 lb running down, gravity is driving and the brake has to absorb
6,000 lb of force and bring the band to rest within the code's stopping distance --
which is what sizes the brake and why it is tested loaded.

## 4. Scope and non-goals

A statics and power calculation. It does not size an escalator drive, chain, or brake: chain selection includes
fatigue and articulation life at the sprocket, the drive includes starting and inertial loads, and the brake must
meet a stopping-distance requirement under defined load conditions that ASME A17.1 sets. It does not address the
step band, step rollers, tracks, comb plates, handrail drive, or the many safety devices an escalator carries --
step upthrust, missing step, handrail speed, comb impact, and skirt obstruction devices among them. It does not
address the passenger load actually used for design, which is a code value per step rather than an observed one.
Escalators injure people regularly and the safety devices are what prevent it: ASME A17.1 and A17.2, the
equipment manufacturer, the elevator authority having jurisdiction, and a licensed mechanic govern.
