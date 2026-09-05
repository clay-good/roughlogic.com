# roughlogic.com Specification v1451 -- Conductor Sag Change With Temperature (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A conductor strung at 60 degF is not the same conductor at 120 degF, and the sag it gains is not a proportion anybody can eyeball. The catalog already has `spanline-sag-tension` for a rigging highline at ONE condition. What line work needs is the move BETWEEN conditions: the change-of-state equation, a cubic, that says what tension and sag a strung conductor settles at when the temperature changes. This is the number that decides whether a line still clears the road in August.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive span, area, modulus, initial tension, or weight per foot, or an initial tension that does not admit a positive root returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the parabolic sag relation and the conductor change-of-state equation as standard overhead line engineering, `GOVERNANCE.general`.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`conductor sag temperature`, `change of state equation`, `sag tension move`, `line sag hot day`, `conductor tension temperature`.

## 2. The tile

### 2.1 `conductor-sag-at-temperature` -- Conductor Sag Change With Temperature

```
parabolic sag       S = w L^2 / (8 H)
change of state     H2^2 [ H2 - H1 + E A alpha (t2 - t1) + w1^2 L^2 E A / (24 H1^2) ] = w2^2 L^2 E A / 24
                    (solved for H2, the one positive real root)
new sag             S2 = w2 L^2 / (8 H2)
```

Two things fight each other when a conductor heats up. The metal grows -- `alpha (t2 - t1)` of free thermal
strain -- and that growth has to go somewhere. It goes into sag. But sagging lowers the tension, and lowering the
tension lets the elastic stretch `H/(EA)` relax, which pulls some length back. The change-of-state equation is the
statement that total length is conserved across the two conditions once both effects are counted, and because the
sag term carries `H^2` in its denominator the result is a cubic in `H2`. There is no closed form worth writing on a
tailboard, which is precisely why this belongs in a tile.

The direction is always the same and the magnitude is always larger than people expect. Tension falls steeply with
temperature, and because sag goes as `1/H`, a modest tension drop is a large sag increase. The same equation run
backwards handles the cold case, where the concern is not clearance but the tension climbing toward the conductor's
limit and the structure loading that comes with it.

The equation also takes a load change, not just a temperature change: enter a different `w2` and it answers the ice
case, where weight per foot climbs and sag climbs with it at the same time the metal is cold and stiff.

**Inputs:** span length, conductor area, weight per foot at the initial and final conditions, modulus of elasticity, coefficient of thermal expansion, initial tension, and the two temperatures

**Outputs:** the initial sag, the final tension, the final sag, the sag increase, and the tension change, with the initial and final horizontal tensions reported as a percent of a rated strength when one is entered

## 3. Worked example

ACSR 795 kcmil 26/7 (Drake): area 0.7264 sq in, 1.094 lb/ft bare, E 11,200,000 psi, alpha 1.06e-05/degF. A 600 ft ruling
span strung to 6,000 lb at 60 degF, checked at 120 degF:

```
initial sag  S1 = 1.094 x 600^2 / (8 x 6,000)        = 8.21 ft
E A alpha dT    = 11,200,000 x 0.7264 x 1.06e-05 x 60  = 5,174 lb
w^2 L^2 E A / 24                             = 146,056,120,627
solve the cubic  ->  H2                      = 4,380 lb
final sag    S2 = 1.094 x 600^2 / (8 x 4,380)        = 11.24 ft
```

Sixty degrees of temperature cost 1,620 lb of tension -- 27.0% -- and bought 3.03 ft of sag, taking the
conductor from 8.21 ft down to 11.24 ft. That is a 37% sag increase from a 27% tension drop, which is the
whole point: sag is inversely proportional to tension, so the sag moves far more than the tension does.

A crew that sagged this span in the spring at 8.21 ft and left 3.0 ft of clearance margin has none left on a hot
August afternoon with the line loaded.

## 4. Scope and non-goals

One ruling span, one conductor, level supports, parabolic geometry (sag under roughly a tenth of the span).
It uses a single stress-strain modulus and therefore models the conductor as elastic: it does NOT model the
initial-versus-final distinction that a real sag-tension run carries, where a new conductor's first-load curve
differs from its settled curve. Long-term creep is a separate tile, `conductor-creep-elongation`, and creep is
routinely worth as much sag as tens of degrees of temperature. ACSR's composite behaviour -- aluminium and steel
carrying different shares of the load at different temperatures, and the knee point above which the steel carries
nearly all of it -- is not modeled; above the knee this tile will read conservative on tension and optimistic on sag.
Inclined spans, uplift, and galloping are out of scope. A field and checking aid, not a sag-tension study: the
conductor manufacturer's sag-tension run, the line design, and the utility's construction standard govern, and
NESC clearance is checked with `line-ground-clearance-nesc`.
