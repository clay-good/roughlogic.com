# roughlogic.com Specification v387 -- Darcy Friction Factor (Swamee-Jain / Colebrook) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.136.0; proposed 2026-07-03). First tile of a water-system hydraulics trio (v387 friction factor -> v388 thrust block
> -> v389 hydrant available flow). `reynolds-number-pipe` classifies the flow regime and `friction-loss` reports a head
> loss, but neither exposes the Darcy friction factor `f` itself -- the dimensionless number every Darcy-Weisbach pressure-
> drop and pump-head calculation turns on.**
> In-scope catalog expansion under the spec-v106 trades-only charter. `reynolds-number-pipe` stops at the Reynolds number;
> to get a Darcy-Weisbach head loss you still need the friction factor `f`, which comes from the implicit Colebrook-White
> equation. The Swamee-Jain explicit fit `f = 0.25 / [log10(eps/(3.7 D) + 5.74 / Re^0.9)]^2` reproduces Colebrook within
> about 1% for turbulent flow, with the laminar branch `f = 64/Re`. This adds the friction-factor tile to the existing
> **`calc-hvac.js`** module (Group C), beside `reynolds-number-pipe`; no new group, trade, or dependency. Inherits spec.md
> through spec-v386.md.
>
> **The gap, and the evidence for it.** For turbulent water in commercial steel at `Re = 100,000` and relative roughness
> `eps/D = 0.0003`, `f = 0.25 / [log10(0.0003/3.7 + 5.74/100000^0.9)]^2 = 0.0195` -- the value you read off a Moody chart.
> In the laminar regime at `Re = 1500`, roughness drops out and `f = 64/1500 = 0.0427`. No tile returns `f`; `friction-loss`
> gives a Hazen-Williams head loss but never the Darcy factor a fundamentals-based Darcy-Weisbach calculation needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The Reynolds number and the
relative roughness `eps/D` are dimensionless; the Darcy friction factor is dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive Reynolds number or negative relative roughness, returns `{ error }`; the tile uses the
laminar `f = 64/Re` for `Re < 2300`, the Swamee-Jain turbulent fit for `Re >= 4000`, and flags the `2300 to 4000`
transitional band as indeterminate (reporting the turbulent estimate with a caveat). Citation discipline (v19/v22):
`GOVERNANCE.general` over the Darcy friction factor by name; `editionNote` names **the Colebrook-White implicit relation,
the Swamee-Jain explicit fit `f = 0.25/[log10(eps/(3.7D) + 5.74/Re^0.9)]^2` (valid `Re` 5e3 to 1e8, `eps/D` 1e-6 to 1e-2,
within about 1% of Colebrook), the laminar `f = 64/Re`, and `eps/D` the relative pipe roughness**, and states that **this
returns the Darcy (not Fanning, which is one-fourth) friction factor for a Darcy-Weisbach head loss, that `eps/D` comes from
a pipe-material roughness table, and that it is a design aid, not a substitute for a measured roughness or the Moody chart**.

## 2. The tile

### 2.1 `colebrook-friction-factor` -- Darcy Friction Factor (Swamee-Jain / Colebrook)

```
inputs:
  reynolds       -   Reynolds number
  rel_roughness  -   relative roughness eps/D

f = (reynolds < 2300)
      ? 64 / reynolds                                                    (laminar)
      : 0.25 / (log10( rel_roughness/3.7 + 5.74 / reynolds^0.9 ))^2       (Swamee-Jain)
```

**Pinned worked example (Re 100,000, eps/D 0.0003).** `f = 0.25/[log10(0.0003/3.7 + 5.74/100000^0.9)]^2 = 0.0195` --
the Moody-chart value for turbulent flow in commercial steel. **Cross-check (laminar).** At `Re = 1500`, roughness drops out
and `f = 64/1500 = 0.0427`. A Reynolds number in the `2300 to 4000` transitional band returns the turbulent estimate with
an indeterminacy flag. The non-positive-`Re` and non-finite seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "plumbing"]`, beside `reynolds-number-pipe`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the Darcy friction factor, `editionNote` naming the Colebrook /
Swamee-Jain fit, its validity range, the laminar branch, and the Darcy-vs-Fanning caveat); `test/fixtures/worked-examples.json`
(the turbulent example + the laminar cross-check); `test/fixtures/compute-map.js` (`colebrook-friction-factor` ->
`computeColebrookFrictionFactor` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `reynolds-number-pipe` /
`friction-loss` / `pitot-traverse-cfm` / `pump-specific-speed`); `data/search/aliases.json` ("darcy friction factor",
"swamee jain", "colebrook white", "moody friction factor", "friction factor calculator", "relative roughness", "f darcy
weisbach", "pipe friction factor", "64 over Re"); the id appended to the existing HVAC renderers block in `app.js`; the
`// dims:` annotation (all dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the laminar/turbulent switch, and the non-positive / non-finite error seams. No new module; re-pin `calc-hvac.js`
on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the regime switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the single `f` output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (Re 1e5, eps/D 3e-4 -> 0.0195).

## 5. Roadmap position

Opens the water-system hydraulics trio and unlocks a proper Darcy-Weisbach: with `reynolds-number-pipe` for `Re` and this
tile for `f`, a head-loss `hf = f (L/D) V^2/2g` tile is the deliberate next follow-on. `thrust-block-sizing` (v388) and
`hydrant-available-flow` (v389) continue the water-distribution theme.
