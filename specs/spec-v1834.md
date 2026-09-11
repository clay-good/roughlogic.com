# roughlogic.com Specification v1834 -- Mooring Line Load from Wind and Current (`calc-marine.js`, Group K Mechanic - Auto, Marine, Aviation, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group K Mechanic - Auto, Marine, Aviation, hub `/groups/mechanic/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A moored vessel is held against wind on its topsides and current on its hull, and the current usually wins despite acting on far less area -- water is eight hundred times denser than air. Lines then share the load by stiffness rather than equally.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, drag coefficient, wind or current speed, line count, or safety factor, or a line angle at or beyond 90 degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the wind and current drag relations and their published coefficients with the applicable mooring design guidance and a full mooring analysis named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mooring line load wind current`, `vessel mooring force calculation`, `current drag on hull moored`, `mooring line safety factor mbl`, `wind area moored vessel`.

## 2. The tile

### 2.1 `mooring-load-wind-current` -- Mooring Line Load from Wind and Current

```
wind force       F = 0.00256 x Cd x A x V^2, with A the projected area above
                 water in sq ft and V in mph; Cd near 1.0 broadside
current force    F = 0.5 x rho x Cd x A x V^2, with rho 1.99 slugs/cu ft for sea
                 water, A the submerged lateral area, and V in ft/s
                 (1 knot = 1.688 ft/s)
the density      water is roughly 800 times denser than air, so a modest current
ratio            on a modest area beats a strong wind on a large one
total            wind + current, in the same direction for the design case
per line         total / (line count x cos of the line's horizontal angle) IF the
                 lines shared equally
they do not      load distributes by each line's stiffness, length, and geometry;
                 the shortest, stiffest line takes the most
safety factor    the required minimum breaking load is the line load times the
                 applicable factor, commonly 2 or more on synthetic line
```

Wind is what everyone thinks about and current is what usually governs. A vessel's topsides present a large
area to the air and the numbers look impressive, but air is thin; the submerged hull presents less area to a
much denser fluid moving more slowly, and the product comes out larger. On a river berth or a tidal one the
current term dominates the mooring design, and a mooring analysis that considers only wind is missing the
larger load.

Equal sharing is an assumption that a real mooring arrangement does not honour, and the error is always in the
unsafe direction. Lines of different lengths, materials, and angles have different stiffnesses, so as the
vessel moves the short stiff line picks up load fastest and reaches its limit first. The failure is then
progressive -- the most loaded line parts, its load redistributes to the others, and the next one parts -- which
is why mooring failures tend to be sudden and complete rather than gradual.

Angle costs capacity twice and both costs are easy to miss. A line leading off the perpendicular contributes
only its cosine to resisting the load, so a badly angled line is doing less than its rating suggests; and a
line with significant vertical angle, from a large tidal range or a high freeboard, is partly pulling the
vessel down or up rather than holding it in. Mooring layouts are drawn in plan and the vertical angle is where
they fail.

**Inputs:** the projected wind area and drag coefficient, the wind speed, the submerged lateral area and drag coefficient, the current speed, the number of lines and their horizontal angle, the line load share assumption, and the safety factor

**Outputs:** the wind force, the current force, the ratio between them, the total load, the load per line on an equal-sharing assumption, the load on the most-loaded line at an entered share, and the minimum breaking load required

## 3. Worked example

A vessel with 12,000 sq ft of topsides in a 50 mph wind, and 3,000 sq ft of submerged lateral area in a
3 knot current:

```
wind    = 0.00256 x 1.0 x 12,000 x 50^2 = 76,800 lb
current = 0.5 x 1.99 x 1.2 x 3,000 x 5.06^2 = 91,836 lb
total   = 168,636 lb
```

**The current exceeds the wind by 20 percent, on 75 percent less area and at a speed of 5.1 ft/s against
73 ft/s.** Water is roughly 800 times denser than air, and that ratio swamps everything else. **A mooring
analysis that considers only wind has missed the larger load entirely**, which on a river or tidal berth is the
usual case.

**Divided over 6 lines at 30 degrees off the perpendicular:**

```
per line = 168,636 / (6 x cos 30) = 32,454 lb
required MBL at a factor of 2 = 64,908 lb
```

**That assumes the lines share equally, and they do not.** Load distributes by stiffness, length, and geometry,
so the shortest and stiffest line takes the most. If one line carries 70% of the total rather than its
17% share:

```
168,636 x 0.70 / cos 30 = 136,307 lb -- 4.2 times the equal-share figure
```

**and 4.2 times the breaking load the equal-share calculation called for.** That is how a mooring fails:
the most loaded line parts, its load redistributes to the rest, and **the failure is progressive and fast
rather than gradual.**

**Angle costs twice.** Each line contributes only its cosine to holding the vessel, so the 30 degree lead has
already cost 13 percent. **And a line with significant VERTICAL angle** -- from tidal range or high
freeboard -- **is partly pulling the vessel down rather than holding it in.** Mooring layouts are drawn in plan,
and the vertical angle is where they are lost.

## 4. Scope and non-goals

A screening calculation. Real mooring analysis follows published guidance -- OCIMF for tankers, PIANC and the relevant national standards for other vessels -- which supply wind and current force coefficients as functions of the vessel's form, its loading condition, the angle of attack, and the water depth to draft ratio, and which use them at a full range of directions rather than the single beam-on case here. Under-keel clearance substantially increases current forces and is not in this relation. It does not compute load distribution among the lines, which requires a stiffness analysis of the whole mooring arrangement including line material, length, pretension, fender compression, and vessel motion, and which is the only way to find the most loaded line. It does not address dynamic effects: gusting, passing vessel effects, waves, seiche, and surge all load a mooring dynamically and can exceed the static case substantially. It does not size bollards, bitts, quick release hooks, or their attachment to the structure, which frequently governs, or address line material, age, and the reduction in breaking strength from splices, bends, and wear. It takes no position on safe mooring practice or on the snap-back hazard, which is a life-safety matter. The applicable mooring design guidance, a full mooring analysis for any permanent arrangement, the equipment manufacturers' ratings, and the marine engineer govern.
