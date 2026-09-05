# roughlogic.com Specification v1455 -- Wood Pole Class and Groundline Moment (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A wood pole is rated by class, and the class is a statement about ONE number: the horizontal load it can take two feet from the top. What a crew actually has is a load at some other height, a groundline circumference off a tape, and a species. Turning those into a percent of capacity is section-modulus arithmetic nobody does in the field, so poles get loaded by habit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive circumference, fiber stress, or height, or a load applied at or below the groundline returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ANSI O5.1 pole classes and species fiber stresses by name, with the section-modulus relation, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pole class moment`, `groundline moment`, `wood pole capacity`, `pole bending utilization`, `pole section modulus`.

## 2. The tile

### 2.1 `pole-class-groundline-moment` -- Wood Pole Class and Groundline Moment

```
groundline diameter   d = C / pi
section modulus       S = pi d^3 / 32
moment capacity       M_cap = f_b S
applied moment        M_app = sum( P_i x h_i )
utilization           U = M_app / M_cap
```

A pole is a cantilever fixed at the groundline, and it fails in bending there. Its capacity is the designated
fiber stress of the species times the section modulus of the circle at the groundline, and because the section
modulus goes as the CUBE of diameter, small differences in circumference are large differences in strength: a
pole an inch under its class circumference has lost roughly eight percent of its capacity, not one.

The applied side is a sum of moments, not a single load. Conductor tension at the crossarm, wind on the pole
itself, wind on the conductors, and a down-guy's horizontal reaction all act at their own heights, and each
contributes its force times its height above the groundline. That is why a guy attached high is worth so much:
it subtracts a large moment at the height where the moment arm is longest. Species matters directly through
`f_b` -- Southern Pine and Douglas Fir at 8,000 psi, Western Red Cedar at 6,000 -- so the same stick in cedar is
a quarter weaker.

**Inputs:** groundline circumference, species designated fiber stress, and one or more horizontal loads with their heights above the groundline

**Outputs:** the groundline diameter, section modulus, moment capacity, total applied moment, utilization as a percent, and the remaining horizontal load available at a stated height

## 3. Worked example

A Class 3, 45 ft Southern Pine pole. Tape reads 37.5 in circumference at the groundline; designated fiber
stress 8,000 psi. A 600 lb net horizontal pull acts 38 ft above the groundline:

```
d     = 37.5 / pi              = 11.94 in
S     = pi x 11.94^3 / 32       = 167.0 in^3
M_cap = 8,000 x 167.0         = 1,335,777 in-lb = 111,315 ft-lb
M_app = 600 x 38                = 22,800 ft-lb
U     = 22,800 / 111,315      = 20.5%
```

The pole is at 20.5% of its bending capacity and has 88,515 ft-lb left -- another 2,329 lb at the same
height. Re-measure the same pole at 36.5 in circumference and the capacity drops to 102,645 ft-lb, a
7.8% loss from one inch of tape, because the cube law does not forgive.

## 4. Scope and non-goals

Bending at the groundline only, on a straight pole in sound condition. It does not check the pole above the
groundline where a crossarm or a change of section may govern, does not check buckling under a heavy vertical
load, and does not apply a strength reduction for decay, shell rot, woodpecker damage, or through-bolt holes --
all of which are the reason a field pole is not a textbook circle. NESC applies overload capacity factors and
strength factors by grade of construction and those are NOT applied here; a raw utilization below 100% is not a
compliance statement. It does not size a guy, which is `guy-wire-tension`, or an anchor, which is
`guy-anchor-holding-capacity`. ANSI O5.1, the NESC grade of construction, and the utility's pole-loading study
govern.
