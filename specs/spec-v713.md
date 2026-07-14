# roughlogic.com Specification v713 -- Wire-Rope Diameter for a Required WLL (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v712.md. Opens the sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `wire-rope-strength` tile runs the field rule-of-thumb forward:
> from a diameter it returns the estimated breaking strength and working load limit. The rigging question is the inverse
> -- **what diameter carries a required WLL**. From `WLL = (construction_factor x d^2) / design_factor`,
> `d = sqrt(WLL x design_factor / construction_factor)`, then round up to the next standard rope diameter. The number
> this settles: a **5-ton** WLL at 46 tons/in^2 and 5:1 needs **0.74 in** -- pick **3/4 in** (5.18-ton WLL, clears).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`wire-rope-strength` sibling: the WLL is `M L T^-2` (tons), the diameter is `L` (in), and the construction and design
factors are dimensionless. The v18/v21 contract: any non-finite input, or a non-positive WLL, construction factor, or
design factor returns `{ error }`. Citation discipline (v19/v22): the Wire Rope Users Manual rule-of-thumb solved for the
diameter, `GOVERNANCE.rigging` matching the sibling; the note keeps the sibling's ESTIMATE-only safety framing --
**round up to a standard size, the default 46 tons/in^2 is the IPS 6x19 rule-of-thumb (edit for other constructions/
grades), 5:1 is the typical general-rigging design factor, and the manufacturer's certified breaking strength governs any
real lift -- never place unmarked or uncertified rope in service**.

## 2. The tile

### 2.1 `wire-rope-diameter-for-wll` -- Wire-Rope Diameter for a Required WLL

```
inputs:
  wll_required_tons     M L T^-2      required working load limit (> 0)
  construction_factor   dimensionless tons/in^2 (> 0, default 46 = IPS 6x19)
  design_factor         dimensionless safety factor (> 0, default 5)

diameter_in = sqrt(wll_required_tons x design_factor / construction_factor)
selected_diameter_in = the next standard rope diameter >= diameter_in
selected_wll_tons = construction_factor x selected_diameter_in^2 / design_factor
```

**Pinned worked example.** WLL = 5 tons, cf = 46, DF = 5: `d = sqrt(5 x 5 / 46) = sqrt(0.5435) = ` **0.737 in**; the next
standard size is **3/4 in** (WLL = 46 x 0.75^2 / 5 = 5.18 tons, clears); feeding 0.737 in back through
`wire-rope-strength` returns a 5.00-ton WLL, the input. A higher required WLL needs a bigger rope; beyond 1-1/2 in the
selection is left to the manufacturer's table.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`) placed beside `wire-rope-strength` (Group Z is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (rule-of-thumb solved for the diameter, `GOVERNANCE.rigging`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`wire-rope-diameter-for-wll` -> `computeWireRopeDiameterForWll`); `scripts/related-tiles.mjs` (-> `wire-rope-strength` /
`sling-d-d-efficiency` / `shackle-eyebolt-wll` / `winch-drum-line-pull`); `data/search/aliases.json` (5 collision-checked
question aliases, including the existing "rope size for a required working load" retargeted from the forward tile to this
inverse -- it now answers the question directly); the calc-rigging `RIGGING_RENDERERS` map entry via a hand-written
renderer (three number fields, an exact diameter plus the next standard size and its WLL) and the id added to the
calc-rigging declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the standard-size round-up, the
round-trip through `computeWireRopeStrength` across a WLL/cf/DF sweep, the higher-WLL-bigger-rope monotonicity, the
over-range null selection, and the error seams. The calc-rigging.js gzip cap is raised 24000 -> 26500 B (the module was
at 99.1%; this queue adds two rigging inverse tiles). Verify at build, including `check-shells`. Lazy-loaded, absent from
home first paint. Home tile count 1,161 -> 1,162.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.74 in, next standard
3/4 in, for a 5-ton WLL).

## 5. Roadmap position

Pairs the forward rope tile (`wire-rope-strength`, WLL from a diameter) with its inverse (diameter from a required WLL),
the two halves of the rope-sizing question. Opens the sweep-10 inverse queue; further Group Z rigging growth stays
evidence-driven.
