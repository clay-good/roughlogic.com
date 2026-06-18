# roughlogic.com Specification v98 -- Attic Ventilation and Residential Gutter Sizing (Group E, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 653 -> 655; 25 groups; a minor stamp).** v98 inherits everything from spec.md through
> spec-v97.md and changes none of it. It adds two tiles to **Group E (Carpentry and
> Construction)** and changes no existing tile's output. **No new group, no new
> dependencies, no telemetry, no AI, US standards only.** Both land in `calc-finish.js`
> (the v95 finish-and-site-carpentry bench) -- roofing trim-out is site carpentry.
>
> **The gap, and the evidence for it.** Group E frames and covers roofs -- `roof-pitch`,
> `rafter`, `roofing-squares`, `hip-valley-rafter` -- but two roofing trim-out
> calculations a roofer or builder runs on nearly every house are missing. There is no
> **attic ventilation** tile: the net free vent area an attic needs (the IRC 1/150 rule,
> or 1/300 when the intake and exhaust are balanced and a vapor retarder is present), the
> 50/50 split between intake and exhaust, and the number of soffit vents and the linear
> feet of ridge vent that satisfies it. And there is no **residential gutter and
> downspout** tile: the adjusted (design) roof area from the plan area, the roof pitch,
> and the local rainfall intensity, the gutter size that area calls for, and the number
> of downspouts. A concept-check against the post-v97 live ids for attic-ventilation,
> roof-ventilation, net-free-area, gutter, gutter-downspout, and downspout returned
> nothing. `roof-drain-sizing` (Group B) sizes *commercial interior storm leaders* in
> GPM from the IPC tables -- a plumber's tile for a different drainage system, not K-style
> gutters; `hood-exhaust` is a kitchen tile. Neither vents an attic nor sizes a
> residential gutter. These two are daily numbers for a roofing or gutter crew.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `attic-ventilation` carries an area over a dimensionless
  divisor to a required vent area, times a 144 conversion to square inches, split in
  half and over a per-vent area to a dimensionless vent count and over a per-foot area to
  a length (ridge feet); `gutter-downspout` carries a roof area times dimensionless pitch
  and rainfall factors to an adjusted area, over a 100-sq-ft-per-square-inch rule to a
  downspout cross-section, and over a per-downspout cross-section to a dimensionless
  count. Every constant -- the 1/150 and 1/300 divisors, the 144 sq in per sq ft, the
  50/50 split, the pitch factors, the 5 in/hr reference intensity, and the 1 sq in of
  downspout per 100 sq ft rule -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive attic floor area, divisor, roof area, pitch factor, rainfall intensity, or
  downspout cross-section returns `{ error }`. Vent and downspout counts are `ceil` of
  finite ratios. The per-vent counts are `null` when no per-vent net free area is given
  (the required net free area still computes); the ridge length is `null` when no
  per-foot ridge net free area is given.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  building-code and trade-practice take-offs, not a structural design). Sources are
  named, never reproduced: the **IRC R806** attic-ventilation rule (a minimum net free
  ventilating area of 1/150 of the vented attic floor area, reducible to 1/300 when 40 to
  50 percent of the area is upper vents within 3 ft of the ridge and a Class I or II
  vapor retarder is present, with intake at least equal to exhaust); the **144 square
  inches per square foot** conversion (vents are rated in square inches of net free
  area); and the **SMACNA / standard residential gutter** method (an adjusted roof area
  from the horizontal projected area, a roof-pitch factor, and the local rainfall
  intensity against a roughly 5 in/hr reference, then a gutter size and one square inch
  of downspout per about 100 sq ft of roof). The factors, divisor choice, and per-vent
  areas are representative defaults the user edits, read from the vent's and gutter's own
  labels; local rainfall intensity comes from NOAA Atlas 14.
- Tile ids are kebab-case and checked against the post-v97 live ids. Neither collides
  with `roof-drain-sizing` (Group B), `hood-exhaust`, `roofing-squares`, or any Group E
  tile (see Section 3).

## 2. The tiles

### 2.1 `attic-ventilation` -- Attic Net Free Vent Area and Vent Count (Group E, calc-finish.js)

The vent area an attic needs and the vents that satisfy it: the required net free area
by the IRC rule, the balanced intake/exhaust split, and the soffit-vent count and
ridge-vent length.

```
inputs:
  attic_floor_area_sqft  L    vented attic floor area (sq ft)
  ratio                  -    code ratio (select): 1/150 -> divisor 150, 1/300 -> divisor 300
                              (1/300 only with a balanced split + vapor retarder)
  intake_vent_nfa_sqin   L    net free area of one intake (soffit) vent (sq in; default 9; 0 = skip count)
  ridge_nfa_per_lf_sqin  L    net free area of ridge vent per linear foot (sq in/ft; default 18; 0 = skip)

nfa_sqft   = attic_floor_area_sqft / divisor[ratio]
nfa_sqin   = nfa_sqft * 144
intake_sqin  = nfa_sqin / 2
exhaust_sqin = nfa_sqin / 2
intake_vents = intake_vent_nfa_sqin > 0 ? ceil(intake_sqin / intake_vent_nfa_sqin) : null
ridge_lf     = ridge_nfa_per_lf_sqin  > 0 ? exhaust_sqin / ridge_nfa_per_lf_sqin   : null
```

Outputs: the required net free area in square feet and square inches, the intake and
exhaust halves, the number of intake (soffit) vents, and the linear feet of ridge vent.
The note line states: the IRC wants a net free vent area of 1/150 of the attic floor,
which drops to 1/300 only when intake and exhaust are balanced (about half and half, with
40 to 50 percent of the area as upper vents near the ridge) and a vapor retarder is
present; split the area evenly between low intake (soffit) and high exhaust (ridge), and
never let exhaust exceed intake or it will pull air from the house; vents are rated in
*net free area* (square inches) on the label, which is far less than the gross opening;
and use 144 square inches per square foot to turn the required area into a vent count.

**Worked example (pinned).** A 1,500 sq ft attic, the 1/150 ratio, 9 sq in soffit vents,
an 18 sq in/ft ridge vent: net free area = 1,500 / 150 = 10 sq ft = 10 x 144 = **1,440 sq
in**; intake = exhaust = **720 sq in**; intake vents = ceil(720 / 9) = **80**; ridge =
720 / 18 = **40 ft**. Cross-check (the 1/300 ratio, balanced and with a vapor retarder):
net free area = 1,500 / 300 = 5 sq ft = **720 sq in**; intake = exhaust = **360 sq in**;
vents = ceil(360 / 9) = **40**; ridge = **20 ft**. Cross-check (a 2,000 sq ft attic at
1/150): net free area = 2,000 / 150 = 13.33 sq ft = **1,920 sq in**, intake = exhaust =
**960 sq in**, vents = ceil(960 / 9) = **107**. Degenerate inputs (attic_floor_area_sqft
<= 0, a non-positive divisor, non-finite) return an error; a per-vent net free area of 0
returns the corresponding `null` count.

### 2.2 `gutter-downspout` -- Residential Gutter and Downspout Sizing (Group E, calc-finish.js)

The gutter and downspouts a roof needs: the adjusted (design) roof area from the plan
area, the pitch, and the rainfall intensity, then the gutter size and the number of
downspouts.

```
inputs:
  roof_area_sqft        L    horizontal (plan) roof area drained (sq ft)
  pitch_factor          -    roof-pitch factor (select): <=3/12 -> 1.00, 4-5/12 -> 1.05,
                             6-8/12 -> 1.10, 9-11/12 -> 1.20, 12/12+ -> 1.30
  rainfall_in_hr        L    local 100-yr 5-min rainfall intensity (in/hr; default 5)
  downspout_sqin        L    cross-section of one downspout (sq in; default 12 -- a 3x4; 6 -- a 2x3)

adjusted_area   = roof_area_sqft * pitch_factor * (rainfall_in_hr / 5)
downspout_total_sqin = adjusted_area / 100                 (1 sq in per 100 sq ft)
downspouts      = ceil(downspout_total_sqin / downspout_sqin)
gutter_size     = adjusted_area <= 5520 ? "5 in K-style" : "6 in K-style"
```

Outputs: the adjusted roof area, the recommended gutter size, the required total
downspout cross-section, and the number of downspouts. The note line states: scale the
plan roof area by the pitch (a steeper roof catches more wind-driven rain -- about 1.05
at 4/12 up to 1.30 at 12/12) and by the local rainfall intensity against a 5 in/hr
reference; a 5 in K-style gutter handles roughly 5,500 sq ft of adjusted area and a 6 in
handles more; size one square inch of downspout per about 100 sq ft of roof (a 2x3 is 6
sq in, a 3x4 is 12); and put at least two outlets on any run longer than about 60 ft so
the gutter does not overflow at the far end.

**Worked example (pinned).** A 1,200 sq ft roof, a 6/12 pitch (1.10), 5 in/hr rain, 3x4
downspouts (12 sq in): adjusted area = 1,200 x 1.10 x (5 / 5) = **1,320 sq ft**;
recommended gutter = **5 in K-style** (1,320 <= 5,520); downspout total = 1,320 / 100 =
**13.2 sq in**; downspouts = ceil(13.2 / 12) = **2**. Cross-check (a 7 in/hr rain
region): adjusted = 1,200 x 1.10 x 1.4 = **1,848 sq ft**, downspout total = **18.48 sq
in**, downspouts = ceil(18.48 / 12) = **2**. Cross-check (a 5,000 sq ft roof, an 8/12
pitch at 1.10, 5 in/hr, 2x3 downspouts at 6 sq in): adjusted = **5,500 sq ft** -> still a
**5 in gutter** at the limit (consider stepping to 6 in), downspout total = 55 sq in,
downspouts = ceil(55 / 6) = **10**. Degenerate inputs (roof_area_sqft <= 0, pitch_factor
<= 0, rainfall_in_hr <= 0, downspout_sqin <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v97 live tiles. `roof-drain-sizing` (Group B) computes a
storm flow in GPM and sizes a *commercial interior vertical leader and sloped horizontal
storm drain* from the IPC capacity tables -- a plumber's calculation for an interior
roof-drain system, not the net free attic vent area and not a residential K-style gutter.
`hood-exhaust` is a kitchen make-up-air tile. `roofing-squares` and `roof-pitch` give the
covering quantity and the slope, not ventilation or gutters. No live tile vents an attic
or sizes a residential gutter and downspout. **Both ship**, into `calc-finish.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `E`, trades
`["roofing", "carpentry"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (the
`GOVERNANCE.general` governance from Section 1; the formula string; assumptions listing
every bundled constant -- the 150/300 divisors, the 144 sq in per sq ft, the 50/50 split
and the 40-50 percent upper-vent and vapor-retarder conditions, the pitch factors, the 5
in/hr reference, and the 1-sq-in-per-100-sq-ft downspout rule -- naming the IRC R806 and
the SMACNA / standard gutter references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-finish.js`);
`scripts/related-tiles.mjs` (`attic-ventilation` -> `roofing-squares` /
`gutter-downspout` / `insulation-thickness`; `gutter-downspout` -> `roofing-squares` /
`attic-ventilation` / `roof-drain-sizing`); `data/search/aliases.json` (e.g.
`attic-ventilation`: "attic ventilation", "net free area", "soffit vents", "ridge vent",
"1/150 rule"; `gutter-downspout`: "gutter size", "downspout sizing", "k-style gutter",
"rain gutter", "how many downspouts"); the `app.js` `FINISH_RENDERERS` declare gains both
ids; the `// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, the 1/150-versus-1/300
branch, every `ceil` count, both `null` optional-output branches, the gutter-size
threshold seam, and every error seam.

**Module note.** `calc-finish.js` (the v95 bench) is the home -- roofing trim-out is site
carpentry. The two tiles fit within the module's headroom (or the v95/v97 documented
bump path applies if the as-built size crosses the cap). The group letter (`E`) is
independent of the module; both tiles keep `group: "E"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **655 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (655 tile shells, regenerated sitemap); `npm run data:verify`;
the worked-examples runner; the 320 px shell audit (the net-free-area / intake / exhaust
/ vent-count lines and the adjusted-area / gutter / downspout lines all wrap, not scroll,
on a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (a 1,500 sq ft attic at 1/150 -> 1,440 sq in, 80
soffit vents, 40 ft ridge; a 1,200 sq ft roof at 6/12 -> 1,320 sq ft adjusted, a 5 in
gutter, 2 downspouts).

## 5. Roadmap position

v98 lands roofing trim-out in the v95 finish-and-site module, linking attic ventilation
to the insulation tiles and gutters to `roofing-squares`. Further growth should stay
evidence-driven (a named gap a roofing or gutter crew hits) -- candidates include an
**ice-and-water shield / underlayment** coverage take-off, a **drip-edge and starter**
linear take-off, and a **snow-load roof-vent baffle** count; none ships without the field
need. The standing module-cap watch continues to include `calc-finish.js`.
