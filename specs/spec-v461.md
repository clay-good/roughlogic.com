# roughlogic.com Specification v461 -- Residential Duct Leakage CFM25 (IECC R403.3.5) (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the HVAC field-checks trio (v459 gas appliance altitude derate ->
> v460 duct equivalent diameter -> v461 duct leakage CFM25). `duct-leakage` is the commercial SMACNA leakage-class test
> (CFM per 100 ft^2 of duct surface); this tile is the residential IECC code test, normalized to conditioned floor area,
> with a different pass/fail limit.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Residential energy code measures duct tightness by a
> blower test at `25 Pa` and normalizes the leakage to the conditioned floor area: `CFM25 / CFA * 100`. IECC R403.3.5 caps it
> at `4 CFM25 per 100 ft^2` for a rough-in or post-construction test (a looser limit applies to existing systems).
> `duct-leakage` normalizes to duct *surface* area on the SMACNA leakage-class basis, a different standard and a different
> number. This adds the residential-code tile to the existing **`calc-hvacservice.js`** module (Group C); no new group,
> trade, or dependency. Inherits spec.md through spec-v460.md.
>
> **The gap, and the evidence for it.** A house with a measured `80 CFM25` of total duct leakage and `2000 ft^2` of
> conditioned floor area normalizes to `80 / 2000 * 100 = 4.0 CFM25 per 100 ft^2`, exactly at the IECC `4.0` post-
> construction limit -- it just passes. Tighten the ducts to `60 CFM25` and it drops to `3.0`, a comfortable pass. No tile
> does this; `duct-leakage` gives the SMACNA class number, which does not answer the residential code question.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The measured leakage is a
volumetric flow (CFM at 25 Pa); the conditioned floor area is an area (ft^2); the normalized leakage is a flow per area
(CFM25 per 100 ft^2). The v18/v21 contract: any non-finite input, or a non-positive leakage or floor area, returns
`{ error }`; the tile normalizes the leakage per `100 ft^2` of conditioned floor area and reports pass/fail against the
selected limit. Citation discipline (v19/v22): `GOVERNANCE.general` over the IECC duct leakage test by name; `editionNote`
names **IECC R403.3.5 / RESNET 380, the normalization `CFM25 / CFA * 100` (leakage per `100 ft^2` of conditioned floor
area), the `4 CFM25 per 100 ft^2` total rough-in/post-construction limit (and the looser existing-system allowance), and the
distinction from the SMACNA `duct-leakage` class (per duct-surface area) -- code text quoted per the CF-01 disclosure**, and
states that **this returns the residential-code duct leakage result, that total vs outside-the-envelope leakage and the test
stage matter, and that it is a compliance aid, not a substitute for a certified duct-leakage test**.

## 2. The tile

### 2.1 `duct-leakage-cfm25` -- Residential Duct Leakage CFM25 (IECC R403.3.5)

```
inputs:
  leakage_cfm25   CFM   measured total leakage at 25 Pa
  cfa_ft2         ft^2  conditioned floor area
  limit           -     CFM25 per 100 ft^2 limit (default 4)

normalized = leakage_cfm25 / cfa_ft2 * 100
passes     = normalized <= limit
```

**Pinned worked example (80 CFM25, 2000 ft^2, limit 4).** `normalized = 80/2000*100 = 4.0 CFM25/100 ft^2` -> passes at the
limit. **Cross-check (a tighter house).** `60 CFM25` on the same `2000 ft^2` gives `3.0` -> a comfortable pass; a leakier
`100 CFM25` gives `5.0` -> fails. A non-positive leakage or floor area takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `duct-leakage` / `duct-static-pressure-total`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, IECC R403.3.5, `editionNote` naming the CFA normalization, the
`4 CFM25/100 ft^2` limit, and the distinction from the SMACNA class -- code text per CF-01);
`test/fixtures/worked-examples.json` (the at-limit example + the pass/fail cross-checks); `test/fixtures/compute-map.js`
(`duct-leakage-cfm25` -> `computeDuctLeakageCfm25` in `../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (->
`duct-leakage` / `duct-static-pressure-total` / `blower-door-ach50` / `manual-d-friction-rate`); `data/search/aliases.json`
("duct leakage cfm25", "iecc duct leakage", "cfm25 per 100", "duct blaster", "residential duct leakage", "403.3.5", "duct
tightness test", "duct leakage code", "conditioned floor area leakage"); the id appended to the existing HVAC-service
renderers block in `app.js`; the `// dims:` annotation (leakage flow, area area, normalized flow-per-area); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the three cases, the pass/fail boundary, and the non-positive /
non-finite error seams. No new module; re-pin `calc-hvacservice.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+3 fixtures, the new fuzzer block, the pass/fail boundary, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the normalized / pass output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (80 CFM25, 2000 ft^2 -> 4.0, pass).

## 5. Roadmap position

Closes the HVAC field-checks trio: v459 the gas derate, v460 the duct equivalent, and v461 the residential leakage test. A
total-vs-outside-leakage split and a leakage-to-energy-penalty estimate are the deliberate next follow-ons.
