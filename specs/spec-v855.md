# roughlogic.com Specification v855 -- Low-Voltage Cable Footage and Box Count (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v854.md. Low-voltage install-ops sweep, beside
> `structured-cabling-channel` and `cable-tray-fill`.
>
> **The gap, and the evidence for it.** `structured-cabling-channel` checks the 100 m channel limit but nothing takes off
> the **cable footage** for a drop count and the number of pull boxes it fills. Grep confirmed no LV-footage tile. The
> number this settles: 48 drops at a 120 ft average run plus 15 ft of slack is **6,480 ft** -- **7 thousand-foot boxes** --
> the material order for a cabling job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
low-voltage siblings (`structured-cabling-channel`, `cable-tray-fill`): the run length, slack, and box length carry `L`,
the drop count is dimensionless, the total footage is `L`, and the box count is dimensionless. The v18/v21 contract: a
non-finite or non-positive drop count, average run, or box length returns `{ error }`; a negative slack returns
`{ error }`. Citation discipline (v19/v22): the footage takeoff identity by name (total = drops x (average run + slack);
boxes = ceil(total / box length)), `GOVERNANCE.general`; the note states that the slack covers service loops at both ends
plus rack dressing, that each run's length is limited separately by `structured-cabling-channel` (the 100 m channel), and
that cable is bought by the box.

## 2. The tile

### 2.1 `lv-cable-pull-footage` -- Low-Voltage Cable Footage and Box Count

```
inputs:
  drops       number of cable drops (count)
  avg_run_ft  average run length (ft)
  slack_ft    service-loop / dressing slack per drop (ft, default 15)
  box_ft      cable box / spool length (ft, default 1000)

total_ft = drops * (avg_run_ft + slack_ft)
boxes    = ceil(total_ft / box_ft)
```

**Pinned worked example.** Drops 48, average run 120 ft, slack 15 ft, 1,000 ft boxes:
`total = 48 * (120+15) = ` **6,480 ft**; `boxes = ceil(6480/1000) = ` **7**. Cross-check: a denser 100-drop job at a
shorter 90 ft run is `100 * (90+15) = ` **10,500 ft** and **11 boxes** -- the drop count carries the order once the runs
are short.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, inside the `// Group A` low-voltage block near
`structured-cabling-channel`) -- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`);
a `citations.js` entry (total = drops x (run + slack); boxes = ceil(total/box), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the dense-job cross-check); `test/fixtures/compute-map.js`
(`lv-cable-pull-footage` -> `computeLvCablePullFootage`, module `../../calc-lowvoltage.js`); `scripts/related-tiles.mjs`
(-> `structured-cabling-channel` / `cable-tray-fill` / `cable-reel-capacity`); `data/search/aliases.json` (5
collision-checked aliases: "low voltage cable footage", "cabling drop footage", "structured cabling takeoff", "cable box
count", "network cable footage"); a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map mirroring a simple output
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the total footage, the box count, and the error seams (non-positive drops, run, box;
negative slack). The calc-lowvoltage.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,303 -> 1,304.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(48 * (120+15) -> 6,480 ft, 7 boxes).

## 5. Roadmap position

Low-voltage install-ops tile beside `structured-cabling-channel` (length limit) and `cable-reel-capacity`, serving the
low-voltage technician (low-voltage). Stays evidence-driven; the drop schedule governs the count.
