# roughlogic.com Specification v1411 -- Weld Metal Volume and Filler Metal Purchased per Joint (calc-fab.js, Group E, welding and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E, welding and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog converts wire feed speed into a deposition rate -- how fast metal goes down -- but never answers the estimator's question, which is how many pounds a joint takes. That is a geometry problem (the weld's cross-section times its length) followed by a yield problem (deposition efficiency), and neither step is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive leg size, groove dimension, or weld length, or a deposition efficiency or deposition rate at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the weld cross-sectional area relations for fillet and groove welds with a reinforcement allowance, the density of steel at 0.284 lb per cubic inch, and the published deposition efficiency by process, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `filler-metal-consumption` -- Weld Metal Volume and Filler Metal Purchased per Joint

```
fillet area      = leg^2 / 2 x (1 + reinforcement allowance)
groove area      = from the groove geometry (root opening, included angle, thickness) plus reinforcement
weld volume      = area x weld length
deposited weight = volume x 0.284 lb per cubic inch
purchased weight = deposited weight / deposition efficiency
arc hours        = deposited weight / deposition rate
```

Two steps, and estimators routinely conflate them. **Deposited** weight is what ends up in the joint, and it is
pure geometry. **Purchased** weight is what you buy, and it is larger by the deposition efficiency -- roughly 95%
for solid wire under gas, 85% for flux-cored, and as low as 60% for stick electrodes once the stub loss is
counted. Ordering by deposited weight is how a job runs out of wire.

The leg-squared term is what makes fillet sizing consequential. A 5/16 fillet has 56% more weld metal than a 1/4
fillet, and a 3/8 has 125% more -- for a joint whose strength requirement may have been satisfied at 1/4. Oversized
fillets are the most common and most expensive habit in a fab shop, and this tile prices the habit in pounds and
in arc hours.

**Inputs:** weld type and geometry (fillet leg size, or groove dimensions), weld length, reinforcement allowance,
deposition efficiency for the process, deposition rate (lb/hr), and filler price per pound.

**Outputs:** weld cross-sectional area, weld metal volume, deposited weight, purchased weight, arc hours, and
filler cost per joint.

## 3. Worked example

A 5/16 in fillet, 100 ft long, 10% reinforcement, flux-cored at 85% deposition efficiency and 8 lb/hr:

```
area       = 0.3125^2 / 2 x 1.10   = 0.0537 sq in
volume     = 0.0537 x 1,200 in     = 64.5 cubic in
deposited  = 64.5 x 0.284          = 18.3 lb
purchased  = 18.3 / 0.85           = 21.5 lb
arc hours  = 18.3 / 8              = 2.29 hr
```

Now check the oversizing cost. If the drawing called for a 1/4 in fillet and the welder laid 5/16, the deposited
weight should have been 11.7 lb and the arc time 1.46 hr -- so the extra sixteenth of an inch cost 6.6 lb of wire
and 50 minutes of arc time on a single hundred-foot weld. Across a shop, that difference is a line on the profit
and loss statement.

## 4. Scope and non-goals

Geometry and yield, not procedure. It does not size the weld -- required fillet size and groove detail come from
the design and from the applicable code (AWS D1.1 for structural steel), and undersizing a weld to save wire is a
structural failure, not a saving. Deposition efficiencies and rates are process and operator figures; published
values are typical and a shop should measure its own. The tile does not include tack welds, root passes run at a
different size, repairs and rework, or the arc-on fraction that converts arc hours into shift hours (the shielding
gas tile carries that). It assumes carbon steel density. The welding procedure specification, the applicable AWS
code, and the welding engineer govern.
