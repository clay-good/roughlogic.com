# roughlogic.com Specification v1910 -- Existing Roof Snow and Ice Weight Against Design Load (`calc-floodfight.js`, Group E Carpentry and Construction, storm damage, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** After a heavy snowfall the question is not the design load but the load that is on the roof now, measured with a ruler, and whether it is time to clear the roof or leave the building. Every snow tile in the catalog computes a design load from a ground snow map value; none converts measured depths of snow and ice to pounds per square foot.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative layer depth, a non-positive design load, or a snow unit weight outside 3-21 psf per foot of depth (without an explicit override) returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA P-957, *Snow Load Safety Guide* (2013), Section 2.2 (snow at about 3 psf per foot of depth for light, dry snow to 21 psf per foot for wet, heavy snow; ice about 57 psf per foot) and its warning signs, with the ASCE 7 snow density relation cited by section as an optional basis, named as the method, the building's design documents and a structural engineer named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`how much does snow on my roof weigh`, `roof snow weight psf`, `snow and ice load roof collapse`, `when to shovel roof`, `snow depth to psf`.

## 2. The tile

### 2.1 `roof-snow-ice-weight` -- Existing Roof Snow and Ice Weight Against Design Load

```
layers     load = sum of (layer depth in ft x unit weight in psf per ft)
snow       light, dry     about 3 psf per ft of depth
           settled        commonly 10-15 psf per ft
           wet, heavy     about 21 psf per ft
ice        about 57 psf per ft (a little under 5 psf per inch)
optional   ASCE 7 snow density gamma = 0.13 pg + 14 <= 30 pcf (cited by section)
ratio      measured load / roof design snow load
triggers   approaching the design load -> clear the roof by a safe method;
           at or over it, or with FEMA P-957 warning signs (sagging, new
           cracks, creaking, doors that stick) -> leave the building
```

A foot of snow can weigh three pounds a square foot or twenty-one, and the difference is water. Fresh powder is mostly
air; the same snow after rain or a thaw is mostly water; and ice is almost as heavy as water itself. FEMA P-957 gives the
range, and the tile asks for each layer separately because a roof after a long storm is usually a stack: old settled
snow at the bottom, an ice layer from a freeze-thaw, and fresh snow on top. The ice is thin and heavy -- two inches of it
weighs about as much as three feet of light, dry snow.

The comparison is with the roof's design snow load, which is not the ground snow load and is not usually known to the
owner. FEMA P-957 warns specifically against comparing the roof with the ground snow value on a map. Where the design
load is on the drawings or a building-department record, the tile compares directly; where it is not, the tile shows
the load and the reader has to find the design number, which is the right place for the difficulty to sit.

The tile reports a ratio rather than a verdict. A roof near its design load with no warning signs is a candidate for
careful clearing; a roof with sagging, new cracks, or creaking is a building to leave regardless of the arithmetic.
Clearing itself is hazardous, uneven clearing can create an unbalanced load worse than the uniform one, and the tile
names those hazards.

**Inputs:** each layer's depth and type (dry snow, settled snow, wet snow, ice, or an entered unit weight), and the roof design snow load

**Outputs:** each layer's load, the total load in psf, the ratio to the design load, and the FEMA P-957 action note

## 3. Worked example

A roof after a storm and a thaw: 18 in of wet, heavy snow over 2 in of ice, on a roof designed for 30 psf:

```
snow   1.5 ft x 21 = 31.5 psf
ice    0.167 ft x 57 = 9.5 psf
total  41.0 psf
ratio  41.0 / 30 = 1.37
```

**41 psf on a 30 psf roof -- 37% over its design snow load.** Design loads carry safety margin, so the roof may be
standing; FEMA's guidance at this point is to get the load off by a safe method, and to leave the building if any warning
sign appears.

**The same 18 in as light, dry snow:** 1.5 x 3 = 4.5 psf, plus the ice 9.5 = 14.0 psf, **under half the design load** --
which is why the ruler alone does not answer the question.

## 4. Scope and non-goals

A load estimate from measured depths and published unit weights. Actual densities vary widely and a weighed core sample governs where available. It does not compute design snow loads, drifts, sliding snow, or rain-on-snow (`snow-load`, `snow-drift-load`, `sliding-snow-load`, `rain-on-snow-surcharge`), evaluate the roof structure, or address the hazards of roof clearing, fall protection, and unbalanced removal beyond naming them. FEMA P-957, the building's design documents, and a structural engineer govern.
