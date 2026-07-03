# roughlogic.com Specification v318 -- Boring Bar / Tool Overhang Deflection and L/D Chatter Limit (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.112.0; proposed 2026-07-02). Batch spec-v317..v319 (the machining depth trio -- radial chip thinning
> (v317), boring-bar deflection (this spec), ballnose scallop (v319)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes cutting power and surface finish
> but nothing predicts the deflection of a boring bar or an end mill sticking out of the holder -- the cantilever bending
> that pushes the tool off the cut, blows the bore diameter, and, past a length-to-diameter ratio, chatters. Adds one tile
> to the existing **`calc-machining.js`** module (Group K); no new group, trade, or dependency. Inherits spec.md through
> spec-v317.md.
>
> **The gap, and the evidence for it.** A tool overhanging the holder by `L` is a cantilever: the deflection under the
> cutting force `F` is `delta = F L^3 / (3 E I)` with `I = pi d^4 / 64` for a round bar, and the length-to-diameter ratio
> `L/d` sets the chatter risk (a steel bar is stable to about `4:1`, a carbide bar to `6:1` to `8:1`). For a 0.75 in steel
> boring bar overhung 6 in (`L/d = 8`, past the steel limit) under a 100 lb cutting force, `I = pi x 0.75^4/64 = 0.0155 in^4`
> and `delta = 100 x 6^3 / (3 x 30e6 x 0.0155) = 0.0155 in` -- fifteen thousandths of push-off, enough to taper the bore and
> invite chatter. Shorten the overhang to 3 in (`L/d = 4`) and the deflection drops to `0.0019 in` (the `L^3` law), a
> stable cut. The power tile sizes the motor; this tile sizes the overhang.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bar diameter `d` and
overhang `L` are lengths (in); the cutting force `F` is a force (lb); the modulus `E` is a stress (psi, default 30e6 steel,
selectable ~90e6 for carbide); the second moment `I` is a length^4 (in^4); the deflection `delta` is a length (in); the
`L/d` ratio is dimensionless. The v18/v21 contract: any non-finite input, or a diameter, length, force, or modulus at or
below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the cantilever-deflection model by
name; `editionNote` names **the cantilever tip deflection `delta = F L^3/(3 E I)` with `I = pi d^4/64` for a round bar, the
default `E = 30e6 psi` (steel) / ~90e6 (solid carbide), and the practical `L/d` overhang limits (~4:1 steel, ~6:1 to 8:1
carbide, higher with heavy-metal or damped bars)**, and states that **this returns the static cantilever deflection and the
`L/d` chatter-risk ratio -- it models the tool as a uniform solid round cantilever under a tip point load (a stepped or
hollow bar changes `I`; a real cut also has a dynamic/regenerative-chatter component this static estimate does not capture),
uses the entered cutting force (from `spindle-power-torque` or the cut), and is an estimate, not a stability-lobe analysis;
and this is a shop aid** -- the tool and setup govern.

## 2. The tile

### 2.1 `boring-bar-deflection` -- Boring Bar / Tool Overhang Deflection and L/D Limit

```
inputs:
  d_in    in    bar (tool) diameter
  L_in    in    overhang length from the holder
  F_lb    lb    radial cutting force
  E_psi   psi   modulus (default 30e6 steel; ~90e6 carbide)

I = pi * d_in^4 / 64                         ; second moment of area, in^4
delta = F_lb * L_in^3 / (3 * E_psi * I)      ; tip deflection, in
LD = L_in / d_in                             ; length-to-diameter ratio
verdict: LD <= 4 stable(steel) ; <= 8 carbide-territory ; > 8 chatter-prone
```

**Pinned worked example (a 0.75 in steel boring bar, 6 in overhang, 100 lb force).** `d = 0.75`, `L = 6`, `F = 100`,
`E = 30e6`: `I = pi x 0.75^4/64 = 0.0155 in^4`; `delta = 100 x 216 / (3 x 30e6 x 0.0155) = 21,600 / 1,397,700 = 0.0155 in`;
`L/d = 8`, past the ~4:1 steel limit and into chatter territory. **Cross-check (halve the overhang to 3 in).**
`delta = 100 x 27 / 1,397,700 = 0.0019 in` -- one-eighth the deflection (`L^3`), and `L/d = 4`, a stable steel setup; the
overhang, not the force, dominates, which is why "choke up on the tool" is the first fix for chatter. The non-finite and
non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist","mechanic"]`, matching the machining tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the cantilever model, `editionNote` naming
`delta = F L^3/(3 E I)`, `I = pi d^4/64`, the `E` values, the `L/d` limits, and the solid-round, static-only,
not-stability-lobe caveats); `test/fixtures/worked-examples.json` (the 6 in example + the 3 in cross-check);
`test/fixtures/compute-map.js` (`boring-bar-deflection` -> `computeBoringBarDeflection` in `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `spindle-power-torque` / `radial-chip-thinning` / `material-removal-rate` /
`turning-surface-finish`); `data/search/aliases.json` ("boring bar deflection", "tool overhang", "L/D ratio", "chatter",
"boring bar chatter", "cantilever tool deflection", "stickout", "end mill deflection", "tool deflection"); the id appended
to the existing machining renderers block in `app.js`; the `// dims:` annotation (`d`/`L`/`delta` length, `F` force, `E`
stress, `I` length^4, `LD` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the `L^3` scaling, the `L/d` verdict bands, and the non-positive / non-finite error seams. No new module; re-pin
`calc-machining.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `L^3` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `I` / `delta` / `L/d` stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (0.75 in, 6 in overhang -> 0.0155 in, L/d 8).

## 5. Roadmap position

Middle of the machining depth batch (v317..v319) in `calc-machining.js`, adding tool-deflection prediction beside power and
finish. The ballnose scallop (v319) follows. A hollow/heavy-metal-bar `I`, a natural-frequency and stability-lobe estimate,
and a bore-taper prediction from the deflection are the deliberate next follow-ons once the trio lands.
