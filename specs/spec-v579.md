# roughlogic.com Specification v579 -- Drafting Maximum Lift, Altitude-Corrected (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground engineering); no new module, group, or dependency. Inherits spec.md through spec-v578.md.
>
> **The gap, and the evidence for it.** Drafting from a static source (a pond, a portable tank) is limited by how high
> the pump can lift water, and the bench has no fireground tile for it. The theoretical lift is 33.9 ft at sea level,
> but the catch is that a real pump **cannot pull a perfect vacuum** -- about two-thirds of theoretical is the practical
> ceiling, roughly 22.5 ft at sea level -- and every 1,000 ft of altitude shaves another foot off, so a mountain-town
> draft that works at sea level can fail. The physics that surprises new operators is that lift is limited by
> **atmospheric pressure pushing water up the suction**, not the pump pulling it, so a bigger pump does not help; over
> about 22 ft you must resite the pump lower. The tile takes the site elevation, the pump condition factor, and any
> strainer/suction losses, and returns the theoretical and attainable lift -- the go/no-go on a drafting setup.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The site elevation, the
theoretical and attainable lift, and the suction losses are lengths (`L`, in ft); the pump condition factor and the
`33.9` constant are `dimensionless`. The v18/v21 contract: any non-finite input, a negative elevation or suction loss,
or a pump condition factor outside `(0, 1]` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the drafting relations by name (IFSTA / NWCG firefighter math); `editionNote` names the **altitude-corrected
drafting maximum lift**, prints `theoretical = 33.9 - elevation / 1000`, and
`attainable = factor x theoretical - suction_losses` (factor about 2/3), notes that **1 in Hg of vacuum is about 1.13 ft
of lift**, and states that **a real pump cannot pull a perfect vacuum so about two-thirds of theoretical is the
practical ceiling (about 22.5 ft at sea level), every 1,000 ft of altitude shaves another foot, lift is limited by
atmospheric pressure pushing water up the suction not the pump pulling so a bigger pump does not help, and over the
attainable lift you must resite the pump lower** -- a planning aid, not incident command.

## 2. The tile

### 2.1 `draft-lift-max` -- Why Atmosphere, Not the Pump, Sets the Drafting Ceiling

```
inputs:
  site_elevation_ft   ft   elevation above sea level
  pump_factor         -    fraction of theoretical the pump attains (default 0.667)
  suction_losses_ft   ft   strainer and suction-hose losses (0 if unknown)

theoretical_lift = 33.9 - site_elevation_ft / 1000              [ft]
attainable_lift  = pump_factor x theoretical_lift - suction_losses_ft   [ft]
```

**Pinned worked example (a draft at 3,000 ft elevation, a typical 2/3 pump factor, no listed suction loss).** The
theoretical lift is `33.9 - 3,000/1000 = ` **30.9 ft**, and the attainable lift is `0.667 x 30.9 = ` **20.6 ft** -- so
this pump can draft from a source up to about 20 ft below it, but not the 22.5 ft it could manage at sea level.
**Cross-check (a high-mountain site loses more).** At `8,000 ft`, `theoretical = 33.9 - 8 = 25.9 ft` and
`attainable = 0.667 x 25.9 = ` **17.3 ft** -- three feet less than at 3,000 ft, purely from the thinner atmosphere, the
reason a drafting setup that works in the valley can fail on the mountain and the pump must be moved closer to the
water. The tile returns the theoretical and attainable lift.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 3,000 ft example + the 8,000 ft
cross-check); `test/fixtures/compute-map.js` (`draft-lift-max` -> `computeDraftLiftMax` in `../../calc-fire.js`);
`scripts/related-tiles.mjs` (-> `relay-pump-distance` / `pump-tdh` / `npsh-a`); `data/search/aliases.json` ("drafting
lift", "maximum lift draft", "draft altitude correction", "33.9 feet", "fire pump draft", "vacuum lift water", "static
source draft", "attainable lift"); the id appended to the fire renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the altitude correction,
the two-thirds attainable factor, the suction-loss subtraction, and the error seams (non-finite, negative elevation /
losses, factor out of range). Hand-writes its renderer (mirroring the calc-fire.js pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the theoretical / attainable stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 3,000 ft example -> 30.9 ft theoretical, 20.6 ft attainable).

## 5. Roadmap position

Adds the fireground drafting ceiling beside `relay-pump-distance` and the pump-hydraulics tiles (`pump-tdh`,
`npsh-a`). A vacuum-gauge-to-lift readout (in Hg to feet) and a maximum-flow-at-a-given-lift companion are deliberate
future follow-ons. Further Group F growth stays evidence-driven.
