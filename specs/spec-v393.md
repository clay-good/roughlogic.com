# roughlogic.com Specification v393 -- T-Beam Effective Flange Width (ACI 318-19 6.3.2) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a concrete design-details trio (v393 T-beam flange width -> v394 minimum
> flexural steel -> v395 crack-control bar spacing). `rc-beam-flexure` and `rc-doubly-reinforced` assume a rectangular
> section; a monolithic slab-and-beam pour is a T-beam, and its flexural capacity depends first on how much of the slab acts
> as the compression flange -- the effective flange width no tile computes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When a beam is cast monolithically with the slab, part
> of the slab works with it as a T-beam flange, but only the effective width `be` counts. ACI 318-19 §6.3.2.1 limits the
> flange overhang on each side of the web to the least of `8*hf`, half the clear distance to the next web (`sw/2`), and
> `ln/8`; the effective width is `be = bw + 2*overhang` for an interior beam. `rc-beam-flexure` takes the compression width
> as a given rectangular `b`; nothing derives the T-beam `be` that should feed it. This adds the flange-width tile to the
> existing **`calc-concrete.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v392.md.
>
> **The gap, and the evidence for it.** An interior T-beam with a `12 in` web, `4 in` slab, `20 ft` clear span (`ln/8 = 30
> in`), and webs `48 in` clear apart (`sw/2 = 24 in`) has a per-side overhang of `min(8*4 = 32, 24, 30) = 24 in`, so
> `be = 12 + 2*24 = 60 in`. The clear web spacing governs here; a wider spacing would let the span-based `ln/8` or the
> `8*hf` limit control instead. No tile does this; a designer had to look up the three limits and take the least by hand
> before running the flexure check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The web width `bw`, slab
thickness `hf`, clear span `ln`, and clear web spacing `sw` are lengths (in); the effective flange width `be` is a length
(in). The v18/v21 contract: any non-finite input, or a non-positive dimension, returns `{ error }`; the tile defaults to the
interior-beam limits and offers the edge/L-beam and isolated-T-beam variants (whose per-side or total limits differ), and
reports which of the three limits governs. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI T-beam flange
width by name; `editionNote` names **ACI 318-19 §6.3.2.1 Table, the interior-beam per-side overhang as the least of `8*hf`,
`sw/2` (half the clear distance to the adjacent web), and `ln/8`, and `be = bw + 2*overhang`; with the edge-beam limits
(`6*hf`, `sw/2`, `ln/12`) and the isolated-T-beam limits (`bw/2` flange, `4*bw`) noted**, and states that **this returns the
effective flange width that acts as the T-beam compression flange, that it feeds a rectangular-flange flexure check, and
that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `t-beam-effective-flange-width` -- T-Beam Effective Flange Width (ACI 318-19)

```
inputs:
  bw_in    in   web width
  hf_in    in   slab (flange) thickness
  ln_in    in   clear span
  sw_in    in   clear distance to the adjacent web
  beam_type -   interior | edge

interior overhang = min(8*hf_in, sw_in/2, ln_in/8)          be = bw_in + 2*overhang
edge overhang     = min(6*hf_in, sw_in/2, ln_in/12)         be = bw_in + overhang
```

**Pinned worked example (interior: 12 in web, 4 in slab, ln 240 in, sw 48 in).**
per-side overhang `= min(8*4 = 32, 48/2 = 24, 240/8 = 30) = 24 in`; `be = 12 + 2*24 = 60 in` -- the clear web spacing
governs. **Cross-check (an edge beam).** With one flange only, `overhang = min(6*4 = 24, 24, 240/12 = 20) = 20 in` and
`be = 12 + 20 = 32 in`, where `ln/12` governs. A non-positive dimension takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `rc-beam-flexure`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §6.3.2.1, `editionNote` naming the interior, edge, and isolated
limits and `be = bw + 2*overhang`); `test/fixtures/worked-examples.json` (the interior example + the edge cross-check);
`test/fixtures/compute-map.js` (`t-beam-effective-flange-width` -> `computeTBeamEffectiveFlangeWidth` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `rc-doubly-reinforced` /
`concrete-beam-min-flexural-steel` / `rc-slab-min-thickness`); `data/search/aliases.json` ("t-beam flange width",
"effective flange width", "t beam effective width", "aci 6.3.2", "flange overhang", "tee beam flange", "monolithic beam
slab", "compression flange width", "be t-beam"); the id appended to the existing concrete renderers block in `app.js`; the
`// dims:` annotation (all lengths); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the governing-limit switch, and the non-positive / non-finite error seams. No new module; re-pin
`calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the governing-limit assertion, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `be` / governing-limit output wraps
on a phone); render-no-nan + a11y sweep, output read to the value (12/4/240/48 interior -> 60 in, sw/2 governs).

## 5. Roadmap position

Opens the concrete design-details trio: the `be` this tile gives feeds a T-beam flexure check, `concrete-beam-min-flexural-
steel` (v394) sets the lower reinforcement bound for that section, and `concrete-crack-control-spacing` (v395) checks the
bar layout. A full T-beam flexural-capacity tile consuming `be` is the deliberate next follow-on.
