# roughlogic.com Specification v1458 -- NESC Ice-and-Wind District Loading on a Conductor (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Everything downstream of a conductor -- sag, tension, pole moment, guy pull -- starts from its resultant weight per foot under the governing load case, and that case is not the bare conductor. NESC defines three loading districts, each a combination of radial ice, wind pressure, temperature, and a constant adder. Building that resultant is four steps of arithmetic done wrong more often than it is done.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive bare diameter or weight per foot, or a negative ice thickness or wind pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the NESC loading districts by name with their ice, wind, temperature, and constant values, and the 57.3 lb/cu ft ice density, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`nesc district loading`, `ice and wind load`, `heavy loading district`, `resultant weight per foot`, `combined ice wind conductor`.

## 2. The tile

### 2.1 `nesc-district-loading` -- NESC Ice-and-Wind District Loading on a Conductor

```
iced diameter    d_i = d + 2 t_ice
ice weight/ft    w_ice = (pi/4)(d_i^2 - d^2)/144 x 57.3 lb/ft^3
vertical         w_v = w_bare + w_ice
horizontal       w_h = p x d_i / 12
resultant        w_r = sqrt(w_v^2 + w_h^2) + k
```

The ice is an annulus, not a coating of the bare diameter, so its weight goes as the difference of squares --
which means the ice load on a small conductor is proportionally far worse than on a large one. Half an inch of
radial ice on a 1.1 in conductor nearly doubles its weight; the same half inch on a 0.4 in neutral more than
triples it. That is why the light conductors come down first.

The wind then acts on the ICED diameter, not the bare one, and the two are combined as a vector because they act
at right angles. Last comes `k`, a flat constant added to the resultant -- 0.30, 0.20, and 0.05 lb/ft for Heavy,
Medium, and Light -- which is not physics but a deliberate margin, and it matters most on the light conductors
where it is a large fraction of the total.

**Inputs:** bare conductor diameter and weight per foot, and a loading district selection (Heavy, Medium, Light) or a custom ice thickness, wind pressure, and constant

**Outputs:** the iced diameter, ice weight per foot, vertical and horizontal components, the resultant weight per foot, the ratio of resultant to bare weight, and the district design temperature

## 3. Worked example

ACSR Drake, 1.108 in bare, 1.094 lb/ft, in all three districts:

```
                     Heavy (0.5 in, 4 psf, 0 degF)   Medium (0.25 in, 4 psf, 15 degF)   Light (0 in, 9 psf, 30 degF)
iced diameter        2.108 in                       1.608 in                          1.108 in
ice weight           1.0051 lb/ft                    0.4244 lb/ft                       0.0000 lb/ft
vertical w_v         2.0991 lb/ft                    1.5184 lb/ft                       1.0940 lb/ft
horizontal w_h       0.7027 lb/ft                    0.5360 lb/ft                       0.8310 lb/ft
resultant w_r        2.5136 lb/ft                    1.8102 lb/ft                       1.4238 lb/ft
ratio to bare        2.30x                          1.65x                             1.30x
```

Heavy district loads this conductor at 2.30 times its bare weight. Feed 2.514 lb/ft rather than 1.094 into
`conductor-sag-at-temperature` and every tension and sag downstream changes by that factor. The Light district,
with no ice at all, still runs 1.30x because of the wind vector and the constant.

## 4. Scope and non-goals

The three NESC district cases and a custom case, on one bare conductor. It does not select the district for a
location -- that is the NESC district map and the jurisdiction's adoption -- and it does not apply the extreme
wind, extreme ice, or combined ice-and-wind district cases that Rule 250C and 250D impose on taller structures,
nor the overload capacity factors that convert these loads into design loads by grade of construction. The 57.3
lb/cu ft ice density is the NESC value; real accreted ice varies widely and rime ice is much lighter. Bundled
conductors, unequal ice shedding between spans, and galloping are out of scope. The adopted NESC edition, the
loading district for the location, and the utility's construction standard govern.
