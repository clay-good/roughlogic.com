# roughlogic.com Specification v580 -- Tanker (Water Shuttle) Flow Capability (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground engineering); no new module, group, or dependency. Inherits spec.md through spec-v579.md.
>
> **The gap, and the evidence for it.** In rural firefighting without hydrants, a fleet of tankers shuttles water from a
> fill site to the fire, and the bench has the required volume (`nfpa-1142-water-supply`) and the drawdown of a fixed
> on-scene volume (`water-supply-duration`) but not the **sustained shuttle flow** the fleet can deliver. That rate is
> the usable tank volume times the number of tankers divided by the cycle time. Two catches: ISO credits only **90% of
> nominal** tank volume, and the fleet flow is capped by the **slowest link -- usually the fill or dump site**, not the
> tank size. A fourth tanker adds nothing if the fill pump cannot turn it around, so buying bigger tanks without a
> faster fill site does not raise the sustained rate. The tile takes the usable tank volume, the number of tankers, and
> the cycle time (fill + dump + round-trip travel), and returns the sustained shuttle flow -- the rural equivalent of a
> hydrant's gpm.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The usable tank volume is
a volume (`L^3`, in gal); the cycle time is a time (`T`, in min); the sustained flow is a volumetric flow
(`L^3 T^-1`, in gpm); the number of tankers is `dimensionless`. The v18/v21 contract: any non-finite input, a non-
positive tank volume, tanker count, or cycle time returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the shuttle relations by name (ISO PPC hauled-water credit; NFPA 1142 water shuttle);
`editionNote` names the **tanker water-shuttle sustained flow**, prints
`shuttle_flow = usable_tank_gal x tankers / cycle_time_min` with `cycle = fill + dump + 2 x travel`, notes the ISO
90%-of-nominal usable credit, and states that **the fleet flow is capped by the slowest link -- usually the fill or dump
site not the tank size -- so an extra tanker adds nothing if the fill pump cannot turn it around, only about 90% of
nominal tank volume is usable, this is a sustained rate (water-supply-duration handles the drawdown of a fixed on-scene
volume), and the fill-site pump capacity and the operation govern** -- a planning aid, not incident command.

## 2. The tile

### 2.1 `tanker-shuttle-flow` -- Why a Fourth Tanker Adds Nothing If the Fill Site Is the Bottleneck

```
inputs:
  nominal_tank_gal   gal   nominal tanker capacity
  usable_fraction    -     ISO usable credit (default 0.90)
  tanker_count       -     number of tankers in the shuttle
  cycle_time_min     min   full cycle: fill + dump + round-trip travel

usable_gal    = nominal_tank_gal x usable_fraction              [gal]
shuttle_flow  = usable_gal x tanker_count / cycle_time_min      [gpm]
```

**Pinned worked example (3,000 gal tankers at 90% usable, 3 tankers, a 12-minute cycle).** Each tanker delivers
`3,000 x 0.90 = 2,700 usable gal`, so the sustained shuttle flow is `2,700 x 3 / 12 = ` **675 gpm** -- a respectable
rural water supply, as long as the fill site can refill a tanker every 4 minutes to sustain the 12-minute cycle across 3
trucks. **Cross-check (a slow fill site caps the fleet).** If the fill pump can only turn a truck around in a way that
stretches the cycle to `18 minutes`, the same three tankers deliver only `2,700 x 3 / 18 = ` **450 gpm** -- adding a
fourth tanker would not help, because the fill site, not the truck count, is the bottleneck; a faster fill pump or a
second fill site is the fix. The tile returns the usable volume per tanker and the sustained shuttle flow.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 12-min example + the slow-fill
cross-check); `test/fixtures/compute-map.js` (`tanker-shuttle-flow` -> `computeTankerShuttleFlow` in
`../../calc-fire.js`); `scripts/related-tiles.mjs` (-> `nfpa-1142-water-supply` / `water-supply-duration` /
`relay-pump-distance`); `data/search/aliases.json` ("tanker shuttle", "water shuttle flow", "tender shuttle", "rural
water supply", "iso hauled water", "nfpa 1142 shuttle", "tanker fleet flow", "fill site bottleneck"); the id appended to
the fire renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the usable-fraction credit, the flow relation, the cycle-time
sensitivity, and the error seams (non-finite, non-positive volume / count / cycle). Hand-writes its renderer (mirroring
the calc-fire.js `water-supply-duration` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the usable / shuttle-flow stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 12-min example -> 675 gpm).

## 5. Roadmap position

Adds the sustained shuttle rate beside `nfpa-1142-water-supply` (the required volume) and `water-supply-duration` (the
fixed-volume drawdown). A cycle-time builder (fill + dump + travel from distance and speed) and a fill-site-limited
maximum-fleet-size solver are deliberate future follow-ons. Further Group F growth stays evidence-driven.
