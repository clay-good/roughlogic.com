# roughlogic.com Specification v1378 -- Kingpin-to-Rear-Axle Compliance and Tandem Slide (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog slides tandems for axle weight but never checks the other reason tandems get slid: the kingpin-to-rear-axle length limit that several states impose, most famously California's 40 ft. A trailer legal on weight can be illegal on KPRA, and the fix moves the axle weights, so the two checks have to be run together.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive trailer length or KPRA measurement, a negative slide travel, or a hole spacing of zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the state kingpin-to-rear-axle (KPRA) length limits, cited by state and linked to the state's own published limit, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `kingpin-to-axle` -- Kingpin-to-Rear-Axle Compliance and Tandem Slide

```
KPRA          = distance from kingpin to the center of the rear axle group
excess        = KPRA - state limit
slide needed  = excess (forward)
holes         = ceil(slide needed / hole spacing)
actual KPRA   = KPRA - holes x hole spacing
```

KPRA is measured from the kingpin to the *center* of the rear axle group -- the midpoint between the tandem axles,
not the front one and not the trailer's end. States that regulate it do so to control off-tracking through
intersections, and the limits differ: 40 ft is the well-known California figure, others sit at 41 ft or use a
different measurement entirely, and many states do not regulate KPRA at all.

The catch is that sliding the tandems forward to fix KPRA moves weight onto the drives and off the trailer axles.
A driver who slides forward four holes to get legal in California can put the drives over 34,000 lb, which is a
different violation at the same scale. The tile reports the required slide in holes so it can be run alongside the
catalog's axle-load tandem-slide tile, and the two answers reconciled before the truck moves.

**Inputs:** measured KPRA (ft or in), the governing state limit, tandem hole spacing (in), current tandem
position.

**Outputs:** excess over the limit, required forward slide, whole holes to move, resulting KPRA, and pass or fail.

## 3. Worked example

A 53 ft trailer whose tandems are set so that the kingpin-to-axle-center measurement is 42 ft, running into
California with a 40 ft limit, 6 in hole spacing:

```
excess       = 42 - 40           = 2.0 ft = 24 in
holes needed = ceil(24 / 6)      = 4 holes forward
resulting    = 42 - (4 x 0.5 ft) = 40.0 ft  -> compliant, exactly at the limit
```

Four holes is a substantial slide. Each hole typically moves roughly 250 to 400 lb from the trailer tandems to the
drive axles depending on load distribution, so this move could shift well over a thousand pounds forward -- run
the axle-weight check before pulling the pin, not after crossing the scale.

## 4. Scope and non-goals

A length check against one state's limit at a time. KPRA regulation is state law, not federal, and the limits,
the measurement definition, and the exemptions (for automobile transporters, for stinger-steered configurations,
for permitted loads) vary and change; take the limit from the state's own published figure rather than from a
remembered number. The tile does not compute axle weights, does not check overall length, bridge formula, or
off-tracking, and does not address the routing designations under which a limit may or may not apply. The state
DOT and the enforcement officer govern.
