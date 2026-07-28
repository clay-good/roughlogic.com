# roughlogic.com Specification v1114 -- Chip Seal Design by the McLeod Method (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1113.md.
>
> **The gap, and the evidence for it.** No "chip seal", "McLeod", or "sealcoat" string exists anywhere in
> tools-data.js, the alias index, or any calc module (the "seal coat" alias misfires to
> `soot-cleaning-takeoff`). `asphalt-tack-coat-quantity` is tack gallons with no aggregate;
> `asphalt-spread-rate` is hot-mix yield. Discovery batches 1 and 7 both flagged it CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
size / unit weight / gravity / wastage, a flakiness index outside 0-100, a traffic factor or residual
outside (0, 1], negative surface or absorption factors, or a unit weight that leaves no voids all return
`{ error }`. Renderer: `_simpleRenderer`.

## 2. The tile

### 2.1 `chip-seal-mcleod` -- Chip Seal Design by the McLeod Method

```
inputs:  median_size_in (M), flakiness_index_pct (FI), loose_unit_weight_pcf (W),
         bulk_specific_gravity (G), wastage_factor (E), traffic_factor (T),
         surface_factor_gal_sy (S), absorption_gal_sy (A), residual_asphalt (R)
compute: H = M / (1.139285 + 0.011506 FI)          average least dimension, in
         V = 1 - W / (62.4 G)                       voids in the loose aggregate
         C = 46.8 (1 - 0.4 V) H G E                 aggregate, lb/SY
         B = (2.244 H T V + S + A) / R              binder, gal/SY of emulsion
outputs: ald_in, voids, aggregate_lb_sy, binder_gal_sy, aggregate_ton_per_1000sy,
         binder_gal_per_1000sy, residual_gal_sy, note
```

**Provenance.** All four equations are quoted **verbatim** from a US state DOT test procedure implementing
McLeod (public domain), located and read rather than recalled -- including the exact ALD coefficients
1.139285 and 0.011506, the 46.8 and 2.244 constants, and the 62.4 water-density term in the voids relation.
A second DOT manual independently confirmed the 46.8 constant, the ~50% loose-voids figure, the 70%
void-fill target, and the 0.60-0.85 traffic-factor range.

**The physical idea, and the two things it makes counterintuitive.** A chip seal is built ONE STONE THICK,
so the controlling dimension is the average least dimension, not the sieve size: traffic rolls each stone
onto its flattest face, and the mat ends up as deep as the stones are thin. 18% flat particles pull a 3/8-in
aggregate from 0.329 in to 0.279 in.

1. **The aggregate rate is purely geometric** -- it does not change with binder type, residual content,
   surface condition, or traffic. The fuzzer pins that invariant across four different inputs.
2. **Heavier traffic wants LESS binder**, because traffic itself embeds the stone. T runs about 0.85 under
   100 vehicles/day down to 0.60 over 2,000, and the cross-check fixture pins the binder falling from
   0.3275 to 0.2680 gal/SY while the aggregate rate stays put.

**Worked example (pinned).** M 0.375 in, FI 18, W 95 pcf, G 2.65, E 1.05, T 0.75, S 0.02, R 0.67:
H 0.27852 in, V 42.55%, **C 30.10 lb/SY (15.05 tons per 1,000 SY)**, **B 0.3275 gal/SY** emulsion.

## 3. Scope limits

The traffic, wastage, and surface-condition factors are agency TABLE lookups that vary by agency, so they
are entered with their published ranges named rather than shipped. Binder is emulsion gallons at the
residual entered (1.0 for asphalt cement), and the residual gallons are reported alongside. These are
design values: too much binder bleeds and flushes, too little loses the chips, and the field almost always
adjusts after a test strip. The agency's own procedure and the test strip govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `asphalt-tack-coat-quantity`. Fuzzer
checks each of the four equations against its own algebra, the FI = 0 degenerate case, monotonic ALD
decrease across five flakiness values, the aggregate-is-geometric invariant across four unrelated inputs,
the inverse traffic direction in both directions, the asphalt-cement case, the unit conversions, and the
no-voids error.
