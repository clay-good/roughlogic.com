# roughlogic.com Specification v928 -- Dynamic Compression Ratio (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v927.md. Engine-builder geometry sweep, beside the
> accepted `displacement-cr` (static CR) tile.
>
> **The gap, and the evidence for it.** The catalog computes static compression ratio (`displacement-cr`) but nothing
> gives the DYNAMIC (effective) CR from the cam timing. Grep confirmed no dynamic-CR tile. Every cammed engine's pump-gas
> survival hinges on the dynamic CR, not the static. The number this settles: a 10.5 static short block with a 60-degree
> ABDC intake close runs about an **8.69 dynamic CR**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling engine
tile: the bore, stroke, and rod carry `L`, the volumes carry `L^3`, and the static CR, intake-valve-closing angle, and
dynamic CR are dimensionless. The v18/v21 contract: a non-finite or non-positive bore or stroke, a rod at or below the
crank radius (stroke/2), a static CR at or below 1, or an intake-valve-closing angle outside 0 to 180 degrees returns
`{ error }`. Citation discipline (v19/v22): the slider-crank dynamic-CR geometry by name (clearance from the static CR;
piston-from-TDC from the rod and stroke at the IVC angle; DCR = (V_eff + V_clear) / V_clear), `GOVERNANCE.general`; the
note states that dynamic CR measures compression from where the intake valve actually closes so it captures the cam's
effect, that a bigger cam closes the intake later and lowers the DCR, that roughly 7.5 to 8.5 suits pump gas at sea
level, and that the cam's actual seat timing, the octane, and the tune govern.

## 2. The tile

### 2.1 `dynamic-compression-ratio` -- Dynamic Compression Ratio

```
inputs:
  bore_in        cylinder bore (in)
  stroke_in      stroke (in)
  rod_length_in  connecting-rod length, center-to-center (in, > stroke/2)
  static_cr      static compression ratio (> 1)
  ivc_abdc_deg   intake valve closing, degrees after BDC at checking lash (0-180)

r          = stroke_in / 2
V_clear    = (pi/4 x bore_in^2 x stroke_in) / (static_cr - 1)
theta      = (180 - ivc_abdc_deg) degrees from TDC
s          = r + rod_length_in - (r cos theta + sqrt(rod_length_in^2 - r^2 sin^2 theta))
V_eff      = pi/4 x bore_in^2 x s
dynamic_cr = (V_eff + V_clear) / V_clear
```

**Pinned worked example.** 4.030 bore, 3.75 stroke, 6.0 rod, 10.5 static, 60 deg ABDC:
`V_clear = 47.833 / (10.5 - 1) = 5.035 in^3`; piston at IVC `= 3.036 in`, so `V_eff = 38.73 in^3`; `DCR = (38.73 + 5.035)
/ 5.035 = ` **8.69**. Cross-check: swap in a bigger cam that closes the intake at 75 deg ABDC on the same short block and
the DCR falls to **7.69** -- the later intake close bleeds charge back, which is exactly why the big-cam build tolerates
the same static CR on pump gas.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `displacement-cr`); a `tile-meta.js` `_TILES` entry (`K`);
a `citations.js` entry (slider-crank dynamic-CR geometry, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the 60-deg example plus the 75-deg cross-check, pinning the DCR and clearance volume); `test/fixtures/compute-map.js`
(`dynamic-compression-ratio` -> `computeDynamicCompressionRatio`, module `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `displacement-cr` / `chamber-cc-for-cr` / `volumetric-efficiency`);
`data/search/aliases.json` (5 collision-checked aliases: "dynamic compression ratio", "effective compression ratio",
"dcr calculator", "cam and compression pump gas", "intake valve closing compression"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `MECHANIC_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the DCR and clearance volume across two cam timings and the error seams (non-positive bore / stroke, rod <= crank
radius, static CR <= 1, IVC out of range, non-finite). The calc-mechanic.js gzip cap is raised 52000 -> 54000 with a
ledger note. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home
first paint. Home tile count 1,376 -> 1,377.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (cap
raise);  `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((38.73 + 5.035) / 5.035 -> 8.69 dynamic CR).

## 5. Roadmap position

Engine-builder geometry beside `displacement-cr`, serving the engine builder / mechanic (mechanic). Deliberately an
estimate off the geometry; the cam's actual seat timing, the fuel octane, and the tune govern the safe compression.
Stays evidence-driven. Continues the engine-builder sweep at 1 new spec (v928).
