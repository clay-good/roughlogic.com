# roughlogic.com Specification v890 -- J-Hook / Bridle-Ring Count and Bundle Weight (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v889.md. Low-voltage install-ops sweep, beside
> `lv-cable-pull-footage` and `structured-cabling-channel`.
>
> **The gap, and the evidence for it.** Nothing counts the **J-hooks** for a cable pathway or checks the bundle weight
> each carries. Grep confirmed no J-hook / bridle-ring tile (`support-spacing` is NEC power raceway). TIA non-continuous
> support caps the spacing at about 5 ft. The number this settles: a 400 ft run at 4 ft spacing is **100 hooks**, and a
> 50-cable bundle at 0.035 lb/ft puts **7 lb** on each -- the pathway takeoff and the bundle-load check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
low-voltage siblings (`lv-cable-pull-footage`, `cable-tray-fill`): the run and spacing carry `L`, the cable count is
dimensionless, the cable weight per foot is force-per-length `M T^-2`, the hook working load and per-hook load are forces
`M L T^-2`, the hook count is dimensionless, and the utilization is dimensionless. The v18/v21 contract: a non-finite or
non-positive run, spacing, cable count, or cable weight returns `{ error }`; a negative hook working load returns
`{ error }`. Citation discipline (v19/v22): the support identity by name (hooks = ceil(run / spacing); load per hook =
cables x weight per foot x spacing), `GOVERNANCE.general`; the note states that TIA-569 non-continuous support runs about
4 to 5 ft on center, that the bundle load is the cables times the weight per foot over one span, that the bundle fill is
also limited so the lower cables are not crushed (roughly 40 to 50 cables per hook), and that this is distinct from the
NEC power-raceway `support-spacing`.

## 2. The tile

### 2.1 `cable-support-jhook` -- J-Hook / Bridle-Ring Count and Bundle Weight

```
inputs:
  run_ft           pathway length (ft)
  spacing_ft       hook spacing (ft, default 4)
  num_cables       cables in the bundle (count)
  cable_lb_per_ft  weight per cable (lb/ft, default 0.035)
  hook_wll_lb      hook safe working load (lb, default 0 = skip)

hooks            = ceil(run_ft / spacing_ft)
load_per_hook_lb = num_cables * cable_lb_per_ft * spacing_ft
utilization      = hook_wll_lb > 0 ? load_per_hook_lb / hook_wll_lb : null
```

**Pinned worked example.** Run 400 ft, spacing 4 ft, 50 cables, 0.035 lb/ft, hook WLL 0 (skip):
`hooks = ceil(400/4) = ` **100**; `load = 50*0.035*4 = ` **7 lb/hook**. Cross-check: a heavy 200-cable bundle puts
`200*0.035*4 = ` **28 lb** on each hook, and against a 30 lb hook that is a `28/30 = ` **0.93** utilization -- close
enough that the bundle should be split or the hook upsized.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, inside the `// Group A` low-voltage block near
`lv-cable-pull-footage`) -- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a
`citations.js` entry (hooks = ceil(run/spacing); load = cables x weight/ft x spacing [TIA-569], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the heavy-bundle cross-check); `test/fixtures/compute-map.js`
(`cable-support-jhook` -> `computeCableSupportJhook`, module `../../calc-lowvoltage.js`); `scripts/related-tiles.mjs`
(-> `lv-cable-pull-footage` / `cable-tray-fill` / `structured-cabling-channel`); `data/search/aliases.json` (5
collision-checked aliases: "j-hook count", "cable j hooks", "bridle ring count", "cable pathway supports", "j-hook bundle
weight"); a hand-written renderer in the `LOWVOLTAGE_RENDERERS` map mirroring a simple output renderer (non-exported, so
no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the hook count, per-hook load, the utilization (and null-when-skipped seam), and the error seams (non-positive run,
spacing, cables, cable weight; negative hook WLL). The calc-lowvoltage.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,338 -> 1,339.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(400/4) -> 100 hooks, 7 lb/hook).

## 5. Roadmap position

Low-voltage pathway takeoff beside `lv-cable-pull-footage`, serving the low-voltage technician (low-voltage). Stays
evidence-driven; TIA-569 and the hook manufacturer govern.
