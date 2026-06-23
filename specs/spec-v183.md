# roughlogic.com Specification v183 -- Transformer K-Factor From the Harmonic Spectrum (UL 1561 / IEEE C57.110) (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile computing a transformer K-factor
> from a measured harmonic current spectrum, so an electrician can select a K-rated transformer (K-4,
> K-13, K-20) for a nonlinear load. Adds one tile to **`calc-powerquality.js`** (Group A); no new
> module, group, or dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog now flags triplen neutral current (`triplen-neutral`,
> v173) and motor unbalance derating (`motor-unbalance-derate`, v172), but the transformer feeding a
> nonlinear load has its own number: the K-factor, the harmonic-weighted heating index that decides
> whether a standard K-1 transformer will overheat or a K-13 is required. It is a textbook
> sum-of-squares and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
per-harmonic currents are entered as fractions of the fundamental (`dimensionless`, per-unit) for the
1st, 3rd, 5th, 7th, 9th, 11th, and 13th harmonics; the K-factor is `dimensionless`. The v18/v21
contract: any non-finite input, or a negative fraction, returns `{ error }`; the only division is by
the guarded-positive sum-of-squares denominator (the fundamental fraction must be positive). Citation
discipline (v19/v22): `GOVERNANCE.electrical`, edition `UL 1561 / IEEE C57.110 (transformer K-factor
for nonsinusoidal load currents)`, `editionNote` `NEC_DISCLOSURE`, with the note that
`K = sum(Ih^2 x h^2) / sum(Ih^2)` over the harmonic orders, that the computed value rounds **up** to
the next listed K-rating (K-4, K-9, K-13, K-20, K-30, K-40), and that the spectrum should come from a
power-quality meter at the actual load -- the manufacturer and the measured data govern.

## 2. The tile

### 2.1 `transformer-k-factor` -- K-Factor From a Harmonic Current Spectrum

```
inputs:
  i1, i3, i5, i7, i9, i11, i13   dimensionless   harmonic currents as fractions of fundamental (pu)

num   = sum over h of (Ih^2 x h^2)        # h = 1,3,5,7,9,11,13
den   = sum over h of (Ih^2)
k_factor = num / den
select: round UP to the next standard K-rating (K-4 / K-9 / K-13 / K-20 / K-30 / K-40)
```

**Pinned worked example.** A receptacle-heavy panel spectrum (pu of fundamental): I1 = 1.0,
I3 = 0.33, I5 = 0.20, I7 = 0.14, I9 = 0.09, I11 = 0.06, I13 = 0.05.
`num = 1x1 + 0.33^2x9 + 0.20^2x25 + 0.14^2x49 + 0.09^2x81 + 0.06^2x121 + 0.05^2x169`
`= 1.000 + 0.980 + 1.000 + 0.960 + 0.656 + 0.436 + 0.423 = 5.455`;
`den = 1 + 0.1089 + 0.040 + 0.0196 + 0.0081 + 0.0036 + 0.0025 = 1.183`;
`k_factor = 5.455 / 1.183 = 4.61` -> round up to a **K-9** transformer (the next listed rating above
4.61, since K-4 is exceeded). **Cross-check (nearly linear).** A clean load I1 = 1.0 with only
I3 = 0.05, I5 = 0.03: `num = 1 + 0.0025x9 + 0.0009x25 = 1.045`; `den = 1 + 0.0025 + 0.0009 = 1.0034`;
`k_factor = 1.04` -> a standard **K-1** transformer is adequate. The measured spectrum and the
manufacturer govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, UL 1561 / IEEE C57.110, the K-factor definition and the
standard K-rating ladder listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`transformer-k-factor` -> `computeTransformerKFactor` in `../../calc-powerquality.js`);
`scripts/related-tiles.mjs` (-> `triplen-neutral` / `transformer-kva-sizing` / `motor-unbalance-derate`);
`data/search/aliases.json` ("k factor", "k-rated transformer", "harmonic transformer", "K-13",
"nonlinear load transformer", "UL 1561"); the id appended to the existing `POWERQUALITY_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the receptacle-spectrum example, the near-linear cross-check, and
error seams (non-finite, negative fraction, I1 <= 0). Raise the `calc-powerquality.js` size cap by
~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the near-linear path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
numerator, denominator, K-factor, and selected rating wrap on a phone); render-no-nan + a11y sweep,
output read to the value (receptacle spectrum -> K ~4.61 -> K-9; clean -> K ~1.04 -> K-1).

## 5. Roadmap position

Completes the harmonics family (`triplen-neutral`, `motor-unbalance-derate`) on the transformer side
alongside `transformer-kva-sizing`. Further Group A growth stays evidence-driven.
