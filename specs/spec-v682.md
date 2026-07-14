# roughlogic.com Specification v682 -- Boring Bar Max Overhang for a Deflection Limit (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K,
> machinist / mechanic), no new module, group, or dependency. Inherits spec.md through spec-v681.md.
>
> **The gap, and the evidence for it.** Spec-v318 (`boring-bar-deflection`) runs the cantilever model forward: given an
> overhang, it returns the tip deflection. The setup question a machinist asks is the inverse -- **how far can I stick
> this bar out before the deflection blows the tolerance**. The forward tile makes you guess overhangs and re-read the
> deflection; the inverse solves it directly. From `delta = F L^3 / (3 E I)` with `I = pi d^4 / 64`,
> `L_max = (3 E I delta / F)^(1/3)`. The number this settles: a 0.75 in steel bar under 100 lb held to 15 mil can reach
> **6.0 in** (L/d 8), and a stiffer carbide bar (E 90e6) reaches **8.6 in** for the same deflection -- but the tile also
> flags the L/d against the chatter limit, because past ~4:1 steel / 6-8:1 carbide the chatter limit, not deflection,
> sets a shorter real maximum.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`boring-bar-deflection` sibling: the diameter, the allowable deflection, and the returned overhang are `L` (in), the
cutting force is `M L T^-2` (lb), the modulus is `M L^-1 T^-2` (psi), and the L/d ratio is `dimensionless`. It reuses the
sibling's `I = pi d^4/64` and the default `E = 30e6` psi (steel). The v18/v21 contract: any non-finite input, or a
non-positive diameter / force / allowable deflection / modulus, returns `{ error }`. Citation discipline (v19/v22): the
cantilever deflection relation solved for the overhang, a standard mechanics-of-materials result, by name; the note
states that **deflection is only half the story (the reported L/d must be checked against the ~4:1 steel / 6-8:1 carbide
chatter limit, and if the deflection-limited overhang exceeds it, chatter governs and the real max is the shorter one),
the L^3 law makes this length a hard wall, and this is a static solid-round estimate, not a stability-lobe analysis --
the tool and setup govern**.

## 2. The tile

### 2.1 `boring-bar-max-overhang` -- Boring Bar Max Overhang for a Deflection Limit

```
inputs:
  d_in                     in    bar / tool diameter (> 0)
  f_lb                     lb    radial cutting force (> 0)
  allowable_deflection_in  in    allowable tip deflection (> 0)
  e_psi                    psi   modulus (> 0; 30e6 steel, ~90e6 carbide)

I = pi x d^4 / 64
L_max = (3 x E x I x allowable_deflection / F)^(1/3)   [in]
L/d = L_max / d   (checked against the chatter limit)
```

**Pinned worked example (a steel bar).** d = 0.75 in, F = 100 lb, allowable = 0.01545 in, E = 30e6:
`I = pi x 0.75^4 / 64 = 0.01553 in^4`, `L_max = (3 x 30e6 x 0.01553 x 0.01545 / 100)^(1/3) = ` **6.0 in** (L/d 8, at the
top of the carbide band -- a steel bar would chatter here); feeding 6.0 in back through `boring-bar-deflection` returns
0.01545 in, the input. **Cross-check (a carbide bar).** Same bar and deflection with E = 90e6:
`L_max = 8.6 in` -- three times the modulus lets the tip reach 43% farther (the cube-root of 3), though L/d 11 is now
chatter-limited.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`, beside `boring-bar-deflection`, which sits in the
spec-v317 machining section OUTSIDE the exact-12 `// Group K: Mechanic`..`// Group L` audit block, so no count bump); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (cantilever solved for overhang, `GOVERNANCE.general` matching the
sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`boring-bar-max-overhang` -> `computeBoringBarMaxOverhang` in `../../calc-machining.js`); `scripts/related-tiles.mjs`
(-> `boring-bar-deflection` / `spindle-power-torque` / `radial-chip-thinning` / `feed-for-surface-finish`, and the
forward tile links back); `data/search/aliases.json` ("max overhang for deflection", "how far can i stick out a boring
bar", "overhang limit boring bar", plus adjacent rows); `MACHINING_RENDERERS["boring-bar-max-overhang"]` via a
hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt`
helpers, mirroring `boring-bar-deflection`) and the id added to the calc-machining declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the carbide-reaches-farther check, the round-trip through
`computeBoringBarDeflection`, and the error seams. The calc-machining.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 6.0 in max overhang for a 0.01545 in limit).

## 5. Roadmap position

Pairs the forward deflection tile (`boring-bar-deflection`, deflection from overhang) with its inverse (overhang from a
deflection limit), the two halves of the tool-stickout question. Further Group K growth stays evidence-driven.
