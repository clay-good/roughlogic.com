# roughlogic.com Specification v1206 -- Secondary Compression (Creep) Settlement (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-07). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1205.md.
>
> **The gap, and the evidence for it.** The `soil-consolidation-settlement`, `overconsolidated-settlement`, and
> `settlement-limit-load` tiles all compute PRIMARY consolidation, and each names the gap: the overconsolidated tile's
> note says "the secondary compression and the time rate are separate," and its citation ends "primary consolidation
> only; the secondary compression and the time rate are separate." Secondary compression (creep) had no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive C-alpha, thickness, or t1, a void ratio giving a non-positive
(1 + ep), or a t2 that is not later than t1 returns `{ error }`. Citation discipline (v19/v22): the secondary-compression
relation as compiled in Das / Holtz-Kovacs / Mesri, by name, `GOVERNANCE.general`. **No copyrighted table is
reproduced** -- the relation is standard soil-mechanics theory, and C-alpha and ep are the user's own oedometer results.

## 2. The tile

### 2.1 `secondary-compression-settlement` -- Secondary Compression (Creep) Settlement

```
C-alpha-eps = C-alpha / (1 + ep)                       modified (strain-based) secondary compression index
Ss_ft       = C-alpha-eps * H * log10(t2 / t1)         secondary settlement (ft)
Ss_in       = 12 * Ss_ft
```

**Inputs:** secondary compression index `c_alpha`, clay layer thickness `h_ft` (ft), void ratio at the end of primary
consolidation `ep`, time to the end of primary `t1_yr` (yr), and time of interest `t2_yr` (yr).

**Outputs:** the secondary settlement `ss_in` (and `ss_ft`) and the modified index `c_alpha_eps`.

## 3. Worked example

`c_alpha = 0.02, h_ft = 10, ep = 0.85, t1_yr = 1, t2_yr = 50`:

```
C-alpha-eps = 0.02 / 1.85 = 0.010811
Ss = 0.010811 * 10 * log10(50) = 0.010811 * 10 * 1.69897 = 0.1837 ft = 2.204 in
```

Because settlement grows with the log of the time ratio, extending to 100 years (log10 = 2.0) gives 2.595 in -- only
18% more than the 50-year value for double the time.

## 4. Limitations

Post-primary creep only; it is added to the primary consolidation settlement (from `soil-consolidation-settlement` or
`overconsolidated-settlement`) for the long-term total, and it is independent of the primary time rate
(`consolidation-time-rate`). C-alpha and ep come from the oedometer's log-time tail. A design aid; the oedometer data and
the geotechnical engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1206` pins the example, the C-alpha-eps identity, the log-time growth (1->100 yr is
  double 1->10 yr), the linear scaling in C-alpha and H, and the error seams (including t2 <= t1).
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 50-year example and the 100-year log-time check).
- Formula checked against the standard secondary-consolidation relation (Das / Holtz-Kovacs / Mesri).
