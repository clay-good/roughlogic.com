# roughlogic.com Specification v706 -- Pile Embedment Length for a Target Capacity (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E,
> geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v705.md. First tile of the sweep-9
> inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `pile-axial-capacity` tile runs the alpha method forward: from an
> embedded length it returns the allowable axial capacity. The design question is the inverse -- **how long must the pile
> be to carry a target load**. From `Qult = alpha cu (pi D L) + 9 cu (pi D^2/4)` and `Qall = Qult / FS`, the tip term
> `Qp = 9 cu (pi D^2/4)` is fixed by the diameter, so the skin friction must supply `Qall x FS - Qp`, giving
> `L = (Qall x FS - Qp) / (alpha cu pi D)`. The number this settles: a 16 in pile in cu = 1 ksf clay carrying **50 kip**
> at FS 3 needs **~60 ft** of embedment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pile-axial-capacity` sibling: the diameter and length are `L` (ft), cu is `M L^-1 T^-2` (ksf), the capacities are
`M T^-2` (kip), and alpha and FS are dimensionless. The v18/v21 contract: any non-finite input, a non-positive target
capacity, diameter, cu, or FS, or an alpha outside (0, 1] returns `{ error }`; additionally, if the end bearing alone
already meets the ultimate demand (so the required length is non-positive) the tile returns an explanatory `{ error }`
rather than a meaningless zero/negative length. Citation discipline (v19/v22): the alpha-method capacity solved for the
embedment, `GOVERNANCE.general` matching the sibling, citing the FHWA driven-pile manual and Das; the note states that
**this is a single straight-shaft pile in one uniform cohesive layer by the total-stress method -- no beta method for
sand, group efficiency, negative skin friction, uplift, or driving capacity -- and the geotechnical engineer of record
and, where required, a load test govern**.

## 2. The tile

### 2.1 `pile-length-for-capacity` -- Pile Embedment Length for a Target Capacity (Alpha Method)

```
inputs:
  qall_target_kip   M T^-2        target allowable axial capacity (> 0)
  d_ft              L             pile diameter (> 0)
  cu_ksf            M L^-1 T^-2   undrained shear strength (> 0)
  alpha             dimensionless adhesion factor (over 0, up to 1, default 0.55)
  fs                dimensionless factor of safety (> 0, default 3)

qult   = qall_target_kip x fs
Qp     = 9 x cu_ksf x (pi x d_ft^2 / 4)
Qs_req = qult - Qp                        (must be > 0)
L      = Qs_req / (alpha x cu_ksf x pi x d_ft)
```

**Pinned worked example.** Qall = 50 kip, D = 1.333 ft, cu = 1 ksf, alpha = 0.55, FS = 3:
`qult = 150 kip`, `Qp = 9 x 1 x pi x 1.333^2/4 = 12.57 kip`, `Qs_req = 137.4 kip`,
`L = 137.4 / (0.55 x 1 x pi x 1.333) = ` **59.7 ft**; feeding a 59.7 ft length (same D/cu/alpha/FS) back through
`pile-axial-capacity` returns a 50 kip allowable, the input. A short, fat, high-cu pile whose tip alone meets the demand
is flagged (no skin friction is needed, but a real pile still needs minimum embedment).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `pile-axial-capacity` (Group E is
un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (alpha-method capacity solved for the embedment,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`pile-length-for-capacity` -> `computePileLengthForCapacity`); `scripts/related-tiles.mjs`
(-> `pile-axial-capacity` / `helical-pile` / `pile-group-efficiency` / `soil-bearing-capacity`);
`data/search/aliases.json` (5 collision-checked question aliases: "how long a pile for 50 kip", "how deep to drive a
friction pile", ...); the calc-geotech `GEOTECH_RENDERERS` map entry via the shared `_simpleRenderer` factory (five number
fields) and the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computePileAxialCapacity` across a target/diameter/cu sweep, the higher-target-longer-pile
monotonicity, the tip-alone-suffices rejection, and the error seams. The calc-geotech.js gzip cap is raised 18000 ->
20000 B (this queue adds several geotech inverse tiles; the module was at 97.6%). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,154 -> 1,155.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 59.7 ft for a 50 kip target in cu = 1 ksf clay).

## 5. Roadmap position

Pairs the forward alpha-method tile (`pile-axial-capacity`, capacity from a length) with its inverse (length from a target
capacity), the two halves of the friction-pile-sizing question. Opens the sweep-9 inverse queue; further Group E
geotechnical growth stays evidence-driven.
