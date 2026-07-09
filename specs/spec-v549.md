# roughlogic.com Specification v549 -- Collector / Drag Strut Axial Force (calc-lateral.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lateral.js`**
> (Group E, the lateral-systems bench); no new module, group, or dependency. Inherits spec.md through spec-v548.md.
>
> **The gap, and the evidence for it.** `diaphragm-shear` computes the unit shear and chord force but explicitly leaves
> collectors out of scope, and the bench has no tile for them. A collector (drag strut) gathers the diaphragm shear over
> the length where there is no shear wall -- across a door or window opening, or a re-entrant corner -- and drags it back
> to the wall that resists it. The catch is twofold. The collector force **accumulates** along its length and peaks
> where the resisting wall begins, so it is a separate load path from the chord, sized for a different force. And in high
> seismic, ASCE 7 Section 12.10.2.1 requires the collector, its splices, and its connections to be designed for the
> **overstrength** force (`Omega0` amplified), a factor the chord does not carry -- miss it and the collector connection
> is badly under-designed. The tile takes the diaphragm unit shear, the collector length back to the wall, and the
> overstrength factor, and returns the accumulated collector force with and without overstrength -- the axial demand the
> drag strut and its connections are sized for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The diaphragm unit shear
is a line load (`M T^-2`, in plf); the collector length is a length (`L`, in ft); the collector force is a force
(`M L T^-2`, in lb); the overstrength factor is `dimensionless`. The v18/v21 contract: any non-finite input, a non-
positive unit shear or collector length, or an overstrength factor below 1 returns `{ error }`. Citation discipline
(v19/v22): `ASCE` over Section 12.10; `editionNote` names **ASCE 7-22 Section 12.10.1 / 12.10.2 (collectors and drag
struts)**, prints `collector_force = unit_shear x collector_length` and the overstrength demand
`collector_force_omega = Omega0 x collector_force`, and states that **the collector force accumulates along its length
and peaks where the resisting wall begins (a separate load path from the chord), Section 12.10.2.1 requires the
collector and its splices and connections to be designed for the Omega0 overstrength force in the applicable seismic
design categories, the diaphragm may be flexible or rigid (which changes the shear distribution feeding this), and the
engineer of record governs** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `diaphragm-collector-force` -- The Accumulating Drag-Strut Force `diaphragm-shear` Leaves Out

```
inputs:
  unit_shear_plf     plf   diaphragm unit shear v along the collector line
  collector_len_ft   ft    length the collector drags shear back to the resisting wall (Lc)
  omega0             -     overstrength factor (2.5 typical; 1.0 to skip)

collector_force_lb       = unit_shear_plf x collector_len_ft          [lb]   accumulated at the wall end
collector_force_omega_lb = omega0 x collector_force_lb                [lb]   overstrength demand (12.10.2.1)
```

**Pinned worked example (a 300 plf diaphragm shear dragged 40 ft to the shear wall).** The collector force accumulates
to `300 x 40 = ` **12,000 lb** of axial tension or compression at the point where the wall starts -- a strut-and-
connection demand entirely separate from the diaphragm chord. **Cross-check (high seismic adds overstrength).** In a
seismic design category where Section 12.10.2.1 applies, the collector and its connections must carry the overstrength
force `Omega0 x = 2.5 x 12,000 = ` **30,000 lb** -- two and a half times the strength-level force, the amplification the
chord never sees and the one that governs the splice hardware. The tile returns the accumulated collector force and its
overstrength value.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`ASCE`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the strength-level example +
the overstrength cross-check); `test/fixtures/compute-map.js` (`diaphragm-collector-force` ->
`computeDiaphragmCollectorForce` in `../../calc-lateral.js`); `scripts/related-tiles.mjs` (-> `diaphragm-shear` /
`shearwall-overturning` / `diaphragm-chord`); `data/search/aliases.json` ("collector force", "drag strut", "diaphragm
collector", "asce 7 12.10", "overstrength collector", "omega0 collector", "drag strut force", "shear transfer"); the id
appended to the lateral renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the v x Lc accumulation, the Omega0 amplification, and the error
seams (non-finite, non-positive shear / length, omega0 < 1). Hand-writes its renderer (mirroring the calc-lateral.js
`diaphragm-shear` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the collector-force / overstrength stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 40 ft example -> 12,000 lb, 30,000 lb with Omega0).

## 5. Roadmap position

Fills the collector load path `diaphragm-shear` explicitly excludes, completing the diaphragm-to-wall force transfer
beside `shearwall-overturning`. A sub-diaphragm / re-entrant-corner collector accumulation and a collector-splice
capacity check are deliberate future follow-ons. Further Group E growth stays evidence-driven.
