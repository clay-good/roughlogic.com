# roughlogic.com Specification v703 -- Refrigerant Line Size for Oil Return (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-velocity.js`** (Group C,
> HVAC/R line sizing), no new module, group, or dependency. Inherits spec.md through spec-v702.md.
>
> **The gap, and the evidence for it.** The `refrigerant-velocity` tile runs the check forward: from a mass flow, a line
> inside diameter, and a specific volume it returns the velocity and grades oil return against the riser/horizontal
> minimum. The sizing question is the inverse -- **given the flow and the oil-return minimum velocity, what is the
> largest line I can run and still sweep the oil back**. From `V = (m sv) / area / 60` with `area = (pi/4)(ID/12)^2`, the
> inverse is `ID = 12 sqrt(4 (m sv / (60 V)) / pi)`. The number this settles: **600 lb/hr** at **0.5 ft^3/lb** on a
> suction riser (1,500 fpm oil-return minimum) needs a line no larger than **0.78 in** ID.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`refrigerant-velocity` sibling: the mass flow is `M T^-1`, the specific volume is `L^3 M^-1`, the target velocity is
`L T^-1`, and the returned line ID is `L` (area `L^2`, flow `L^3 T^-1`). It reuses the sibling's ~1,500 fpm suction-riser
and ~700 fpm horizontal oil-return minimums (an orientation select fills the target; a non-positive target defaults to
1,500). The v18/v21 contract: a non-positive mass flow, specific volume, or target velocity, or any non-finite input,
returns `{ error }`. Citation discipline (v19/v22): the ASHRAE Refrigeration Handbook line-sizing relation solved for the
diameter, `GOVERNANCE.mechanical` matching the sibling; the note states that **a line at or below this ID keeps the
refrigerant fast enough to sweep oil back, a larger line traps oil while a smaller line raises the pressure drop, the
specific volume is user-supplied at the line condition, and the manufacturer's line-sizing tables govern**.

## 2. The tile

### 2.1 `refrigerant-line-size` -- Refrigerant Line Size for Oil Return

```
inputs:
  mass_flow_lb_hr          M T^-1     refrigerant mass flow (> 0)
  specific_volume_ft3_lb   L^3 M^-1   specific volume at the line condition (> 0)
  target_velocity_fpm      L T^-1     oil-return minimum velocity (> 0, default 1500 riser)

q_ft3_hr = mass_flow_lb_hr x specific_volume_ft3_lb
area_ft2 = q_ft3_hr / target_velocity_fpm / 60
line_id_in = 12 x sqrt(4 x area_ft2 / pi)
```

**Pinned worked example (suction riser).** m = 600 lb/hr, sv = 0.5 ft^3/lb, target = 1,500 fpm:
`q = 300 ft^3/hr`, `area = 300 / 1500 / 60 = 0.003333 ft^2`, `ID = 12 sqrt(4 x 0.003333 / pi) = ` **0.782 in**; feeding a
0.782 in line at 600 lb/hr and 0.5 ft^3/lb back through `refrigerant-velocity` returns 1,500 fpm, the target. On a
horizontal run (700 fpm minimum) the same flow allows a larger 1.14 in line -- the lower minimum lets the line grow.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`) placed beside `refrigerant-velocity` (Group C is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (line-velocity relation solved for the diameter,
`GOVERNANCE.mechanical` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`refrigerant-line-size` -> `computeRefrigerantLineSize`); `scripts/related-tiles.mjs`
(-> `refrigerant-velocity` / `refrigerant-mass-flow` / `superheat-subcool`); `data/search/aliases.json` (5
collision-checked question aliases: "suction line size for oil return", "max suction pipe diameter for oil return", ...);
the calc-velocity `VELOCITY_RENDERERS` map entry via a hand-written renderer (an orientation select that fills the target
velocity, no dead inputs) and the id added to the calc-velocity declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the round-trip through `computeRefrigerantVelocity` across a flow/sv/velocity sweep, the
lower-target-larger-line monotonicity, the target-defaults-to-1500 behavior, and the error seams, plus the exported
renderer added to the calc-velocity render-sentinel list. The calc-velocity.js gzip cap is expected to hold (verify at
build, including `check-shells`). Lazy-loaded, absent from home first paint. Home tile count 1,151 -> 1,152.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 0.782 in for 600 lb/hr at 0.5 ft^3/lb on a 1,500 fpm riser).

## 5. Roadmap position

Pairs the forward line-velocity check (`refrigerant-velocity`, velocity from a line size) with its inverse (line size from
the oil-return minimum velocity), the two halves of the suction-line-sizing question. Further Group C line-sizing growth
stays evidence-driven.
