# roughlogic.com Specification v1529 -- Corroded Pipe Remaining Strength (ASME B31G) (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** In-line inspection finds metal loss, and the question is always the same: can the line keep running at its pressure, or does that anomaly have to be cut out. ASME B31G answers it from three measured numbers -- depth, length, and wall -- and it is the most consequential arithmetic in pipeline integrity.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wall thickness, diameter, or defect length, a defect depth at or beyond the wall thickness, or a depth exceeding 80% of wall returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ASME B31G by name with the Folias factor and the 80% depth screening limit, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`b31g corroded pipe`, `remaining strength metal loss`, `pipeline anomaly failure pressure`, `rstreng evaluation`, `ili dig criteria pressure`.

## 2. The tile

### 2.1 `corroded-pipe-b31g` -- Corroded Pipe Remaining Strength (ASME B31G)

```
flow stress      S_flow = 1.1 x SMYS       (original B31G)
Folias factor    M = sqrt(1 + 0.8 (L^2 / (D t)))
failure pressure P_f = S_flow x (2t/D) x [1 - (2/3)(d/t)] / [1 - (2/3)(d/t)/M]
safe pressure    P_safe = P_f / SF        (SF commonly 1.39 for Class 1)
screening        depth over 80% of wall is unacceptable regardless of length
```

The equation says that a corroded area behaves like a blunt flaw whose severity depends on how deep it is
relative to the wall AND how long it is relative to the pipe's ability to bulge around it. Depth alone is not the
answer: a deep short pit can be tolerable while a shallower but very long groove is not, because the Folias
factor grows with length and drives the failure pressure down. That is the single most useful insight for
someone reading an ILI report, and it is why anomalies are ranked by predicted failure pressure rather than by
depth.

The original B31G is deliberately conservative -- it assumes a parabolic profile and a 1.1 flow stress -- and
Modified B31G and RSTRENG use a more realistic effective area and typically permit higher pressures on the same
defect. That conservatism is a feature when screening hundreds of anomalies and a cost when it condemns a joint
unnecessarily, which is why a defect that fails B31G is usually re-evaluated by RSTRENG with the detailed river-
bottom profile before anyone digs.

**Inputs:** pipe outside diameter, nominal wall thickness, specified minimum yield strength, maximum defect depth, defect axial length, the safety factor, and the MAOP

**Outputs:** the depth as a percentage of wall, the Folias bulging factor, the predicted failure pressure, the safe operating pressure, the margin against MAOP, an acceptable or repair verdict, and the maximum tolerable length at the measured depth

## 3. Worked example

A 12.75 in, 0.25 in wall X52 line with metal loss 0.105 in deep (42% of wall) over 4 in of
axial length:

```
d/t = 0.105/0.25                       = 0.420
M   = sqrt(1 + 0.8 x 4^2 / (12.75 x 0.25))  = sqrt(1 + 4.016) = 2.240
S_flow = 1.1 x 52,000                  = 57,200 psi
```

The 42% depth is well inside the 80% screening limit, and with the bulging factor at
2.24 this anomaly evaluates comfortably above the 1,468 psig Class 1 MAOP
from `pipeline-mao-barlow`.

Now stretch the same 42% deep defect to 20 in long. The Folias factor rises to
`sqrt(1 + 0.8 x 400 / (12.75 x 0.25))` = 10.07, and the predicted failure pressure falls
sharply -- same depth, same wall, and a very different answer. **Length is doing the work**, which is exactly what
a depth-only reading of an ILI report misses.

## 4. Scope and non-goals

The original B31G assessment for blunt, longitudinally oriented volumetric metal loss in the pipe body. It does
not apply to cracks, crack-like defects, seam anomalies, laminations, gouges, dents, or mechanical damage, and
applying a volumetric method to a crack is dangerous rather than merely wrong. It does not evaluate
circumferentially oriented loss, loss interacting with a dent, or loss in or near a weld. It assumes internal
pressure only and no significant axial or bending stress, which does not hold at a road crossing, on unstable
ground, or in a span. Modified B31G and RSTRENG give less conservative and usually more accurate results and are
what a real assessment uses. Corrosion growth rate, and therefore the reassessment interval, is not addressed and
is the other half of the decision. ASME B31G, 49 CFR 192 and 195 integrity management requirements, the
operator's program, and a qualified pipeline engineer govern.
