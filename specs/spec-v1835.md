# roughlogic.com Specification v1835 -- Local Scour Depth at a Bridge Pier (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A pier in a current digs a hole around itself, and the foundation has to reach below it. The depth grows with pier width and with flow, and it grows explosively when the pier is not aligned with the current.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pier width, flow depth, or velocity, a non-positive shape or bed factor, or an angle of attack at or beyond 90 degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the HEC-18 local pier scour relation and its correction factors with HEC-18, the state bridge scour procedures, and a hydraulic analysis of the crossing named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`bridge pier scour depth`, `hec-18 local scour`, `pier skew scour angle of attack`, `scour foundation depth bridge`, `contraction scour pier`.

## 2. The tile

### 2.1 `pier-scour-depth` -- Local Scour Depth at a Bridge Pier

```
the relation     y_s / y_1 = 2.0 K1 K2 K3 (a / y_1)^0.65 Fr_1^0.43
                 y_s the local scour depth below the ambient bed, y_1 the approach
                 flow depth, a the pier width, Fr_1 the approach Froude number
Froude           Fr = V / sqrt(g y)
K1 nose shape    1.0 round or circular, 1.1 square, 0.9 sharp
K2 angle of      the killer term: (cos theta + (L/a) sin theta)^0.65, where L is
attack           the pier length and theta the skew from the flow
K3 bed condition 1.1 plane bed and antidunes, higher for large dunes
pier width       enters to the 0.65 power, so a wider pier scours deeper
what it is not   the total scour: contraction scour and long-term degradation are
                 separate components and they ADD
the foundation   must extend below the total scour with margin, because scour
                 removes the soil that was providing the bearing and the lateral
                 support
```

Scour is the leading cause of bridge failure in the United States and the reason is that it removes support
without touching the structure. A pier that is sound, a superstructure that is sound, and a foundation that was
adequate in the soil that used to be there: the flood takes the soil away, the pier settles or tips, and the
span comes down. Nothing about the bridge degraded, and the failure frequently occurs during the flood when
nobody can see the bed.

The angle of attack term is where scour depth goes from a design number to a disaster, and it is a geometry
problem rather than a hydraulic one. A pier aligned with the flow presents its width; a pier skewed to the flow
presents a projection that includes its length, and the length of a pier is several times its width. A modest
skew therefore multiplies the effective width, and the scour follows. Channels migrate, so a pier aligned when
it was built is not necessarily aligned now.

Local scour is only one component and adding them is not optional. Contraction scour lowers the bed across the
whole opening where the bridge narrows the flow; long-term degradation lowers it across the reach over years
from changes upstream; and local scour digs the hole at the pier on top of both. A foundation designed against
local scour alone is designed against a fraction of the depth the bed will actually reach.

**Inputs:** the pier width and length, the approach flow depth and velocity, the nose shape and bed condition factors, the angle of attack, and optionally a second pier width

**Outputs:** the approach Froude number, the angle-of-attack factor, the local scour depth, the depth for a wider pier, the depth at the entered skew, and the required foundation depth below the ambient bed

## 3. Worked example

A 6 ft round-nosed pier in 15 ft of water at 8 ft/s, aligned with the flow:

```
Fr   = 8 / sqrt(32.2 x 15) = 0.3640
y_s  = 2.0 x 1.0 x 1.0 x 1.1 x 15 x (6/15)^0.65 x 0.3640^0.43
     = 11.8 ft below the ambient bed
```

**11.8 ft of hole around a 6 ft pier**, and the foundation has to reach below it with margin -- **the scour
takes away the soil that was providing both the bearing and the lateral support.**

**Widening the pier makes it worse, at the 0.65 power:**

```
a = 12 ft: y_s = 18.5 ft
```

**57 percent deeper for twice the width.** A heavier pier is not a safer one against scour.

**Now skew the same 6 ft pier 30 degrees to the flow, with a length-to-width ratio of 6:**

```
K2  = (cos 30 + 6 x sin 30)^0.65 = 2.408
y_s = 28.4 ft
```

**28.4 ft against 11.8 -- 2.4 times the aligned depth, from 30 degrees of skew.** The pier did not change
size; **it began presenting its LENGTH to the flow instead of its width**, and the length of a pier is several
times its width. **This is the term that turns a design number into a failure**, and channels migrate, so a
pier aligned when it was built is not necessarily aligned now.

**And this is only the local component.** Contraction scour across the bridge opening and long-term degradation
of the reach **add to it**. A foundation designed against 11.8 ft of local scour alone is designed against a
fraction of the depth the bed will actually reach in a design flood.

## 4. Scope and non-goals

A screening calculation from one empirical relation. Scour evaluation follows HEC-18 and the state's own bridge scour procedures, which require a hydraulic analysis of the crossing at the design and check floods, separate computation of long-term degradation, contraction scour, and local scour at both piers and abutments, and their summation. The relation here is for live-bed scour at a simple pier in cohesionless material; clear-water scour, cohesive and erodible rock beds, complex pier geometries with footings and pile groups exposed in the flow, and debris accumulation -- which effectively widens a pier and is a common cause of scour far exceeding prediction -- all follow different treatments. It does not compute the hydraulics: approach depth and velocity at the pier come from a hydraulic model of the crossing, not from the channel average. It does not design the foundation, evaluate the structure's capacity in the scoured condition, or address countermeasures such as riprap (`riprap-d50`), collars, or articulated mats and their own design and monitoring requirements. It does not address the scour monitoring and plan of action that a scour-critical bridge requires. HEC-18 and the state department of transportation's bridge scour procedures, a hydraulic analysis of the crossing, and a licensed bridge and hydraulic engineer govern.
