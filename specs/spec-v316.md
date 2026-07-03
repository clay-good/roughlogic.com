# roughlogic.com Specification v316 -- Bolt Combined Tension and Shear (AISC 360 J3.7) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.111.0; proposed 2026-07-02). Batch spec-v314..v316 (the steel beam-column-and-connection depth trio --
> H1 interaction (v314), effective-length K (v315), the bolt under combined tension and shear (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `bolt-shear-bearing` handles pure shear and the
> catalog handles bolt torque and pretension, but a bolt in a bracket, a hanger, or a moment end-plate carries tension and
> shear at once, and AISC J3.7 reduces the available tension for the coincident shear stress -- a check the catalog never
> makes. Adds one tile to the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v315.md.
>
> **The gap, and the evidence for it.** AISC 360 J3.7 reduces the nominal tensile stress of a bolt for the required shear
> stress: `F'nt = 1.3 Fnt - (Fnt/(phi Fnv)) frv <= Fnt` (LRFD, `phi = 0.75`), or `F'nt = 1.3 Fnt - (Omega Fnt/Fnv) frv <= Fnt`
> (ASD, `Omega = 2.00`), where `frv` is the required shear stress on the bolt. The available tension is then `phi F'nt Ab`.
> For a 3/4 in A325 bolt (`Ab = 0.442 in^2`, `Fnt = 90 ksi`, `Fnv = 54 ksi` threads-included) carrying a required shear
> stress of 20 ksi, `F'nt = 1.3 x 90 - (90/(0.75 x 54)) x 20 = 117 - 44.4 = 72.6 ksi`, and the available tension is
> `0.75 x 72.6 x 0.442 = 24.1 kip` -- down from the 29.8 kip the bolt would carry in pure tension, the reduction a straight
> tension check would miss and the reason a heavily-sheared bolt has little tension left. `bolt-shear-bearing` sizes the
> shear; this tile sizes the tension that survives it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nominal tensile and shear
stresses `Fnt`, `Fnv` and the reduced tensile stress `F'nt` are stresses (ksi); the required shear stress `frv` is a stress
(ksi); the bolt area `Ab` is an area (in^2); the available tension is a force (kip). The v18/v21 contract: any non-finite
input, or a stress or area at or below zero, returns `{ error }`; `F'nt` is capped at `Fnt` (no benefit when shear is
absent) and floored at zero. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 J3.7 combined-force
provisions by name; `editionNote` names **the AISC 360-22 J3.7 reduced tensile stress
`F'nt = 1.3 Fnt - (Fnt/(phi Fnv)) frv <= Fnt` (LRFD, `phi = 0.75`) / `1.3 Fnt - (Omega Fnt/Fnv) frv <= Fnt` (ASD,
`Omega = 2.00`), the available tension `phi F'nt Ab`, and the Table J3.2 `Fnt`/`Fnv` values (A325/F1852: `Fnt = 90`,
`Fnv = 54` threads-N / 68 threads-X ksi)**, and states that **this returns the reduced bolt tension capacity in a bearing-
type connection under combined tension and shear -- it takes the required shear stress `frv` as entered (`= required shear/Ab`),
uses the bearing-type interaction (a slip-critical joint reduces the slip resistance instead, J3.9), and does not check the
bolt shear/bearing itself (`bolt-shear-bearing`) or the connected-element limit states; and this is a design aid, not a
substitute for the engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-bolt-tension-shear` -- Bolt Combined Tension and Shear (AISC 360 J3.7)

```
inputs:
  Fnt_ksi   ksi    nominal tensile stress (90 A325)
  Fnv_ksi   ksi    nominal shear stress (54 N / 68 X, A325)
  Ab_in2    in^2   nominal bolt area
  frv_ksi   ksi    required shear stress = required shear / Ab
  method    -      LRFD | ASD

k = (method == LRFD) ? (Fnt_ksi/(0.75*Fnv_ksi)) : (2.00*Fnt_ksi/Fnv_ksi)
Fpnt = min(1.3*Fnt_ksi - k*frv_ksi, Fnt_ksi)              ; reduced tensile stress, ksi (>= 0)
avail_tension = (method == LRFD) ? 0.75*Fpnt*Ab_in2 : (Fpnt*Ab_in2)/2.00   ; kip
```

**Pinned worked example (a 3/4 in A325 bolt, threads included, 20 ksi required shear, LRFD).** `Fnt = 90`, `Fnv = 54`,
`Ab = 0.442`, `frv = 20`: `F'nt = 1.3 x 90 - (90/(0.75 x 54)) x 20 = 117 - 2.222 x 20 = 117 - 44.4 = 72.6 ksi` (below the
90 ksi cap); available tension `= 0.75 x 72.6 x 0.442 = 24.1 kip`. **Cross-check (no shear on the bolt).** `frv = 0`:
`F'nt = 1.3 x 90 = 117`, capped at `Fnt = 90 ksi`, so available tension `= 0.75 x 90 x 0.442 = 29.8 kip` -- the full
tension capacity, confirming the `<= Fnt` cap removes the `1.3` benefit when shear is absent. The non-finite and
non-positive error paths bracket the result, and `F'nt` floors at zero for a bolt fully utilized in shear.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching `bolt-shear-bearing`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 J3.7 provisions, `editionNote` naming the LRFD
and ASD `F'nt` forms, the `Fnt`/`Fnv` values, the `<= Fnt` cap, and the bearing-type, enter-frv, not-slip-critical caveats);
`test/fixtures/worked-examples.json` (the combined example + the no-shear cross-check); `test/fixtures/compute-map.js`
(`steel-bolt-tension-shear` -> `computeSteelBoltTensionShear` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (->
`bolt-shear-bearing` / `steel-bolt-slip-critical` / `bolt-group-eccentric` / `steel-h1-interaction`);
`data/search/aliases.json` ("bolt tension shear", "combined tension shear bolt", "AISC J3.7", "F prime nt", "reduced bolt
tension", "bolt interaction", "bracket bolt", "moment end plate bolt", "tension shear interaction"); the id appended to the
existing steel renderers block in `app.js`; the `// dims:` annotation (stresses stress, `Ab` area, tension force);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `<= Fnt` cap, the zero
floor, the LRFD/ASD branch, and the non-positive / non-finite error seams. No new module; re-pin `calc-steel.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the cap and floor assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `F'nt` / available-tension pair
wraps on a phone); render-no-nan + a11y sweep, output read to the value (3/4 A325, 20 ksi shear -> 24.1 kip tension).

## 5. Roadmap position

Closes the steel beam-column-and-connection depth batch (v314..v316) in `calc-steel.js`: the H1 member interaction, the
effective-length K, and the bolt tension-shear interaction round out the beam-column and connection checks. The slip-
critical combined tension-and-shear (J3.9) reduction, a bolt-group tension-plus-shear (prying + J3.7) tile, and the
threads-excluded (X) shear values as a toggle are the deliberate next follow-ons once the trio lands.
