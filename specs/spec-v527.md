# roughlogic.com Specification v527 -- Rentable/Usable Load Factor (BOMA) (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-realestate.js`**
> (Group X, real estate); no new module, group, or dependency. Inherits spec.md through spec-v526.md.
>
> **The gap, and the evidence for it.** Office rent is quoted per **rentable** square foot, but a tenant can only occupy
> the **usable** square feet -- the rentable figure adds the tenant's pro-rata share of lobbies, corridors, and
> restrooms that come with the building but cannot hold a desk. The ratio between them is the load factor (or add-on
> factor), and the bench has no tile to apply it, so tenants compare a quoted rate that hides 12 to 18% of cost. A
> 15% load factor means the space you actually use costs 15% more than the quoted rate. The tile takes the usable area,
> the common-area (load) factor, and the quoted base rent, and returns the rentable area, the load factor, the annual
> rent, and the effective cost per usable square foot -- the number that compares two suites with different common-area
> loads honestly. It follows the BOMA convention that the load factor is applied on top of usable area.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The usable and rentable
areas are areas (`L^2`, in square feet); the common-area factor, the load factor, and the currency rents are carried as
`dimensionless` to the lint (matching the existing real-estate tiles). The v18/v21 contract: any non-finite input, a
non-positive usable area, a negative common-area factor, or a negative base rent returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the load-factor relations by name (BOMA Office Standard ANSI/BOMA
Z65.1); `editionNote` names the **BOMA rentable/usable load factor**, prints
`rentable = usable x (1 + common_area_factor)`, `load_factor = rentable / usable`,
`annual_rent = base_rent x rentable`, and `cost_per_usable = base_rent x load_factor`, and states that **rent is quoted
per rentable square foot which includes the tenant's pro-rata share of building common areas they cannot occupy, so the
effective cost per usable square foot is the quoted rate times the load factor, add-on and loss-factor conventions vary
so the measured BOMA areas and the lease govern, and this is a cost-comparison aid not a space measurement** -- a
comparison aid, not a BOMA measurement report.

## 2. The tile

### 2.1 `commercial-load-factor` -- Why Rent Per Rentable SF Understates the Cost of the Space You Use

```
inputs:
  usable_sf            SF    usable (occupiable) square feet
  common_area_factor   -     building common-area (add-on) factor, as a decimal (0.15 = 15%)
  base_rent            $/SF  quoted base rent per rentable SF per year

rentable_sf     = usable_sf x (1 + common_area_factor)          [SF]
load_factor     = rentable_sf / usable_sf                       [-]
annual_rent     = base_rent x rentable_sf                       [$]
cost_per_usable = base_rent x load_factor                       [$/usable SF]
```

**Pinned worked example (10,000 usable SF, 15% common-area factor, $30/rentable-SF).** The rentable area is
`10,000 x 1.15 = 11,500 SF`, a load factor of `11,500 / 10,000 = ` **1.15**, so the annual rent is
`30 x 11,500 = $345,000` and the real cost of the space the tenant uses is `30 x 1.15 = ` **$34.50 per usable SF** --
15% above the quoted $30, the hidden cost of the common areas. **Cross-check (a heavier common load costs more per
usable foot).** A tower suite with a 20% factor on the same usable area: `rentable = 12,000 SF`, `load_factor = 1.20`,
and `cost_per_usable = 30 x 1.20 = ` **$36.00** -- $1.50/SF more for the identical usable space, purely from the higher
common-area load, the comparison the quoted rate hides. The tile returns the rentable area, the load factor, the annual
rent, and the cost per usable square foot.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 15% example + the 20%
cross-check); `test/fixtures/compute-map.js` (`commercial-load-factor` -> `computeCommercialLoadFactor` in
`../../calc-realestate.js`); `scripts/related-tiles.mjs` (-> `net-effective-rent` / `square-footage` /
`rental-worksheet`); `data/search/aliases.json` ("load factor", "rentable usable", "boma", "add-on factor", "common
area factor", "rentable square feet", "loss factor", "cost per usable sf"); the id appended to the real-estate
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the rentable = usable x (1+factor) relation, the cost-per-usable scaling, and the error
seams (non-finite, non-positive usable, negative factor / rent). Hand-writes its renderer (mirroring the
calc-realestate.js `rental-worksheet` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the rentable / load-factor / cost stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 15% example -> 11,500 SF, $34.50/usable SF).

## 5. Roadmap position

Pairs with `net-effective-rent` (concessions) as the two adjustments that turn a quoted office rate into a real cost per
usable foot. A BOMA-2017 method A vs method B toggle and a multi-tenant floor common-area allocation are deliberate
future follow-ons. Further Group X growth stays evidence-driven.
