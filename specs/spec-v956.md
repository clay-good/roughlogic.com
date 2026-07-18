# roughlogic.com Specification v956 -- Hydronic Injection-Mixing Loop Flow (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v955.md. Hydronics sweep, beside the accepted
> `outdoor-reset-ratio`, `buffer-tank-loop-credit`, and `hydronic-gpm-deltat` tiles.
>
> **The gap, and the evidence for it.** The hydronics suite has outdoor reset, buffer tanks, and GPM-from-delta-T, but
> nothing sizes the INJECTION flow that feeds a low-temp secondary loop from a hot primary. Grep confirmed no injection /
> primary-secondary mixing tile. Every radiant / low-temp boiler installer sizes injection. The number this settles: a
> 10 gpm secondary at 110/90 F off a 180 F primary needs only **2.2 gpm** of injection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the balance mixes gpm and temperatures),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive secondary flow, a secondary supply not warmer than the return (no heating delta-T), or a primary supply not
warmer than the secondary return returns `{ error }`; a primary cooler than the required secondary supply is FLAGGED
unreachable, not an error. Citation discipline (v19/v22): the injection energy balance by name (Siegenthaler / hydronic
practice), `GOVERNANCE.general`; the note states that this sizes the injection FLOW only -- the injection pump/valve Cv
follows from the flow and the primary head, and a variable-speed injection pump or modulating valve, the boiler
return-temperature protection, and the heat loss govern the design.

## 2. The tile

### 2.1 `hydronic-injection-mixing` -- Hydronic Injection-Mixing Loop Flow

```
inputs:
  secondary_gpm        secondary loop flow (gpm), default 10
  secondary_supply_f   secondary supply temp (F), default 110
  secondary_return_f   secondary return temp (F), default 90
  primary_supply_f     primary supply temp (F), default 180

injection_gpm             = secondary_gpm x (secondary_supply_f - secondary_return_f) / (primary_supply_f - secondary_return_f)
injection_pct_of_secondary = 100 x injection_gpm / secondary_gpm
reachable                 = primary_supply_f >= secondary_supply_f
```

**Pinned worked example.** 10 gpm secondary at 110/90 F off a 180 F primary: `injection = 10 x (110-90)/(180-90) = 10 x
20/90 = ` **2.22 gpm** (22.2% of the secondary flow). Cross-check: a cooler **140 F** primary gives up less heat per
gallon, so the injection climbs to `10 x 20/50 = ` **4.0 gpm** -- and a primary below the 110 F required supply is
flagged unreachable.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `buffer-tank-loop-credit`); a `tile-meta.js` `_TILES` entry
(`C`); a `citations.js` entry (injection energy balance, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
base example plus the cooler-primary cross-check, pinning the injection flow and percent); `test/fixtures/compute-map.js`
(`hydronic-injection-mixing` -> `computeHydronicInjectionMixing`, module `../../calc-hvacsystems.js`); `scripts/related-
tiles.mjs` (-> `outdoor-reset-ratio` / `hydronic-gpm-deltat` / `radiant-loop-sizing`); `data/search/aliases.json` (5
collision-checked aliases: "injection mixing", "injection pump flow", "primary secondary injection", "hydronic
injection", "injection loop gpm"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`HVACSYSTEMS_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-hvacsystems declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the injection flow and percent, the cooler-primary direction, the flow
and delta-T linearity, the unreachable flag, and the error seams. The calc-hvacsystems.js gzip cap and the Group C group
shell are watched at build (cap raised for this tile). Home tile count 1,404 -> 1,405.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(10 gpm / 110 / 90 / 180 -> 2.22 gpm).

## 5. Roadmap position

Hydronics beside `outdoor-reset-ratio`, serving the hydronic / radiant installer (hvac). Deliberately the injection-flow
energy balance; the injection pump/valve Cv, the boiler return-temperature protection, the heat loss, and the control
strategy govern the design. Stays evidence-driven. Continues the hydronics sweep at 1 new spec (v956).
