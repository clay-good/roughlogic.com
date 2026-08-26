# roughlogic.com Specification v1381 -- Oversize and Overweight Permit Threshold Screen (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Whether a load needs a permit is decided by four independent comparisons -- width, height, length, and weight -- against limits that are partly federal and mostly state. The catalog has the bridge formula and a gross combination weight check but nothing that screens the dimensional side, which is what actually triggers most permits and escorts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive dimension or weight, or a threshold at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the federal dimensional and weight limits on the National Network (23 CFR 658, 23 USC 127) and the state limits that govern elsewhere, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `oversize-permit-screen` -- Oversize and Overweight Permit Threshold Screen

```
for each of width, height, length, weight:
    excess = actual - threshold
    over   = excess > 0
permit required when any dimension is over
escorts / signage triggered by the state's own excess bands
```

Four comparisons, run against the limits for the specific route. Width is the one federal number that holds
almost everywhere -- 8 ft 6 in (102 in) on the National Network and on most state systems. Height is entirely
state law and runs from 13 ft 6 in to 14 ft 6 in depending on where you are. Length is regulated by trailer
rather than by combination on the National Network, with no federal overall limit, but states impose their own
off-network. Gross weight is 80,000 lb federally on the Interstate system, subject to the axle and bridge-formula
limits the catalog already computes.

Reporting the *excess* rather than just pass or fail is the point. Permit fee schedules, escort requirements,
travel-time restrictions, and route surveys all key off how far over you are, in bands, and a load that is two
inches over is a different conversation from one that is four feet over.

**Inputs:** load width, height, and overall length, gross weight, and the four thresholds for the governing
route.

**Outputs:** excess on each of the four, which are over, and a plain statement of whether a permit is required
and on which dimensions.

## 3. Worked example

A load measuring 12 ft 0 in wide, 14 ft 6 in high, 75 ft overall, 90,000 lb gross, screened against a route with
an 8 ft 6 in width limit, a 14 ft 0 in height limit, a 75 ft length limit, and an 80,000 lb weight limit:

```
width  : 12.0  - 8.5    = +3.5 ft   OVER
height : 14.5  - 14.0   = +0.5 ft   OVER
length : 75    - 75     =  0        at the limit, not over
weight : 90,000 - 80,000 = +10,000 lb OVER
```

Three of the four are over, so this is a permitted move on width, height, and weight -- three separate permit
questions, potentially three separate fee bases, and at 3.5 ft over width most states will require escorts and
restrict travel to daylight hours on weekdays. The half foot of height is the sleeper: it is small enough to
overlook and it is the dimension that hits a bridge.

## 4. Scope and non-goals

A screen against thresholds the user supplies, not a permit application and not a route survey. Limits are
route-specific and change: the National Network, state highway systems, and local roads all carry different
numbers, and a route legal end to end on the Interstate can be illegal for the last two miles. The tile does not
determine escort requirements, curfews, seasonal restrictions, bridge postings, or overhead clearances along the
actual route -- clearance is measured, not calculated, and a permit is not a guarantee that anything fits. It does
not compute permit fees. The state permit office and the routing on the issued permit govern.
