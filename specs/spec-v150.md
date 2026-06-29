# roughlogic.com Specification v150 -- Indoor/Outdoor Spore Ratio Clearance Screen (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23 (DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v146..v150.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one mold-remediation tile screening clearance air results against the
> outdoor baseline -- the indoor/outdoor ratio and the water-damage marker check that decide whether a
> clearance is supportable. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group,
> or dependency. Inherits spec.md through spec-v149.md.
>
> **The gap, and the evidence for it.** The clearance sampling plan (v149) produces counts, but the
> read on them has a structure: post-remediation indoor airborne spore concentration should be at or
> below the outdoor control (an indoor/outdoor ratio at or under 1), and the genera should resemble
> outdoor with no indoor-dominant water-damage markers (Stachybotrys, Chaetomium) elevated inside. That
> comparison is the everyday clearance screen, yet the catalog has no tile to compute the ratio or flag
> the marker, so the field read is done on a calculator and the marker check is left to recollection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
indoor and outdoor spore concentrations are a count per volume (`L^-3`, spores/m^3); the
indoor/outdoor ratio and the marker flag are `dimensionless`; the pass result is boolean. The v18/v21
contract: any non-finite input, a negative indoor concentration, or a non-positive outdoor control
returns `{ error }`; the only division is by the guarded-positive outdoor control. Citation discipline
(v19/v22): `GOVERNANCE.general` over the indoor/outdoor comparison and the marker-genera principle, by
name; `editionNote` names ANSI/IICRC S520 and states that **a CIH or independent environmental
professional interprets clearance** -- the genera analysis and visual/moisture criteria govern, and a
ratio at or under 1 alone does not clear a project. This is a screen, not a clearance certificate.

## 2. The tile

### 2.1 `spore-io-ratio` -- Indoor/Outdoor Spore Ratio and Marker Screen

```
inputs:
  indoor_spores_m3    count/L^3      total indoor airborne spore concentration (spores/m^3)
  outdoor_spores_m3   count/L^3      outdoor control concentration (spores/m^3)
  indoor_marker       dimensionless  water-damage marker (Stachybotrys / Chaetomium) elevated indoors, 0/1

io_ratio = indoor_spores_m3 / outdoor_spores_m3
pass     = (io_ratio <= 1) and (indoor_marker == 0)        # screen-supportable, not a certificate
```

**Pinned worked example.** Indoor 800 spores/m^3 against an outdoor control of 1,500, no marker
indoors: `io_ratio = 800/1500 = 0.53`; `0.53 <= 1` and no marker -> **clearance-supportable** (indoor
below outdoor, genera consistent).
**Cross-check (each failure path independently).** Indoor 2,400 against 1,500 -> `io_ratio = 1.6 > 1`
-> **not supportable** (indoor exceeds outdoor); and even at a clean `io_ratio = 0.5`, a Stachybotrys
marker elevated indoors (`indoor_marker = 1`) forces **not supportable**. The IEP interprets the genera
and the full criteria; the ratio is a screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the indoor/outdoor ratio and marker-genera principle,
`editionNote` naming ANSI/IICRC S520 and the IEP-interprets / not-a-certificate caveat);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`spore-io-ratio` -> `computeSporeIoRatio` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `mold-clearance-sampling-plan` / `air-sample-volume` /
`mold-conditions`); `data/search/aliases.json` ("indoor outdoor ratio", "spore clearance",
"stachybotrys", "marker genera", "spore count", "mold clearance pass"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, both cross-check failure paths, and
error seams (non-finite, indoor < 0, outdoor <= 0). Raise the `calc-restoration.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, both failure paths); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ratio and
verdict wrap on a phone); render-no-nan + a11y sweep, output read to the value (800 / 1,500 / no marker
-> 0.53 ratio, supportable).

## 5. Roadmap position

Closes the batch and the mold-verification pair (plan v149, interpret here), and rounds out the
fire-and-mold expansion alongside the water family. Further Group D growth stays evidence-driven.
