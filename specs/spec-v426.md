# roughlogic.com Specification v426 -- Overflow Scupper Sizing (Weir Flow) (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a drainage-hydraulics trio (v426 overflow scupper -> v427 sewage force-main
> velocity -> v428 stormwater detention volume). `roof-drain-sizing` sizes the primary vertical leader; the secondary
> (overflow) scupper that keeps a blocked roof from ponding to collapse is a weir, sized a different way no tile computes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A secondary roof drain or scupper must pass the design
> rainfall as an emergency overflow when the primary is blocked, and a rectangular scupper is a weir: the Francis formula
> gives `Q = 3.33 * L * H^1.5` (cfs, with `L` and `H` in feet), or the contracted `Q = 3.33 * (L - 0.2*H) * H^1.5`.
> `roof-drain-sizing` handles the primary leader by fixture-unit tables; the overflow weir is a separate calculation. This
> adds the scupper tile to the existing **`calc-drainage.js`** module (Group B); no new group, trade, or dependency.
> Inherits spec.md through spec-v425.md.
>
> **The gap, and the evidence for it.** A `6 in`-wide scupper with `3.5 in` of standing water passes
> `Q = 3.33 * (6/12) * (3.5/12)^1.5 = 0.263 cfs = 118 gpm` by the Francis formula (about `104 gpm` with the end-contraction
> correction), matching the FM Global reference of roughly `114 gpm` for that scupper. A wider `12 in` scupper at only `2 in`
> of head passes `102 gpm`. No tile does this; a plumber sizing an overflow had the primary-drain table but not the weir.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The scupper length and head are
lengths (in, converted to ft); the flow is a volumetric flow (cfs and gpm). The v18/v21 contract: any non-finite input, or a
non-positive length or head, returns `{ error }`; the tile reports the flow both with and without the end-contraction
correction, and the head is measured above the weir crest (the scupper invert). Citation discipline (v19/v22):
`GOVERNANCE.general` over the scupper weir flow by name; `editionNote` names **the Francis weir formula
`Q = 3.33 * L * H^1.5` (cfs, `L`/`H` in ft), the contracted `Q = 3.33 * (L - 0.2*H) * H^1.5`, the IPC 1108 / FM Global 1-54
secondary-drainage context, and the `448.8 gpm per cfs` conversion**, and states that **this returns the overflow scupper
flow for a given head, that the primary drainage is not counted toward the secondary per code, that the head must not exceed
the roof's ponding design depth, and that it is a design aid, not a substitute for the structural roof-load review or the
AHJ**.

## 2. The tile

### 2.1 `overflow-scupper-sizing` -- Overflow Scupper Sizing (Weir Flow)

```
inputs:
  length_in   in   scupper opening width (weir length)
  head_in     in   head of water above the scupper invert

L = length_in/12;  H = head_in/12
q_cfs  = 3.33 * L * H^1.5
q_cfs_contracted = 3.33 * (L - 0.2*H) * H^1.5
q_gpm  = q_cfs * 448.8
```

**Pinned worked example (6 in scupper, 3.5 in head).** `Q = 3.33*(0.5)*(0.2917)^1.5 = 0.263 cfs = 118 gpm`
(`104 gpm` contracted), matching the FM Global reference near `114 gpm`. **Cross-check (wide, shallow scupper).** A `12 in`
scupper at `2 in` head passes `102 gpm` -- more width, less head, similar flow. A non-positive length or head takes the
error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `roof-drain-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Francis scupper weir, `editionNote` naming the standard and contracted
formulas, the IPC 1108 / FM 1-54 context, and the cfs-to-gpm conversion); `test/fixtures/worked-examples.json` (the 6 in
example + the 12 in cross-check); `test/fixtures/compute-map.js` (`overflow-scupper-sizing` ->
`computeOverflowScupperSizing` in `../../calc-drainage.js`); `scripts/related-tiles.mjs` (-> `roof-drain-sizing` /
`rain-load-ponding` / `stormwater-detention-volume` / `weir-flow`); `data/search/aliases.json` ("scupper sizing", "overflow
scupper", "secondary roof drain", "scupper flow", "weir scupper", "roof overflow", "emergency roof drain", "francis weir
scupper", "ponding overflow"); the id appended to the existing drainage renderers block in `app.js`; the `// dims:`
annotation (length/head length, flow volumetric flow); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the contracted-vs-standard flows, and the non-positive / non-finite error seams. No new module;
re-pin `calc-drainage.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the cfs / gpm output wraps on a phone); render-no-nan + a11y
sweep, output read to the value (6 in, 3.5 in -> 118 gpm).

## 5. Roadmap position

Opens the drainage-hydraulics trio: `sewage-force-main-velocity` (v427) and `stormwater-detention-volume` (v428) continue
the drainage sizing theme. A circular-overflow-drain (bowl) weir/orifice mode and a required-scupper-count-from-roof-area
tile are the deliberate next follow-ons.
