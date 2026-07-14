# roughlogic.com Specification v786 -- Sacrificial Anode Service Life (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v785.md. Explore sweep #21 (entry 1).
>
> **The gap, and the evidence for it.** Every boat owner and marine tech plans anode replacement around haul-out
> intervals, and the calc that sizes it -- **how long a sacrificial (galvanic) anode lasts** -- is pure Faraday's law:
> `life = anode mass x electrochemical capacity x utilization / (protective current x 8760 h)`. No tile does it. The
> number this settles: a **5 lb zinc** (354 A-h/lb) at **0.85** utilization drawing **0.15 A** lasts about **1.14 years**
> -- the annual haul-out replacement. Grep confirmed no anode/galvanic/cathodic tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
marine mechanic siblings (`abyc-dc-wire`, `prop-slip`): the anode mass carries `M`, the protective current carries `I`,
the utilization factor is dimensionless, and the life carries `T`. The electrochemical capacity is a tabulated material
property (A-h/lb) selected by material, the same pattern the catalog already uses for wire C-factors and refrigerant
densities. The v18/v21 contract: a non-finite input (via `_finiteGuard`), an unknown material, a non-positive mass or
current, or a utilization factor outside `(0, 1]` returns `{ error }`. Citation discipline (v19/v22): sacrificial-anode
life by Faraday's law of electrolysis by name (ABYC E-2 cathodic protection; DNV-RP-B401 anode capacities),
`GOVERNANCE.general` matching the siblings; the note states the charge-in / charge-out basis, why aluminum has largely
replaced zinc (higher capacity per pound and it works in brackish water where zinc passivates), that the utilization
factor accounts for the anode becoming ineffective before it is fully consumed, and that the protective current must be
measured with a reference electrode rather than assumed.

## 2. The tile

### 2.1 `sacrificial-anode-life` -- Sacrificial Anode Service Life

```
inputs:
  anode_material       zinc | aluminum (Al-Zn-In) | magnesium
  anode_mass_lb        anode net mass (lb)
  current_draw_a       protective current the anode supplies (A)
  utilization_factor   fraction usable before ineffective (0-1, ~0.85)

capacity_Ah_per_lb   = { zinc: 354, aluminum: 1150, magnesium: 500 }[material]
life_hours           = anode_mass_lb x capacity_Ah_per_lb x utilization / current_draw_a
life_years           = life_hours / 8760
consumption_lb_per_yr = current_draw_a x 8760 / (capacity_Ah_per_lb x utilization)
```

**Pinned worked example.** Zinc, 5 lb, 0.15 A, utilization 0.85: `life_hours = 5 x 354 x 0.85 / 0.15 = 10,030 h`;
`life_years = 10,030 / 8760 = ` **1.14 yr**; `consumption = 0.15 x 8760 / (354 x 0.85) = ` **4.37 lb/yr**. An aluminum
anode (1150 A-h/lb) of equal mass and current lasts about 3.7 years -- far longer per amp; doubling the current to 0.30 A
halves the zinc life.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) beside `reserve-capacity-amp-hours` (Group K rows are
spec-interleaved, not under the v4 seed block); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Faraday's law /
ABYC E-2, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example, two pinned outputs);
`test/fixtures/compute-map.js` (`sacrificial-anode-life` -> `computeSacrificialAnodeLife`); `scripts/related-tiles.mjs`
(-> `abyc-dc-wire` / `prop-slip` / `reserve-capacity-amp-hours`); `data/search/aliases.json` (5 collision-checked
aliases: "sacrificial anode life", "how long does a boat zinc last", "cathodic protection anode life", ...); the
calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no DOM-sentinel row)
with a material select, and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the aluminum-longer / more-current-shorter monotonicity, the material capacity, and the error seams.
The calc-mechanic.js gzip cap is unchanged (the addition fits under the current cap). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,234 -> 1,235.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (5 lb zinc, 0.15 A -> 1.14 yr).

## 5. Roadmap position

Adds the cathodic-protection planning calc every marine owner runs -- sacrificial-anode life -- to the marine mechanic
bench, beside the DC-wire and prop tiles. Opens Explore sweep #21 (draft-beer-line balancing and lightning rolling-sphere
protection queued next). A required-anode-mass-for-a-target-interval inverse is the natural companion; it stays
evidence-driven.
