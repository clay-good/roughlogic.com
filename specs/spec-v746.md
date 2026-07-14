# roughlogic.com Specification v746 -- Pipe Insulation Thickness for a Target Heat Loss (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v745.md. Explore sweep #13 (entry 1, final).
>
> **The gap, and the evidence for it.** The `pipe-heat-loss-radial` tile runs the log-mean cylindrical conduction forward:
> from an insulation thickness it returns the heat loss per foot. The design question is the inverse -- **the insulation
> thickness that caps the radial heat loss at a target rate**. From `q = 2*pi*(k/12)*(hot - amb)/ln(r2/r1)` with r1 = od/2,
> `thickness = (od/2) x (exp(2*pi*(k/12)*(hot - amb)/q) - 1)`. This is distinct from the existing `insulation-thickness`
> tile, which targets a **surface temperature** (iteratively); this one targets a **heat-loss** budget in closed form. The
> number this settles: a **2 in** pipe at **200 F** in **70 F** air with **k 0.25** held to **40 BTU/hr/ft** needs about
> **0.53 in** of insulation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pipe-heat-loss-radial` sibling: the OD, thickness, and outer radius are `L` (in), the k-value is dimensionless
(BTU-in/hr-ft2-F), the temperatures are `T` (F), and the target heat loss is `M L T^-3` (BTU/hr per ft). It reuses the
sibling's log-mean cylindrical conduction, solved for the thickness. The v18/v21 contract: any non-finite input, a
non-positive OD, k-value, or target heat loss, or a hot surface **at or below ambient** (no outward heat loss to cap)
returns `{ error }`. Citation discipline (v19/v22): the conduction relation solved for the thickness,
`GOVERNANCE.mechanical` matching the sibling; the note states that this targets a **heat-loss budget** (energy code,
process, freeze protection) distinct from the surface-temperature tile, to **round up to a stocked wall** and re-check,
that the **k rises with temperature** (use the mean-insulation-temperature value), and that it is **conduction only**
(ignoring the outer air film, so conservative).

## 2. The tile

### 2.1 `insulation-thickness-for-heat-loss` -- Pipe Insulation Thickness for a Target Heat Loss

```
inputs:
  od_in                   L             pipe outer diameter (in, > 0)
  k_value                 dimensionless insulation k (BTU-in/hr-ft2-F, > 0)
  hot_f                   T             hot surface temperature (F)
  amb_f                   T             ambient temperature (F, below hot)
  target_q_per_ft_btuh    M L T^-3      target heat loss per foot (BTU/hr per ft, > 0)

r1           = od_in / 2
r2_in        = r1 x exp( 2*pi*(k_value/12)*(hot_f - amb_f) / target_q_per_ft_btuh )
thickness_in = r2_in - r1
```

**Pinned worked example.** od = 2 in, k = 0.25, hot = 200 F, amb = 70 F, target q = 40 BTU/hr/ft:
`r1 = 1 in`, `r2 = 1 x exp(2*pi*(0.25/12)*130 / 40) = exp(0.4254) = 1.530 in`, `thickness = ` **0.53 in**. Feeding 0.53 in
back through `pipe-heat-loss-radial` at the same pipe returns a 40 BTU/hr/ft loss, the target. A tighter 20 BTU/hr/ft
target grows the thickness to about 1.34 in.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","plumbing"]`) placed beside `pipe-heat-loss-radial` (Group C is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (conduction relation solved for the
thickness, `GOVERNANCE.mechanical` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`insulation-thickness-for-heat-loss` -> `computeInsulationThicknessForHeatLoss`);
`scripts/related-tiles.mjs` (-> `pipe-heat-loss-radial` / `insulation-thickness` / `insulation-heat-loss`);
`data/search/aliases.json` (5 collision-checked question aliases: "insulation thickness for heat loss", "how much
insulation for heat loss", ...); the calc-hvac `HVAC_RENDERERS` map entry via a hand-written renderer (five number fields)
and the id added to the calc-hvac declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computePipeHeatLossRadial` across an od/k/temp/target sweep, the tighter-target-more-insulation
monotonicity, and the error seams (including the hot <= amb guard). The calc-hvac.js gzip cap (raised to 77000 B in this
spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,194 -> 1,195.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.53 in for a 2 in pipe at
200 F in 70 F air held to 40 BTU/hr/ft).

## 5. Roadmap position

Pairs the forward heat-loss tile (`pipe-heat-loss-radial`, loss from the thickness) with its inverse (the thickness for a
loss), the two halves of the pipe-insulation question, and complements the surface-temperature-targeted
`insulation-thickness` tile. Closes Explore sweep #13; a fresh sweep opens the next batch. Further Group C HVAC growth
stays evidence-driven.
