# roughlogic.com Specification v189 -- Drying-System Balance: Evaporation Load vs Installed Dehumidification (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v188..v196 (water-damage restoration).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile checking whether the dehumidification
> actually installed on a job can keep up with the estimated evaporation load -- the balanced-drying
> verification that ties the `evaporation-load` and `dehumidifier` tiles together. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v187.md.
>
> **The gap, and the evidence for it.** The catalog estimates the moisture the air movers will throw
> into the air (`evaporation-load`) and sizes a dehumidifier (`dehumidifier`), but never closes the
> loop: is the installed dehu capacity greater than the evaporation load, with margin, or is the
> chamber over-humidifying and headed for secondary damage. That balance check is the single most
> important daily judgment in structural drying, and there is no tile that states surplus or deficit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
evaporation load and the installed dehumidification capacity are both pints per day
(`L^3 T^-1`, matching the `dehumidifier` and `evaporation-load` outputs); the balance is a difference
in the same unit; the ratio and the recommended margin are `dimensionless`. The v18/v21 contract: any
non-finite input, a negative evaporation load, or a non-positive installed capacity returns
`{ error }`; the only division is by the guarded-positive evaporation load for the ratio. Citation
discipline (v19/v22): `GOVERNANCE.general` over the balanced-drying-system principle, by name;
`editionNote` names ANSI/IICRC S500 and states that a balanced system keeps installed capacity at or
above the evaporation load with margin, that field capacity is below the AHAM nameplate as grain
depression falls, and that the restorer's daily monitoring governs equipment adjustments.

## 2. The tile

### 2.1 `drying-balance` -- Installed Dehumidification vs Evaporation Load

```
inputs:
  evap_load_ppd        L^3 T^-1   estimated evaporation load (pints/day, from evaporation-load)
  installed_ppd        L^3 T^-1   installed dehu capacity (pints/day; use field, not AHAM, where known)
  target_margin        dimensionless  desired capacity-to-load ratio (default 1.2)

balance_ppd  = installed_ppd - evap_load_ppd
ratio        = installed_ppd / evap_load_ppd
verdict: ratio >= target_margin -> balanced with margin
         1 <= ratio < target     -> meeting load but no margin; add capacity or improve airflow
         ratio < 1                -> deficit; chamber over-humidifying, add (target x load - installed) ppd
```

**Pinned worked example.** An estimated **200 ppd** evaporation load with **260 ppd** of installed
LGR capacity: `balance = +60 ppd`, `ratio = 260/200 = 1.30`, above the 1.2 target -> **balanced with
margin**. **Cross-check (deficit).** The same 200 ppd load with only **150 ppd** installed:
`balance = -50 ppd`, `ratio = 0.75` -> **deficit**: the chamber is over-humidifying and at risk of
secondary damage; add at least `1.2 x 200 - 150 = 90 ppd` of capacity (or reduce the evaporation rate).
Field capacity falls below AHAM as the air dries; the restorer and S500 govern.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the balanced-drying-system principle, `editionNote` naming
ANSI/IICRC S500 and the field-vs-AHAM and restorer-governs caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`drying-balance` -> `computeDryingBalance` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `evaporation-load` / `dehumidifier` / `grains-removed`);
`data/search/aliases.json` ("drying balance", "dehu capacity vs load", "balanced drying", "keep up",
"over humidifying", "capacity deficit"); the id appended to the existing `RESTORATION_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the balanced example, the deficit cross-check, the no-margin
band, and error seams (non-finite, load < 0, installed <= 0). Raise the `calc-restoration.js` size
cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the no-margin band); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the balance,
ratio, and verdict wrap on a phone); render-no-nan + a11y sweep, output read to the value (200 vs 260
-> +60, 1.30, balanced; 200 vs 150 -> -50, 0.75, deficit).

## 5. Roadmap position

Closes the loop between `evaporation-load` and `dehumidifier`, the core structural-drying pair.
Further Group D growth stays evidence-driven.
