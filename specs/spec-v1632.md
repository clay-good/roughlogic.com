# roughlogic.com Specification v1632 -- Grille Neck Velocity and NC Level (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A diffuser that is too small for its airflow is the most common noise complaint in a building, and the cause is neck velocity. Manufacturers publish an NC rating at each flow, and the relationship is steep enough that one size up usually fixes a complaint entirely.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow or neck area, or an NC target at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the neck velocity relation and the manufacturer NC ratings with the project acoustical criteria named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`diffuser neck velocity noise`, `grille nc rating`, `diffuser too small noise`, `hvac noise complaint diffuser`, `balancing damper whistle`.

## 2. The tile

### 2.1 `grille-neck-nc` -- Grille Neck Velocity and NC Level

```
neck velocity     V = CFM / neck free area
NC rating         from the manufacturer's table at that size and flow, in a reference room
sensitivity       sound power rises roughly with the 5th to 6th power of velocity, so NC
                  climbs about 12 to 15 points for a doubling of velocity
room correction   the published NC assumes a room absorption; a hard room reads higher
targets           private office NC 30, open office NC 35 to 40, classroom NC 25 to 30
                  conference NC 25 to 30, mechanical space NC 45 and up
balancing damper  a damper at the neck is a major noise source; damper at the branch instead
```

The fifth-power relationship is what makes this fixable. Because sound power rises so steeply with velocity,
going one nominal size up on a diffuser -- which might drop neck velocity 30 percent -- can drop the NC rating by
six or eight points, which is the difference between a complaint and silence. Very few HVAC problems respond that
strongly to such a small change.

The damper location is the other half and it is where most retrofit noise actually comes from. A balancing damper
immediately behind a diffuser generates turbulence right at the outlet with nothing between it and the room, and
throttling it hard to balance a branch turns the diffuser into a whistle. Moving the balancing to the branch
takeoff, several feet upstream with a flexible connection and the diffuser's own equalizing grid in between,
removes the noise without changing the airflow.

The published NC also assumes a room, and it is a fairly absorptive one. A diffuser rated NC 28 in a carpeted
office with a lay-in ceiling will read several points higher in a hard-surfaced room with a gypsum ceiling, which
is why the same selection can be quiet in one space and audible in another.

**Inputs:** airflow, neck size and free area, the manufacturer NC rating at that flow, the room NC target, the room absorption relative to the rating basis, and the balancing damper location

**Outputs:** the neck velocity, the manufacturer NC at that flow, the NC against the room target, the neck velocity and NC at the next size up, the airflow the current size supports at the target NC, and a flag when a neck-mounted balancing damper is present

## 3. Worked example

A diffuser passing 600 cfm through a neck with 1 sq ft of free area:

```
neck velocity = 600 / 1 = 600 fpm
```

600 fpm. Manufacturer tables put a diffuser at this velocity somewhere around NC 32 to 36 depending on the
model -- above an NC 30 private office target.

**One size up**, to 1.4 sq ft of neck:

```
velocity = 600 / 1.4 = 429 fpm
```

A 29% velocity reduction, and at a fifth-power relationship that is roughly

```
10 log10( (429/600)^5 ) = -7.3 dB
```

about 7 dB quieter -- comfortably into the NC 30 target from a change that
costs the price difference between two diffusers.

The damper: if this outlet has a balancing damper at the neck throttled to 40 percent, it is generating more
noise than the diffuser is, and no diffuser selection fixes it. Moving the balancing to the branch takeoff and
opening the neck damper fully is the first thing to try on a noise complaint, before anything is replaced.

## 4. Scope and non-goals

A velocity calculation and a sensitivity estimate around manufacturer NC data the user supplies. Published NC
ratings are laboratory values in a reference room with a stated absorption and a stated approach condition; real
performance depends on the room, on the inlet condition to the diffuser (a flex duct entering off-axis or
kinked generates far more noise than the rating assumes), and on any damper upstream. The fifth-power
relationship is an approximation used for sensitivity, not a substitute for the manufacturer's table at the new
size. It does not address duct-borne noise from the fan or the terminal unit, breakout noise
(`duct-breakout-noise`), or cross-talk between spaces through the ductwork, all of which produce complaints that
a diffuser change will not fix. It does not evaluate room acoustics or background noise criteria. The diffuser
manufacturer's tested data, the acoustical criteria in the project specification, and the design engineer
govern.
