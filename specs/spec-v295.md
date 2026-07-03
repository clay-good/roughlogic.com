# roughlogic.com Specification v295 -- Fillet Weld Size Limits and Effective Throat (AISC 360 J2.2b) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.104.0; proposed 2026-07-02). Batch spec-v293..v295 (the steel connection/detailing depth trio -- web
> local strength (v293), the slip-critical bolt (v294), the fillet-weld size limits (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `fillet-weld-strength` computes the strength of a
> weld of a given size, but it never tells the fabricator what size the code allows -- the minimum leg from the thinner
> part joined, the maximum leg along an edge, the effective throat, and the minimum length. These J2.2b detailing limits
> are what a welder or detailer checks before the strength calc even applies. Adds one tile to the existing
> **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v294.md.
>
> **The gap, and the evidence for it.** AISC 360 Table J2.4 sets the minimum fillet weld leg by the thickness of the thinner
> part joined -- 1/8 in for material up to 1/4 in, 3/16 in over 1/4 to 1/2 in, 1/4 in over 1/2 to 3/4 in, 5/16 in over
> 3/4 in -- so the weld cools slowly enough not to crack; J2.2b sets the maximum leg along an edge as the material thickness
> for parts under 1/4 in, or the thickness less 1/16 in for parts 1/4 in and thicker, so the edge is not melted away. The
> effective throat of an equal-leg fillet is `te = 0.707 w`, and the minimum length of a fillet used to transmit load is
> `4 w`. Joining a 1/2 in plate to a 3/8 in plate, the thinner 3/8 in part sets a 3/16 in minimum leg, its edge caps the leg
> at `3/8 - 1/16 = 5/16 in`, and a chosen 1/4 in weld has a `0.177 in` throat and a 1 in minimum length -- the numbers a
> welding procedure is written to, and the ones `fillet-weld-strength` assumes you already picked.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The thicknesses of the parts
joined `t1`, `t2`, the chosen weld leg `w`, the effective throat `te`, and the minimum weld length are lengths (in); the
minimum and maximum permitted legs are lengths (in). The v18/v21 contract: any non-finite input, a thickness or leg at or
below zero, or a chosen leg outside the min/max window (flagged, not necessarily an error) is handled; a non-finite or
non-positive input returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 J2.2b fillet-
weld provisions by name; `editionNote` names **the AISC 360-22 Table J2.4 minimum fillet size by thinner-part thickness
(1/8, 3/16, 1/4, 5/16 in), the J2.2b maximum size along an edge (`t` for `t < 1/4 in`, `t - 1/16 in` for `t >= 1/4 in`),
the effective throat `te = 0.707 w` for an equal-leg fillet, and the 4w minimum length**, and states that **this returns the
detailing size limits and geometry of an equal-leg fillet weld -- it is not the weld strength (`fillet-weld-strength`),
assumes an equal-leg fillet on connected material (not a skewed-tee or PJP groove), uses the along-an-edge maximum (an
interior fillet away from an edge is not edge-limited), and does not cover the minimum-size-based-on-thicker-part or the
prequalified WPS details; and this is a fabrication aid, not a substitute for the welding engineer and the AWS D1.1 WPS** --
the welding procedure and the engineer of record govern.

## 2. The tile

### 2.1 `steel-fillet-weld-size` -- Fillet Weld Size Limits and Effective Throat (AISC 360 J2.2b)

```
inputs:
  t1_in    in    thickness of part 1
  t2_in    in    thickness of part 2
  w_in     in    chosen weld leg (optional; for throat/length + window check)

t_thin = min(t1_in, t2_in)
min_leg = (t_thin <= 0.25) ? 0.125
        : (t_thin <= 0.50) ? 0.1875
        : (t_thin <= 0.75) ? 0.25
        : 0.3125                                   ; Table J2.4 minimum leg, in
edge_t  = t_thin                                    ; the edge the weld runs along (thinner governs here)
max_leg = (edge_t < 0.25) ? edge_t : (edge_t - 0.0625)   ; J2.2b maximum leg along an edge, in
te      = 0.707 * w_in                              ; effective throat (equal leg), in
min_len = 4 * w_in                                  ; minimum load-carrying length, in
in_window = (w_in >= min_leg) AND (w_in <= max_leg) ; chosen-leg compliance flag
```

**Pinned worked example (a 1/2 in plate to a 3/8 in plate, chosen 1/4 in weld).** `t1 = 0.5`, `t2 = 0.375`, `w = 0.25`:
`t_thin = 0.375`; `min_leg = 3/16 = 0.1875 in` (0.375 is over 1/4 to 1/2); `max_leg = 0.375 - 0.0625 = 0.3125 = 5/16 in`;
the chosen `1/4 in` leg is within `[3/16, 5/16]`, so it complies; `te = 0.707 x 0.25 = 0.177 in`; `min_len = 4 x 0.25 = 1.0 in`.
**Cross-check (thin 3/16 in sheet to 3/16 in).** `t1 = t2 = 0.1875`: `t_thin = 0.1875`; `min_leg = 1/8 = 0.125 in`
(0.1875 is under 1/4); `max_leg = 0.1875 in` (the full thickness, since the edge is under 1/4 in), so a 3/16 in weld is the
largest allowed and a 1/8 in weld the smallest -- the whole window is narrow on thin material, and the `t - 1/16` rule does
not apply below 1/4 in. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching `fillet-weld-strength`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 J2.2b/Table J2.4 provisions, `editionNote`
naming the minimum-leg table, the `t - 1/16` maximum, `te = 0.707 w`, the 4w length, and the equal-leg, edge-limited,
not-strength caveats); `test/fixtures/worked-examples.json` (the 1/2-to-3/8 example + the thin-sheet cross-check);
`test/fixtures/compute-map.js` (`steel-fillet-weld-size` -> `computeSteelFilletWeldSize` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `fillet-weld-strength` / `groove-weld-strength` / `weld-group-eccentric` /
`weld-metal-volume`); `data/search/aliases.json` ("minimum fillet weld size", "maximum fillet size", "weld leg size",
"effective throat", "AISC J2.4", "weld size table", "minimum weld length", "0.707 throat", "what size weld"); the id
appended to the existing steel renderers block in `app.js`; the `// dims:` annotation (all lengths in, flags dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the four min-leg thickness
brackets, the `<1/4` vs `>=1/4` max-leg branch, the throat and length formulas, and the non-positive / non-finite error
seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the min/max bracket assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `min_leg` / `max_leg` / `te` /
`min_len` stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (1/2 to 3/8 -> 3/16 to 5/16 in
window, 0.177 in throat).

## 5. Roadmap position

Closes the steel connection/detailing depth batch (v293..v295) in `calc-steel.js`: the web checks, the slip-critical bolt,
and now the weld detailing limits round out the connection side beside the weld/bolt strength tiles. The minimum-size-based-
on-thicker-part alternative, the skewed-tee effective throat (dihedral-angle factor), and a PJP groove effective-throat
tile are the deliberate next follow-ons once the trio lands.
