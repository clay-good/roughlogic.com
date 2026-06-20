# roughlogic.com Specification v117 -- Rigging: Multi-Leg Sling Load Distribution and Wire-Rope Breaking-Strength Estimate (calc-rigging.js, Group Z, 2 New Tiles)

> **Status: LANDED 2026-06-20 (package 0.70.0, catalog 676 -> 687 across spec-v112..v119).** In-scope catalog expansion under
> the spec-v106 charter: two rigging tiles from public ASME B30.9 load relations and first-principles
> statics, qualified-rigger governed. Group Z is a kept trade and its existing tiles already carry
> the "qualified rigger governs" framing; these match it. Adds two tiles to **`calc-rigging.js`**;
> no new module, group, or dependency. Inherits spec.md through spec-v116.md.
>
> **The gap, and the evidence for it.** Group Z covers two-point center-of-gravity load share,
> shackle/eye-bolt WLL, spreader beams, and tag-line pull, and `calc-rescue.js` has a generic
> sling-angle multiplier, but no tile distributes a load across a 3- or 4-leg sling (with the
> conservative 2-leg assumption ASME requires for rigid loads), and no tile estimates a wire rope's
> breaking strength from its diameter and construction. Both are daily heavy-lift math.
>
> **Scope note (spec-v106).** Rigging is safety-sensitive; like the existing rigging tiles, these
> compute from public physics and explicitly defer to the qualified rigger and the manufacturer's
> certified ratings. The wire-rope tile is an *estimate* for the unmarked/verification case and
> says so; the certificate governs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Loads
are `M` (force), angles dimensionless, rope diameter `L`. Bundled defaults (the 2-leg conservative
share for 3+ legs, the 5:1 design factor, the per-construction breaking-strength constant) are
annotated editable fields. The v18/v21 contract: any non-finite input, a non-positive load, leg
count, diameter, or design factor, or an angle outside (0, 90] degrees, returns `{ error }`.
Citation discipline (v19/v22): `multi-leg-sling` cites ASME B30.9 sling load and angle factors;
`wire-rope-strength` uses `GOVERNANCE.general` over the Wire Rope Users Manual rule-of-thumb
(breaking strength proportional to diameter squared). The qualified rigger and the certified rating
govern.

## 2. The tiles

### 2.1 `multi-leg-sling` -- Multi-Leg Sling Load per Leg

```
inputs:
  total_load_lb       M              load being lifted
  num_legs            dimensionless  number of sling legs (2, 3, 4)
  horizontal_angle_deg dimensionless leg angle from horizontal

share_legs   = (num_legs >= 3) ? 2 : num_legs        # ASME: assume <= 2 legs carry a rigid load
tension_per_leg_lb = (total_load_lb / share_legs) / sin(horizontal_angle_deg)
load_factor  = 1 / sin(horizontal_angle_deg)
also report: equal-share tension = (total/num_legs)/sin(angle) for reference
```

**Pinned worked example.** 8,000 lb, 4 legs, 60 degrees from horizontal: conservative share over 2
legs -> `tension = (8000/2)/sin60 = 4000/0.866 = 4,619 lb` per leg; equal-share reference
`(8000/4)/sin60 = 2,309 lb`; load factor 1.155. **Cross-check:** the same lift at 45 degrees ->
conservative `4000/0.707 = 5,657 lb`, factor 1.414. Use the conservative value unless an engineer
qualifies an equal-share lift; the qualified rigger governs.

### 2.2 `wire-rope-strength` -- Wire-Rope Breaking-Strength Estimate and WLL

```
inputs:
  diameter_in         L              rope nominal diameter
  construction_factor dimensionless  tons per inch^2 (default 46, IPS 6x19; editable per construction/grade)
  design_factor       dimensionless  safety factor (default 5)

mbs_tons = construction_factor x diameter_in^2
wll_tons = mbs_tons / design_factor
note: "ESTIMATE only; use the manufacturer's certified breaking strength. Do not place unmarked or uncertified rope in service."
```

**Pinned worked example.** 1/2 in IPS 6x19 (factor 46): `mbs = 46 x 0.5^2 = 11.5 tons`, WLL at 5:1
`= 2.3 tons`. **Cross-check:** 3/4 in same construction: `mbs = 46 x 0.75^2 = 25.9 tons`, WLL
`= 5.2 tons`. The certified rating governs; this is a field sanity estimate, not a substitute for
the rope's documentation.

## 3. Wiring

Per tile: a `tools-data.js` row (group `Z`, trade `["rigging"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`multi-leg-sling` -> ASME B30.9; `wire-rope-strength` ->
`GOVERNANCE.general`, Wire Rope Users Manual rule-of-thumb); worked-examples fixtures (each example
+ cross-check); `compute-map.js` (`multi-leg-sling` -> `computeMultiLegSling`, `wire-rope-strength`
-> `computeWireRopeStrength`, both in `../../calc-rigging.js`); `related-tiles.mjs`
(`multi-leg-sling` -> `center-of-gravity-load-share` / `shackle-eye-bolt-wll` / `spreader-beam`;
`wire-rope-strength` -> `sling-d-d-efficiency` / `shackle-eye-bolt-wll`); `data/search/aliases.json`
(`multi-leg-sling`: "multi leg sling", "4 leg sling", "3 leg sling", "load per leg", "sling leg
tension"; `wire-rope-strength`: "wire rope breaking strength", "wire rope mbs", "rope wll",
"cable strength"); the two ids appended to the existing `RIGGING_RENDERERS` declare in `app.js`;
the `// dims:` annotations; regenerated corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, cross-checks, and error seams. Raise the `calc-rigging.js` size cap by ~20
percent if needed; bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` **+2 tiles**);
`npm test` (+4 fixtures, the new fuzzer block); `npm run build` (two new shells, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the per-leg tension and WLL lines
wrap); render-no-nan + a11y sweep, output read to the value (8,000 lb / 4 legs / 60 deg -> 4,619 lb
conservative; 1/2 in IPS -> 11.5 ton MBS).

## 5. Roadmap position

Adds the multi-leg distribution and rope-strength estimate to the heavy-lift family. The
wire-rope estimate's construction factor is a future candidate for an edition / construction
selector. Further Group Z growth stays evidence-driven.
