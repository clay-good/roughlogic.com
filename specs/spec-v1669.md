# roughlogic.com Specification v1669 -- Liquid Penetrant Dwell and Development Time (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Liquid penetrant works by capillary action and capillary action takes time, so dwell is not a formality. Too short and the penetrant has not entered the discontinuity; too long and it dries in place and will not bleed back out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dwell time or temperature outside the qualified range, or a development dwell exceeding the procedure maximum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the penetrant and development dwell requirements with ASTM E1417 and SNT-TC-1A named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`penetrant dwell time`, `pt developer dwell`, `liquid penetrant temperature range`, `penetrant dried on part`, `fluorescent penetrant dwell`.

## 2. The tile

### 2.1 `penetrant-dwell-time` -- Liquid Penetrant Dwell and Development Time

```
penetration dwell  the time the penetrant remains on the surface before removal
                   typically 5 to 30 minutes depending on material, discontinuity type,
                   temperature, and penetrant sensitivity level
development dwell  the time after developer application before evaluation
                   commonly at least 10 minutes, and not more than about 60
temperature        standard methods specify a temperature range, commonly 40 to 125 degF
                   outside it, the procedure must be qualified
drying             the penetrant must not dry on the part; it will not bleed out
tight cracks       need longer dwell; service-induced cracks are tighter than casting pores
```

Dwell time is set by what is being looked for as much as by the material. A tight fatigue crack has a far
smaller opening than a casting pore, so it takes penetrant much longer to enter, and a dwell chosen from a table
row for "castings" applied to a service-cracked weldment can be too short by a factor of several. Codes and
procedures give minimum dwells by material and discontinuity type for exactly this reason.

The upper bound is real too. Penetrant that dries on the surface will not bleed back out of a discontinuity, so a
part left in the sun with penetrant on it can be uninspectable -- and the failure is silent, because the part
simply shows no indications. Keeping the part wet through the dwell is part of the procedure, not a convenience.

Development dwell is where the indication actually forms: developer draws the penetrant back out and spreads it,
which is what makes a tiny discontinuity visible. Evaluating too early misses indications that have not yet
formed; evaluating too late lets them bleed into blurred blobs whose size no longer relates to the discontinuity.
Both bounds are in the procedure, and the evaluation window between them is where the inspection happens.

Temperature bounds the whole method. Outside the standard range the penetrant's viscosity and the capillary
behaviour change enough that the procedure has to be qualified at the actual temperature.

**Inputs:** material and form, the discontinuity type sought, the penetrant type and sensitivity level, the part temperature, the penetration and development dwell times used, and the procedure minimums and maximums

**Outputs:** the minimum penetration dwell for the entered material and discontinuity type, the development dwell window, the elapsed time against each, a flag when the part temperature falls outside the qualified range, and the earliest and latest valid evaluation times

## 3. Worked example

A weld being inspected for service-induced cracking, using a solvent-removable visible penetrant at 70 degF:

```
penetration dwell, tight service cracks -- toward the long end of the range, commonly 20 to 30 min
development dwell                       -- at least 10 min, evaluate before 60 min
```

**The dwell chosen for the wrong discontinuity type is the error.** A 5 minute dwell taken from a row for
castings, applied to a tight fatigue crack, does not let the penetrant enter -- and the part shows clean. The
inspection was performed, documented, and found nothing, and the crack is still there.

The drying failure is equally silent. If the part sits in sun or wind and the penetrant dries during the 25
minute dwell, no amount of correct developing will bring it back out. Keeping the surface wet -- reapplying
penetrant during a long dwell where the procedure allows it -- is what prevents it.

The evaluation window: after developer, indications grow. Looking at 3 minutes misses indications still forming;
looking at 75 minutes finds blurred bleed-out whose size no longer relates to the discontinuity. The procedure's
window, commonly 10 to 60 minutes, is when the inspection is valid.

Temperature: at 35 degF this method is outside the standard range and the procedure must be qualified at that
temperature -- a comparator block demonstration -- before the results mean anything.

## 4. Scope and non-goals

A dwell time comparison against procedure values the user supplies. Minimum dwell times by material, form, and
discontinuity type, the development dwell window, the qualified temperature range, and the sensitivity level
required are set by the applicable code and the written procedure -- ASTM E1417, ASME Section V, and the
governing construction code as applicable -- and those govern. It does not address surface preparation, which is
critical: penetrant cannot enter a discontinuity blocked by paint, scale, blasting media, or smeared metal from
grinding, and inadequate preparation is the most common cause of a false clean result. It does not address
removal technique, which if excessive removes penetrant from the discontinuity itself, developer application, the
lighting and dark adaptation required for fluorescent methods, or the evaluation and acceptance of indications.
It applies only to surface-breaking discontinuities. Personnel qualification is governed by a written practice to
SNT-TC-1A or equivalent. The applicable code, the written procedure, and a qualified NDT technician govern.
