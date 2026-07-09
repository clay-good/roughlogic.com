# roughlogic.com Specification v576 -- Gas Chlorine Cylinder Withdrawal Rate (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v575.md.
>
> **The gap, and the evidence for it.** The bench has chlorine dose and CT tiles, but none checks whether a gas
> chlorine container can physically deliver the required feed rate. There is a hard ceiling: a 150-lb cylinder supplies
> only about **40 lb/day** of gas at a normal room temperature (about 70 F), and a 1-ton container about **400 lb/day**.
> The catch is a phase-change limit, not a valve setting. Pull gas faster than the liquid chlorine can re-vaporize and
> the container **frosts over and the rate collapses** -- the latent heat of vaporization cools the liquid, dropping its
> vapor pressure. A cold room lowers the ceiling further. Exceeding the rate forces a multi-cylinder manifold or an
> evaporator, never a bigger regulator. The tile takes the required feed rate, the container type, and the room
> temperature, and returns the per-container withdrawal ceiling, the number of containers to manifold, and a
> temperature/frost warning -- so the chlorination system is built to deliver the dose without freezing up.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The feed rate and the
per-container ceiling are `M T^-1` (lb/day); the room temperature carries the temperature dimension (degrees F); the
container count is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive feed rate, an
unrecognized container type, or a room temperature below the point where liquid chlorine cannot vaporize returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the withdrawal limits by name (The Chlorine
Institute; state operator training); `editionNote` names the **gas chlorine container withdrawal rate**, prints the
per-container ceiling (**about 40 lb/day for a 150-lb cylinder and 400 lb/day for a 1-ton container at about 70 F**,
derated in a colder room), `containers = ceil(feed_rate / per_container_ceiling)`, and states that **the withdrawal
rate is a temperature-dependent ceiling not a valve setting -- pulling gas faster than the liquid re-vaporizes frosts
the container and the rate collapses (the latent-heat limit) -- a cold room lowers it, exceeding it forces a
multi-container manifold or an evaporator, and the Chlorine Institute guidance and the manufacturer chart govern** -- a
planning aid, not the manufacturer's data.

## 2. The tile

### 2.1 `chlorine-cylinder-withdrawal` -- The Frost Ceiling That No Bigger Regulator Can Beat

```
inputs:
  feed_rate_lb_day    lb/day   required chlorine feed rate
  container_type      -        150-lb cylinder or 1-ton container
  room_temp_f         F        chlorine room temperature

per_container = container_type == "ton" ? ~400 : ~40    [lb/day]   at ~70 F, derated below
                (scaled down for a colder room)
containers    = ceil(feed_rate_lb_day / per_container)   [count]   manifold this many
frost_warn    = feed_rate_lb_day near or above the per-container ceiling, or a cold room
```

**Pinned worked example (a 100 lb/day feed from 150-lb cylinders at 70 F).** Each 150-lb cylinder tops out near
**40 lb/day**, so a single cylinder cannot supply 100 lb/day without frosting; the system needs
`ceil(100 / 40) = ` **3 cylinders manifolded** together to spread the withdrawal and keep any one cylinder from icing
over. **Cross-check (a 1-ton container carries it alone).** The same 100 lb/day from a 1-ton container, which supplies
about **400 lb/day**, needs `ceil(100 / 400) = ` **1 container** -- comfortably within its ceiling, the reason larger
plants move to ton containers or an evaporator rather than a bank of cylinders. A cold room derates both figures and
trips the frost warning. The tile returns the per-container ceiling, the containers to manifold, and the frost warning.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water-treatment", "wastewater"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the cylinder-
manifold example + the ton-container cross-check); `test/fixtures/compute-map.js` (`chlorine-cylinder-withdrawal` ->
`computeChlorineCylinderWithdrawal` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `chemical-feed-pump`
/ `chlorine-demand` / `disinfection-ct`); `data/search/aliases.json` ("chlorine withdrawal rate", "chlorine cylinder",
"gas chlorine feed", "150 lb cylinder", "ton container chlorine", "chlorine frost", "chlorine manifold", "chlorine
evaporator"); the id appended to the treatment renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the per-container ceiling by type, the
container count, the frost warning, and the error seams (non-finite, non-positive feed, bad type, sub-vaporization
temp). Hand-writes its renderer (mirroring the calc-treatment.js `chlorine-demand` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the ceiling / containers / warning stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the cylinder example -> 40 lb/day ceiling, 3 cylinders).

## 5. Roadmap position

Adds the container-delivery ceiling beside the dose tiles `chlorine-demand` and `disinfection-ct` (which set the feed
this must physically supply). An evaporator-vs-manifold decision helper and a per-cylinder-temperature-derate table are
deliberate future follow-ons. Further Group M growth stays evidence-driven.
