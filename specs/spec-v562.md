# roughlogic.com Specification v562 -- Termination Temperature Ampacity Limit (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v561.md.
>
> **The gap, and the evidence for it.** `wire-ampacity` and `ambient-ampacity-adjust` give conductor ampacity and
> derating, but they do not enforce the NEC 110.14(C) termination rule, and that omission is a classic field error.
> Installers size a conductor from the high 90 C column of Table 310.16 -- but the lugs, breakers, and terminals it lands
> on are rated only 60 C or 75 C, and 110.14(C) caps the usable ampacity at the **lowest-rated termination**. The 90 C
> column is allowed **only** for the derating math (ambient and fill adjustments start from it), never for the final
> current the terminations see. The rule also splits by size: at 100 A and below the default is the 60 C column unless
> everything is listed for 75 C; above 100 A the 75 C column is the norm. The tile takes the conductor's ampacities at
> each column, the termination rating, the size class, and the derating factor, and returns the governing ampacity --
> the lesser of the termination column and the derated 90 C value, which is what a conductor can actually carry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ampacities at each
temperature column, the derated value, and the governing ampacity are currents (`I`, in amps); the derating factor and
the size-class and termination selectors are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
ampacity at any column, a derating factor outside `(0, 1]`, or an unrecognized termination rating returns `{ error }`.
Citation discipline (v19/v22): `NEC` over 110.14(C); `editionNote` names **NEC 2023 110.14(C) (temperature limitations)
with Table 310.16**, prints the termination-column ampacity (60 C at or below 100 A unless listed 75 C, else 75 C; 75 C
above 100 A), the derated 90 C value `amp_90 x derate`, and the governing
`min(termination_ampacity, amp_90 x derate)`, and states that **the 90 C column may be used only for the ambient and
fill derating math not for the final termination current, the usable ampacity is capped at the lowest-rated termination
(60 or 75 C), circuits at or below 100 A default to the 60 C column unless all terminations and conductors are listed
for 75 C while circuits above 100 A use 75 C, and the NEC and the equipment listing govern** -- a design aid, not the
AHJ.

## 2. The tile

### 2.1 `termination-temp-ampacity` -- Why You Size From 90 C but Terminate on 60 or 75 C

```
inputs:
  amp_90c            A    conductor ampacity from the 90 C column (Table 310.16)
  amp_75c            A    conductor ampacity from the 75 C column
  amp_60c            A    conductor ampacity from the 60 C column
  termination_rating -    lowest termination rating: 60 or 75 (C)
  over_100a          bool  is the circuit over 100 A?
  derate_factor      -    combined ambient and fill adjustment factor (1.0 if none)

termination_ampacity = over_100a ? amp_75c
                     : termination_rating == 75 ? amp_75c : amp_60c        [A]
derated_90c          = amp_90c x derate_factor                             [A]
governing            = min(termination_ampacity, derated_90c)              [A]
```

**Pinned worked example (4/0 THHN copper: 90 C = 260 A, 75 C = 230 A, 60 C = 195 A; 75 C terminations; over 100 A; four
current-carrying conductors, 0.8 fill derate).** The termination column is 75 C, `230 A`. The derated 90 C value is
`260 x 0.8 = 208 A`. The governing ampacity is `min(230, 208) = ` **208 A** -- here the derating governs, but the
starting point for that derate was correctly the 90 C column. **Cross-check (with no derating, the termination caps
it).** Remove the fill derate (`derate = 1.0`): `derated_90c = 260 A`, but the governing ampacity is still
`min(230, 260) = ` **230 A** -- the 75 C termination caps it at 230, **not** the 260 A of the 90 C column an installer
might wrongly use. The 90 C column never reaches the terminals. The tile returns the termination-column ampacity, the
derated 90 C value, and the governing ampacity.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the derating-governs example + the termination-
caps cross-check); `test/fixtures/compute-map.js` (`termination-temp-ampacity` -> `computeTerminationTempAmpacity` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `wire-ampacity` / `ambient-ampacity-adjust` /
`generator-conductor-445`); `data/search/aliases.json` ("110.14(c)", "termination temperature", "60 75 90 column",
"lug temperature rating", "ampacity termination limit", "90c derating only", "table 310.16 column", "conductor
termination"); the id appended to the electrical renderers declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the termination-column selection by
size and rating, the derated-90C value, the governing minimum, and the error seams (non-finite, non-positive ampacities,
derate out of range, bad termination). Hand-writes its renderer (mirroring the calc-electrical.js `wire-ampacity`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the termination / derated-90C / governing stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the 4/0 example -> 208 A governing).

## 5. Roadmap position

Adds the 110.14(C) termination limit that `wire-ampacity` and `ambient-ampacity-adjust` do not enforce, and pairs with
`generator-conductor-445` (which points here for its termination check). A full Table-310.16-lookup-by-size front end
and a conductor-selection solver (the smallest conductor whose governing ampacity clears a load) are deliberate future
follow-ons. Further Group A growth stays evidence-driven.
