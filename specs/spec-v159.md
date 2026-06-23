# roughlogic.com Specification v159 -- Steam Trap Sizing (Condensate Load and Safety Factor) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> third of the steam-and-condensate cluster. Adds one tile to **`calc-pipefit.js`** (Group B); no new
> module, group, or dependency. Inherits spec.md through spec-v158.md.
>
> **The gap, and the evidence for it.** Flash (v157) and steam main sizing (v158) cover the supply side;
> the return side starts at the trap. A steam trap is sized not for the running condensate load but for
> that load times a safety factor (2x to 3x, higher on warm-up and modulating service) at the actual
> differential pressure across the trap -- undersize it and the equipment floods on warm-up. The fitter
> needs the condensate load (from the heat duty and the latent heat) and the required trap capacity, and
> the catalog computes neither. The HVAC `condensate-drain` tile is a cooling-coil drain by IMC 307; it is
> not a steam trap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The heat
duty is a power (`M L^2 T^-3`, Btu/hr); the latent heat is an energy per mass (`L^2 T^-2`, Btu/lb); the
condensate load and the required trap capacity are a mass per time (`M/T`, lb/hr); the safety factor is
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive latent heat, or a safety
factor below 1 returns `{ error }`; the only division is by the guarded-positive latent heat. Citation
discipline (v19/v22): `GOVERNANCE.general` over the condensate-load relation and the safety-factor
practice by name; `editionNote` states that **the trap is selected from the manufacturer's capacity chart
at the actual differential pressure** -- this tile gives the load and the capacity target, not a trap
model, and modulating, warm-up, and stall conditions can demand a larger factor or a different trap type.

## 2. The tile

### 2.1 `steam-trap-sizing` -- Condensate Load and Required Trap Capacity

```
inputs:
  heat_duty_btuhr   M L^2/T^3   process / coil heat duty served by the steam, Btu/hr
  hfg_btulb         L^2/T^2     latent heat of the steam at the operating pressure, Btu/lb
  safety_factor     dimensionless   trap sizing factor (default 2; warm-up / modulating 3)

condensate_lbhr  = heat_duty_btuhr / hfg_btulb        # guarded: hfg_btulb > 0
req_capacity_lbhr = condensate_lbhr x safety_factor    # guarded: safety_factor >= 1
```

The latent heat comes from the bundled saturated-steam table keyed by the entered gauge pressure, or is
user-supplied. The selected trap must carry `req_capacity_lbhr` at the differential pressure the
installation actually develops.

**Pinned worked example.** A 400,000 Btu/hr load on 15 psig steam (latent heat 945 Btu/lb), 2x factor:
`condensate = 400000 / 945 = 423 lb/hr`; `req_capacity = 423 x 2 = 847 lb/hr`. Pick a trap rated at or
above 847 lb/hr at the operating differential.
**Cross-check (warm-up factor).** Same load and steam, but a 3x warm-up factor:
`423 x 3 = 1,270 lb/hr`. The load is unchanged; the factor sets the capacity target.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the condensate-load relation and safety-factor practice,
`editionNote` naming the manufacturer-chart selection and warm-up/modulating caveat);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`steam-trap-sizing` -> `computeSteamTrapSizing` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs`
(-> `flash-steam-pct` / `steam-pipe-velocity` / `boiler-pipe-sizing`); `data/search/aliases.json`
("steam trap", "trap sizing", "condensate load", "trap capacity", "steam trap safety factor",
"condensate lb/hr"); the id appended to the existing pipefit renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the cross-check, and error seams (non-finite, `hfg <= 0`, `safety_factor < 1`). Raise the
`calc-pipefit.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the load and capacity lines wrap on a
phone); render-no-nan + a11y sweep, output read to the value (400,000 Btu/hr / 945 / 2x -> 423 then 847
lb/hr).

## 5. Roadmap position

Closes the supply-side-to-return-side steam cluster (v157 flash, v158 main, v159 trap). A future
`condensate-return-sizing` tile would extend it to the wet/dry return main. Further steam growth stays
evidence-driven.
