# roughlogic.com Specification v660 -- Max RPM from a Piston-Speed Limit (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic), no new module, group, or dependency. Inherits spec.md through spec-v659.md.
>
> **The gap, and the evidence for it.** The `mean-piston-speed` tile (spec-v324) computes the mean piston speed for
> a stroke and RPM and reads out a qualitative regime band -- it does not solve for a numeric RPM ceiling. The
> engine builder's question is the reverse: "I want to keep mean piston speed under 4,000 ft/min -- what redline
> does that give my stroke?" Inverting `MPS = stroke x RPM / 6` gives `RPM_max = 6 x MPS_limit / stroke`.
> First-principles; the only constant (6) is already in the sibling. The pinned example: a **3.48 in** stroke at a
> **4,000 ft/min** ceiling redlines at **6,897 rpm**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stroke is `L`, the
mean-piston-speed limit is `L T^-1`, and the RPM cap is `T^-1`. The `6` unit-bridge and the `0.00508` ft/min->m/s
factor are the same ones `mean-piston-speed` already uses. The v18/v21 contract: any non-finite input, or a
non-positive stroke or limit, returns `{ error }`. Citation discipline (v19/v22): the mean-piston-speed relation
solved for the RPM cap, the inverse of the mean-piston-speed tile, by name; the note states that **RPM_max =
6 x MPS_limit / stroke, a longer stroke lowers the cap, the practical ceilings are ~4,000 street / 4,000-4,500
performance / over 4,500 race ft/min, and this is the average (not peak) piston speed** -- the component makers'
rpm ratings govern.

## 2. The tile

### 2.1 `max-rpm-from-piston-speed` -- The Safe Redline for a Mean-Piston-Speed Ceiling

```
inputs:
  stroke_in       in       crankshaft stroke (> 0)
  mps_limit_fpm   ft/min   chosen mean-piston-speed ceiling (> 0; default 4000)

rpm_max      = 6 x mps_limit_fpm / stroke_in
mps_limit_ms = mps_limit_fpm x 0.00508
```

**Pinned worked example.** `stroke = 3.48 in`, `MPS_limit = 4,000 ft/min`: `rpm_max = 6 x 4,000 / 3.48 = ` **6,897
rpm** -- the exact inverse of the mean-piston-speed example (3.48 in at 6,897 rpm = 4,000 ft/min).
**Cross-check (a longer stroke caps lower).** A 4.00 in stroke at the same 4,000 ft/min ceiling redlines at
**6,000 rpm** -- the trade a stroker accepts.
**Cross-check (the ceiling scales the cap).** Raising the limit to 4,500 ft/min raises the cap proportionally.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `mean-piston-speed`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (mean-piston-speed inverted, the note per §1); `test/fixtures/worked-examples.json`
(the pinned example plus the longer-stroke cross-check); `test/fixtures/compute-map.js`
(`max-rpm-from-piston-speed` -> `computeMaxRpmFromPistonSpeed`); `scripts/related-tiles.mjs` (<-> `mean-piston-
speed`, `displacement-cr`, `hp-from-torque`, `injector-size`); `data/search/aliases.json` ("max rpm from piston
speed", "rpm limit from piston speed", "safe redline for stroke", plus question rows, all collision-checked);
`MECHANIC_RENDERERS["max-rpm-from-piston-speed"]` via the `_simpleRenderer` factory (field DOM ids = the input
keys) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact inverse
round-trip through `computeMeanPistonSpeed`, the stroke and ceiling scaling, and the error seams. The Group K
citation-audit test parses only the original `// Group K: Mechanic` tools-data block (which this later-section tile
is not part of), so no count bump. The two `index.html` home-count spots go 1,108 -> 1,109 (check-readme-counts
gates them). The calc-mechanic.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 6,897 rpm).

## 5. Roadmap position

Completes the mean-piston-speed pair: `mean-piston-speed` (stroke + RPM -> speed and band) and now
`max-rpm-from-piston-speed` (stroke + limit -> the RPM cap), exact inverses through the same MPS = stroke x RPM / 6
relation. Further Group K growth stays evidence-driven.
