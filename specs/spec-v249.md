# roughlogic.com Specification v249 -- Sprinkler System Demand and Water Supply (NFPA 13) (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v248..v250 (the fire-sprinkler system-design trio). This spec is the
> middle: from the discharge density on the floor to the flow the pump must feed and the volume the tank must store.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the design-area demand plus the hose allowance,
> held for the required duration, is the single water-supply requirement a sprinkler system is designed around. Adds one
> tile to **`calc-firesprinkler.js`** (Group F, trade `["fire"]`, beside `fire-pump-curve`); no new module, group, or
> dependency. Inherits spec.md through spec-v248.md.
>
> **The gap, and the evidence for it.** The catalog computes a sprinkler head's discharge density (`sprinkler-density`,
> gpm/ft^2) and solves the k-factor (`sprinkler-k-factor`), but nothing turns the density and the design area into the
> *system* demand: the gpm at the base of the riser, the added inside/outside hose-stream allowance, and the total
> gallons that flow must be sustainable for. NFPA 13 sets the demand as density times the design area, and the hazard
> classification sets all three levers -- an Ordinary Hazard Group 2 space is 0.20 gpm/ft^2 over a 1,500 ft^2 design area
> (300 gpm of sprinkler flow), plus a 250 gpm hose allowance, held for 60 to 90 minutes. That is nearly 50,000 gallons of
> stored supply, the number that sizes the tank and sets the flow the v248 pump has to clear at its rated point. The
> water-supply-duration tile (`water-supply-duration`) is a fire-service tank-drain reading; it does not build the NFPA 13
> sprinkler demand from density, area, and hose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The density is a discharge
per unit area (gpm/ft^2); the design area is an area (ft^2); the sprinkler flow, the hose allowance, and the total demand
are volumetric flows (gpm); the duration is a time (min); the stored volume is a volume (gal). The v18/v21 contract: any
non-finite input, a non-positive density / design area / duration, or a negative hose allowance, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the demand relations by name; `editionNote` names **NFPA 13
(Standard for the Installation of Sprinkler Systems), 2022** (sprinkler demand `= density x design_area`, total demand
`= sprinkler_demand + hose_allowance`, stored volume `= total_demand x duration`), gives the hazard-class defaults as
editable (Light 0.10 gpm/ft^2 over 1,500 ft^2, 100 gpm hose, 30 min; Ordinary Group 1 0.15 / 1,500 / 250 / 60-90;
Ordinary Group 2 0.20 / 1,500 / 250 / 60-90), and states that **this is the area/density (pipe-schedule-style) screening
demand -- a full hydraulic calculation to the most-remote area including friction and elevation yields the governing
demand and is a separate analysis, the density/area/duration come from the applicable NFPA 13 density-area curve for the
actual commodity and storage arrangement, storage and special occupancies (ESFR, high-piled, in-rack) use their own
criteria, and this is a design aid, not a stamped hydraulic submittal** -- a qualified fire-protection engineer and the
AHJ govern.

## 2. The tile

### 2.1 `sprinkler-system-demand` -- Sprinkler System Demand and Water Supply

```
inputs:
  density        gpm/ft2   design discharge density, gpm/ft^2 (default 0.20)
  design_area    ft2       hydraulic design area, ft^2 (default 1500)
  hose_gpm       gpm       inside + outside hose-stream allowance, gpm (default 250)
  duration_min   min       required supply duration, min (default 90)

sprinkler_gpm = density * design_area
total_gpm     = sprinkler_gpm + hose_gpm
volume_gal    = total_gpm * duration_min
```

**Pinned worked example (Ordinary Hazard Group 2 machine shop).** Density 0.20 gpm/ft^2 over a 1,500 ft^2 design area, a
250 gpm hose allowance, held 90 minutes: `sprinkler_gpm = 0.20 x 1,500 = 300 gpm`; `total_gpm = 300 + 250 = ` **550 gpm**;
`volume_gal = 550 x 90 = ` **49,500 gallons**. That 550 gpm is the flow the v248 fire pump must clear with margin at its
rated point, and the 49,500 gallons sizes the stored-water tank. **Cross-check (Light Hazard office).** Density 0.10 over
the same 1,500 ft^2, a 100 gpm hose allowance, 30 minutes: `sprinkler_gpm = 0.10 x 1,500 = 150 gpm`; `total_gpm = 150 +
100 = 250 gpm`; `volume_gal = 250 x 30 = ` **7,500 gallons**. Dropping the hazard from Ordinary to Light cuts the stored
supply more than six-fold -- the density, the hose allowance, and the duration all fall together, which is why the hazard
classification, not the room size, is the decision that dominates the water supply.

## 3. Wiring

A `tools-data.js` row (group `F`, trade `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the demand relations, `editionNote` naming NFPA 13 2022 with the hazard-class defaults and the
hydraulic-calc / density-area-curve / storage-occupancy / not-a-submittal caveats); `test/fixtures/worked-examples.json`
(the Ordinary Hazard example + the Light Hazard cross-check); `test/fixtures/compute-map.js`
(`sprinkler-system-demand` -> `computeSprinklerSystemDemand` in `../../calc-firesprinkler.js`);
`scripts/related-tiles.mjs` (-> `sprinkler-density` / `fire-pump-curve` / `sprinkler-head-layout`);
`data/search/aliases.json` ("sprinkler demand", "water supply", "design area", "hose allowance", "hose stream",
"density area", "NFPA 13", "stored water", "fire water tank"); the id appended to the `FIRESPRINKLER_RENDERERS` declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and the error seams (non-finite, density / design area / duration <= 0, negative hose allowance). Raise the
`calc-firesprinkler.js` size cap if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive-input error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the sprinkler-gpm / total-gpm / volume-gal stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (0.20 over 1,500 ft^2 + 250 gpm hose over 90 min
-> 550 gpm, 49,500 gallons).

## 5. Roadmap position

The middle of the fire-sprinkler system-design batch (v248..v250). Consumes the discharge density priced by
`sprinkler-density`, produces the flow and stored volume the `fire-pump-curve` (v248) pump must sustain, and pairs with
`sprinkler-head-layout` (v250), which lays that density out across the floor as a head count and spacing. A full
most-remote-area hydraulic calculation with Hazen-Williams friction and elevation is a deliberate future follow-on.
