# roughlogic.com Specification v1440 -- Powder Coating Coverage, Transfer Efficiency, and Reclaim (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes paint coverage for liquid but nothing for powder, where the arithmetic is different in a way that matters: theoretical coverage depends on specific gravity and film thickness, and what a shop actually gets depends on transfer efficiency and whether the booth reclaims overspray. Those two factors move the material cost by a factor of two.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive specific gravity, film thickness, or part area, or a transfer efficiency or reclaim rate outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the powder-coating theoretical-coverage constant (192.7 divided by specific gravity times mils) and the transfer-efficiency and reclaim conventions, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `powder-coat-coverage` -- Powder Coating Coverage, Transfer Efficiency, and Reclaim

```
theoretical coverage = 192.7 / (specific gravity x film thickness in mils)   sq ft per lb
effective utilization = transfer efficiency + (1 - transfer efficiency) x reclaim rate
effective coverage    = theoretical coverage x effective utilization
powder required       = part area / effective coverage
cost per square foot  = powder price per lb / effective coverage
```

The constant 192.7 is a unit conversion, not a material property: one pound of a material at specific gravity 1.0
spread one mil thick covers 192.7 square feet. Divide by the powder's specific gravity and by the film thickness
and you have the theoretical coverage -- what you would get if every particle landed on the part.

Nothing lands entirely on the part. Transfer efficiency for electrostatic spray runs 60% to 70% on a first pass,
lower on complex geometry where the Faraday cage effect keeps powder out of recesses. The rest is overspray, and
whether that overspray is money depends entirely on the booth: a reclaim booth recovers most of it and returns it
to the feed hopper, and a spray-to-waste booth does not. Effective utilization near 98% against 60% is the whole
economic case for a reclaim booth, and this tile is where it gets made.

Film thickness is the other lever and it is the one under the operator's control. Powder applied at 3.0 mils when
the specification calls for 2.0 costs 50% more material for no benefit, and it is invisible without a gauge.

**Inputs:** powder specific gravity, target film thickness (mils), part surface area, transfer efficiency, reclaim
rate, powder price per pound.

**Outputs:** theoretical coverage, effective utilization, effective coverage, pounds required, and cost per square
foot and per part.

## 3. Worked example

A powder of specific gravity 1.5 applied at 2.0 mils over 500 sq ft of part surface, 60% transfer efficiency:

```
theoretical coverage = 192.7 / (1.5 x 2.0)     = 64.2 sq ft/lb

spray to waste (no reclaim):
  effective coverage = 64.2 x 0.60             = 38.5 sq ft/lb
  powder required    = 500 / 38.5              = 13.0 lb

with 95% reclaim:
  utilization        = 0.60 + 0.40 x 0.95      = 0.98
  effective coverage = 64.2 x 0.98             = 62.9 sq ft/lb
  powder required    = 500 / 62.9              = 7.9 lb
```

Thirteen pounds against eight -- reclaim cuts material use by 39% on this job, and at $4 to $8 a pound across a
production year that is the booth's payback. Then check the thickness discipline: running the same job at 3.0 mils
instead of 2.0 pushes the no-reclaim requirement from 13.0 lb to 19.5 lb, which costs more than the transfer
efficiency does.

## 4. Scope and non-goals

Material arithmetic. Transfer efficiency is a strong function of part geometry, gun setup, charging voltage,
grounding quality, and operator technique, and a poorly grounded part can drop it dramatically -- measure it
rather than assume it. Reclaim is only usable where color changes are infrequent and the recovered powder is
sieved and blended within the manufacturer's limits; reclaimed powder is not indefinitely reusable. The tile does
not address cure schedule, pretreatment (which determines adhesion and corrosion performance far more than film
thickness does), film thickness uniformity, or **combustible dust hazards**, which for powder coating are
governed by NFPA 33 and NFPA 652 and cover booth construction, grounding, and ignition control. The powder
manufacturer's technical data sheet, NFPA, and OSHA govern.
