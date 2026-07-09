# roughlogic.com Specification v512 -- Roller Chain Length in Pitches (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group K, the shop-mechanical bench); no new module, group, or dependency. Inherits spec.md through spec-v511.md.
>
> **The gap, and the evidence for it.** `vbelt-drive` sizes a belt with wrap geometry, but roller-chain drives -- the
> workhorse of conveyors, machine tools, and power transmission -- have no tile. The chain length in pitches comes from
> the two sprocket tooth counts, the center distance, and the pitch, and the ANSI B29.1 relation has a detail that trips
> people: the pitch count must come out **even**. An odd count forces an offset (half) link, which is weaker and to be
> avoided, so the computed length is rounded **up** to the next even number -- and then, because that rounding changed
> the length, the center distance must be **recomputed** so the chain actually fits with proper sag. That round-up-then-
> back-solve step is the one people skip, ending up with a chain that is too tight or too loose. The tile takes the two
> tooth counts, the center distance, and the pitch, and returns the exact pitch count, the even count to order, and the
> corrected center distance -- the three numbers that make a chain drive assemble cleanly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The center distance,
corrected center distance, and pitch are lengths (`L`, in inches); the tooth counts and the chain length in pitches are
`dimensionless` (counts). The v18/v21 contract: any non-finite input, a tooth count below 1, or a non-positive center
distance or pitch returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the chain-length
relation by name (ANSI B29.1 roller chain and sprockets); `editionNote` names the **ANSI B29.1 chain-length relation**,
prints `L = 2 x (C/p) + (N1 + N2) / 2 + ((N2 - N1) / (2 pi))^2 / (C/p)` in pitches, the round-up to an even
`L_even`, and the corrected center distance
`C = (p/4) x [ A + sqrt(A^2 - 8 x ((N2 - N1) / (2 pi))^2) ]` with `A = L_even - (N1 + N2) / 2`, and states that **the
pitch count must be even because an odd count forces a weaker offset (half) link, the length is rounded up and the
center distance recomputed so the assembled chain has correct sag, the center distance should be at least about 30
pitches for good wrap, and the sprocket selection and take-up govern** -- a design aid, not the manufacturer's chart.

## 2. The tile

### 2.1 `roller-chain-length` -- The Even-Link Round-Up and Corrected Center Distance People Skip

```
inputs:
  small_teeth_n1     -     small sprocket tooth count N1
  large_teeth_n2     -     large sprocket tooth count N2
  center_distance_in in    nominal center distance C
  pitch_in           in    chain pitch p (e.g. 0.5 for #40)

Cp      = center_distance_in / pitch_in
L       = 2 x Cp + (small + large) / 2 + ((large - small) / (2 pi))^2 / Cp        [pitches]  exact
L_even  = round L up to the next even integer                                     [pitches]
A       = L_even - (small + large) / 2
C_corr  = (pitch_in / 4) x ( A + sqrt(A^2 - 8 x ((large - small) / (2 pi))^2) )    [in]       corrected center
```

**Pinned worked example (a 17-tooth to 51-tooth #40 drive, 0.5 in pitch, 30 in center).**
`Cp = 30 / 0.5 = 60`; `L = 2 x 60 + (17 + 51)/2 + ((51 - 17)/(2 pi))^2 / 60 = 120 + 34 + 29.28/60 = ` **154.49
pitches**. Rounded up to an even count that is **156 pitches** to order, and the corrected center distance that puts 156
pitches on the sprockets is `C = ` **30.38 in** -- about 0.38 in more than the nominal 30, the take-up adjustment the
skipped step would have missed. **Cross-check (a tighter center shortens the chain).** Pull the center to `20 in`
(`Cp = 40`): `L = 80 + 34 + 29.28/40 = 114.73`, rounded up to **116 pitches**, corrected center `20.63 in`. The tile
returns the exact pitch count, the even count, and the corrected center distance.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 30 in example + the 20 in
cross-check); `test/fixtures/compute-map.js` (`roller-chain-length` -> `computeRollerChainLength` in
`../../calc-shop.js`); `scripts/related-tiles.mjs` (-> `vbelt-drive` / `bearing-l10-life` / `gear-ratio`);
`data/search/aliases.json` ("roller chain length", "chain pitches", "ansi b29.1", "chain drive length", "even link
chain", "offset link", "sprocket center distance", "chain sizing"); the id appended to the shop renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the round-up-to-even behavior, the corrected center distance recovering the even count, and the error seams
(non-finite, tooth count < 1, non-positive center / pitch). Hand-writes its renderer (mirroring the calc-shop.js
`vbelt-drive` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the exact / even / corrected-center stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 30 in example -> 156 pitches, 30.38 in).

## 5. Roadmap position

Adds chain-drive sizing beside `vbelt-drive` (the belt equivalent). A chain-speed-and-tension companion (the working
load from transmitted power and pitch-line velocity) and a multi-strand / silent-chain variant are deliberate future
follow-ons. Further Group K growth stays evidence-driven.
