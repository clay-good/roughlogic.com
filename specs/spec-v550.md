# roughlogic.com Specification v550 -- Crane Outrigger Reaction from Lift Geometry (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v549.md.
>
> **The gap, and the evidence for it.** `crane-ground-bearing` computes the ground pressure under an outrigger, but it
> asks for the outrigger **load** as an input -- and the bench has no tile that derives it. That is the number riggers
> get wrong. The maximum outrigger reaction is not simply a quarter of the total weight: when the boom swings over a
> **corner** of the outrigger footprint, the overturning moment from the load at radius concentrates into the single
> diagonal outrigger, which can carry well over half the total. Size the crane mat from an even quarter-share and the mat
> under the worst corner is badly undersized. The tile takes the gross load, the counterweight and their radii, and the
> outrigger spread, and returns the net overturning moment and the estimated maximum single-outrigger reaction over the
> corner -- the load `crane-ground-bearing` then turns into a mat pressure. It is a planning estimate; the crane load-
> moment chart governs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The gross load,
counterweight, even share, and outrigger reaction are forces (weights, `M L T^-2`, in kip); the load and counterweight
radii and the outrigger spread are lengths (`L`, in ft); the overturning moment is `M L^2 T^-2` (in kip-ft). The v18/v21
contract: any non-finite input, a non-positive gross load, radius, or outrigger spread, or a negative counterweight
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the reaction relations by name (crane
load-moment method; SAE J1063 stability); `editionNote` names the **crane outrigger reaction (over-corner estimate)**,
prints the even share `(W + Wc) / 4`, the net overturning `M = W x R - Wc x Rc`, and the over-corner maximum
`R_max = (W + Wc) / 4 + M / (sqrt(2) x spread)`, and states that **the maximum reaction is not a quarter of the total
because swinging the boom over a corner concentrates the overturning into one diagonal outrigger (which can carry well
over half the load), a wider outrigger spread lowers the reaction, this is a planning estimate that feeds crane-ground-
bearing, and the crane manufacturer's load-moment chart and outrigger reaction data govern** -- a planning estimate, not
the crane rating.

## 2. The tile

### 2.1 `crane-outrigger-reaction` -- The Per-Outrigger Load `crane-ground-bearing` Asks For but Never Derives

```
inputs:
  gross_load_kip     kip   total suspended load (including rigging)
  counterweight_kip  kip   crane upper/counterweight
  load_radius_ft     ft    load radius R
  cw_radius_ft       ft    counterweight radius Rc
  outrigger_spread_ft ft   outrigger footprint side (center to center)

even_share    = (gross_load_kip + counterweight_kip) / 4                                       [kip]
overturning   = gross_load_kip x load_radius_ft - counterweight_kip x cw_radius_ft             [kip-ft]
reaction_max  = even_share + overturning / (sqrt(2) x outrigger_spread_ft)                     [kip]
```

**Pinned worked example (a 40 kip load at 30 ft, 30 kip counterweight at 12 ft, 20 ft outrigger spread).** The static
even share is `(40 + 30) / 4 = 17.5 kip`, but the net overturning is `40 x 30 - 30 x 12 = 1,200 - 360 = 840 kip-ft`, and
over the corner that adds `840 / (sqrt(2) x 20) = 29.7 kip`, so the worst outrigger reaction is
`17.5 + 29.7 = ` **47.2 kip** -- nearly triple the even quarter-share, and the number the corner mat must actually
carry. **Cross-check (a wider spread lowers the reaction).** Extend the outriggers to a `30 ft` spread:
`R_max = 17.5 + 840 / (sqrt(2) x 30) = 17.5 + 19.8 = ` **37.3 kip** -- 10 kip lighter on the worst corner, the payoff of
fully extending the outriggers. The tile returns the even share, the overturning moment, and the maximum outrigger
reaction.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 20 ft example + the 30 ft
cross-check); `test/fixtures/compute-map.js` (`crane-outrigger-reaction` -> `computeCraneOutriggerReaction` in
`../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `crane-ground-bearing` / `crane-net-capacity` /
`crane-lift-quick`); `data/search/aliases.json` ("outrigger reaction", "crane outrigger load", "over corner outrigger",
"crane mat load", "outrigger pad force", "crane overturning", "maximum outrigger", "boom over corner"); the id appended
to the rigging renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the even-share, the overturning moment, the over-corner
concentration falling with a wider spread, and the error seams (non-finite, non-positive load / radius / spread,
negative counterweight). Hand-writes its renderer (mirroring the calc-rigging.js `crane-ground-bearing` pattern). Lazy-
loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the even-share / overturning / reaction stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the 20 ft example -> 47.2 kip).

## 5. Roadmap position

Derives the outrigger load that `crane-ground-bearing` takes as an input, completing the load-to-mat-pressure chain with
`crane-net-capacity`. A boom-azimuth sweep (the reaction as the boom rotates through the footprint) and an asymmetric
(rectangular) outrigger footprint are deliberate future follow-ons. Further Group Z growth stays evidence-driven.
