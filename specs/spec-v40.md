# roughlogic.com Specification v40 — Machine Shop & Fab Bench (10 New Tiles)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.39.0, a
> minor; catalog 562 -> 572, wiring lint 29 renderer modules / 572 tile-id
> entries).** v40 is a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/
> v24/v25/v26/v27/v28/v29/v30/v31/v32/v33/v34/v35/v37/v38. It inherits everything
> from spec.md through spec-v39.md and changes none of it.
>
> v40 deepens three **existing** groups with the everyday math a working
> machinist, fabricator, and welder runs at the bench but the catalog does not
> yet cover: **Group K (Mechanic — Machinist sub-bench) +5**, **Group G
> (Cross-Trade Utilities) +2**, **Group E (Carpentry / Sheet-Metal / Welding)
> +3**. It adds **10 new tiles to existing groups**, so there is **no new group
> and no §1.1 maintainer-signoff gate**. It does add **one new compute module**,
> `calc-shop.js` — a platform addition, not a group — with the four documented
> wiring points a new module needs (§3). **No new third-party dependencies, no
> new licenses, no telemetry, no AI, US standards only.**
>
> **The thesis.** v40 holds the v29–v38 discipline: math that is **hand-verifiable
> to the last digit**, with **zero table transcription** — the user supplies the
> strength, the feed, the dimensions; the tile does the geometry and the algebra.
> Two tiles (`press-brake-tonnage`, `punch-force`) carry a published empirical /
> material constant the user can override; both cite it and neither hides a
> chart lookup. Nothing here defers to a thread chart, a tap-drill table, or a
> speeds-and-feeds book.
>
> **The gap.** The catalog already has the *cutting* primitives (`cutting-speed-
> rpm`, `drill-point-depth`), the *layout* primitives (`bolt-circle`, `sine-bar`,
> `thread-pitch`, `decimal-to-fraction`), the *weld-strength* primitives
> (`fillet-weld-strength`, `groove-weld-strength`, `weld-heat-input`,
> `weld-usage`), and the *sheet-metal* `bend-allowance`. A tradesman's
> concept-check against the 562 live tiles found **no** tile for: how long a cut
> takes, how much metal a cut removes, the surface finish a feed will leave, a
> taper's angle, a thread's measurement over wires, a dividing-head index, a
> press-brake's tonnage, a punch's force, a welder's duty cycle at a given
> amperage, or a steel's carbon equivalent and preheat band. Those are the ten
> questions this spec answers.
>
> **Count.** Measured against the live catalog of **562 tiles**, v40 reaches
> **572**. Distribution: **K +5, G +2, E +3**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to all ten new tiles.
- The v18/v21 tile contract applies from the first commit: any non-positive
  required dimension, a non-finite input, or a degenerate denominator returns
  `{ error }`; no tile throws, hangs, allocates without bound, or leaks a
  non-finite output field.
- The v19/v22 citation discipline applies to each new `citations.js` entry. Eight
  tiles are first-principles geometry / algebra (public domain), cited as such.
  Two (`press-brake-tonnage`, `carbon-equivalent`) cite a named published method
  (the air-bend tonnage rule; the IIW / AWS carbon-equivalent formula); one
  (`punch-force`) is first-principles shear with a user-supplied material
  strength.
- All ten tile ids are kebab-case and were checked against the 562 live ids; none
  collide (`machining-time`, `material-removal-rate`, `turning-surface-finish`,
  `taper-calc`, `dividing-head`, `thread-measure-wire`, `press-brake-tonnage`,
  `punch-force`, `weld-duty-cycle`, `carbon-equivalent`).
- **Module placement.** The ten tiles land in a **new module `calc-shop.js`**
  (the Machine Shop & Fabrication bench). A new module — not the existing
  Group-K `calc-mechanic.js` (19,500 B cap, near full) or the Group-E welding
  module — is the honest call: it follows the project's own standing guidance
  that a per-tile / per-bench module split is the preferred remediation before
  the next tile lands in a near-cap module (spec-v36 / spec-v39), and it follows
  the established precedent that **a tile's group letter is independent of its
  module** (spec-v28 / v36 / v38 / v39). Each tile keeps its natural group letter
  (K, G, or E); all ten live in `calc-shop.js` behind a new `SHOP_RENDERERS` map.
  The shared `tools-data.js` registry grows ten rows, within its cap.

## 2. New tiles

Each: Inputs / Output / Math / Citation / Edge cases / Worked example
(hand-verified).

### 2.1 `machining-time` — Cut Time per Pass — Group K

- **Inputs.** Cut length `L` (in, the linear distance the tool travels), and the
  feed: either feed rate directly (IPM) or spindle speed (RPM) with feed per
  revolution (IPR). Optional number of passes (default 1).
- **Output.** Feed rate (IPM), time per pass (min and s), and total time for all
  passes.
- **Math.** Feed rate `feed_IPM = RPM × IPR` (when not entered directly). Cut
  time `t = L / feed_IPM`, in minutes. Total `= t × passes`. First-principles:
  distance over rate. A note flags that `L` should include tool approach and
  overtravel, which the user adds to the cut length.
- **Citation.** Cutting time as distance / feed rate (Machinery's Handbook,
  Industrial Press), by name; first-principles arithmetic, public domain.
- **Edge cases.** `feed_IPM ≤ 0` (zero RPM, zero IPR, or zero entered feed) →
  error; `L ≤ 0` → error; passes `< 1` → error; non-finite input → error.
- **Worked example.** Turning 6.000 in at 500 RPM and 0.0100 IPR:
  `feed = 500 × 0.0100 = ` **5.000 IPM**; `t = 6.000 / 5.000 = ` **1.2000 min**
  = **72.00 s**. Four passes → **4.8000 min**.

### 2.2 `material-removal-rate` — Material Removal Rate (MRR) — Group K

- **Inputs.** A mode (milling / turning / drilling) and its dimensions —
  milling: width of cut `WOC`, depth of cut `DOC`, feed `IPM`; turning: cutting
  speed `SFM`, depth of cut `DOC`, feed `IPR`; drilling: drill diameter `D`, feed
  `IPM`.
- **Output.** MRR in cubic inches per minute (and cm³/min).
- **Math.** Milling `MRR = WOC × DOC × feed_IPM`. Turning, from `RPM = 12·SFM /
  (π·D)` and `MRR = DOC × feed_IPR × RPM × π·D`, the `π·D` cancels to the
  diameter-independent `MRR = 12 × SFM × DOC × feed_IPR`. Drilling `MRR =
  (π·D²/4) × feed_IPM`. First-principles geometry.
- **Citation.** MRR as swept volume per unit time (Machinery's Handbook), by
  name; first-principles geometry, public domain.
- **Edge cases.** Any non-positive dimension → error; non-finite → error.
- **Worked example.** Milling `0.500 × 0.100 × 10.00 = ` **0.5000 in³/min**.
  Turning at 300 SFM, 0.100 DOC, 0.0120 IPR: `12 × 300 × 0.100 × 0.0120 = `
  **4.320 in³/min**. Drilling a 0.500 in hole at 8.00 IPM:
  `(π·0.25/4)... = (π × 0.250000)/4 × 8.00`, i.e. `0.196350 × 8.00 = `
  **1.5708 in³/min**.

### 2.3 `turning-surface-finish` — Theoretical Surface Finish — Group K

- **Inputs.** Feed per revolution `f` (IPR) and tool nose radius `r` (in).
- **Output.** Theoretical peak-to-valley roughness `Rt` and an estimated `Ra`,
  in microinches and micrometers.
- **Math.** For a round-nose tool feeding faster than the radius can fully
  scallop, `Rt = f² / (8·r)`. A widely-used estimate for the arithmetic average
  is `Ra ≈ Rt / 4` (equivalently `Ra ≈ 0.032 · f² / r`). First-principles
  scallop geometry. A note: this is the *theoretical* finish from feed and nose
  radius only; built-up edge, tool wear, deflection, and vibration make the
  measured finish rougher.
- **Citation.** Theoretical surface roughness from feed and nose radius
  (Machinery's Handbook), by name; first-principles geometry, public domain.
- **Edge cases.** `r ≤ 0` → error; `f ≤ 0` → error; non-finite → error.
- **Worked example.** `f = 0.0050 in`, `r = 1/32 in = 0.031250 in`:
  `Rt = 0.0050² / (8 × 0.031250) = 0.0000250 / 0.250000 = ` **0.000100 in =
  100.0 µin**; `Ra ≈ 100.0 / 4 = ` **25.0 µin**.

### 2.4 `taper-calc` — Taper per Foot and Angle — Group K

- **Inputs.** Large diameter `D`, small diameter `d`, and the length over which
  the taper runs `L` (all in).
- **Output.** Taper per foot (TPF, in/ft), taper per inch (in/in), the included
  angle (full, degrees), and the angle per side (the compound-slide setting,
  degrees).
- **Math.** `TPI_taper = (D − d) / L`; `TPF = TPI_taper × 12`. Angle per side
  `= atan((D − d) / (2L))`; included angle is twice that. First-principles trig.
- **Citation.** Taper definitions and the taper-per-foot / angle relations
  (Machinery's Handbook), by name; first-principles trigonometry, public domain.
- **Edge cases.** `L ≤ 0` → error; `D < d` → error (large must be ≥ small);
  non-finite → error. `D = d` is a valid zero taper (TPF 0, angle 0).
- **Worked example.** `D = 1.000`, `d = 0.750`, `L = 3.000`:
  `(1.000 − 0.750)/3.000 = 0.0833333 in/in`; `TPF = ` **1.0000 in/ft**;
  angle per side `= atan(0.250/6.000) = atan(0.0416667) = ` **2.38609°**;
  included `= ` **4.77218°**.

### 2.5 `dividing-head` — Simple Indexing — Group K

- **Inputs.** The number of divisions wanted `N`, the worm ratio (default 40:1),
  and the available index-plate hole circles (a comma list, e.g. the Brown &
  Sharpe plate 1 circles `15,16,17,18,19,20`).
- **Output.** Crank turns per division as full turns + a fraction, and — for each
  hole circle that divides evenly — the exact "full turns + holes on the N-hole
  circle" setting. If no supplied circle divides evenly, a note says so (the
  division needs a different plate or differential indexing, out of scope).
- **Math.** Turns per division `= ratio / N` (40/N for the standard head). Split
  into the integer part (full crank turns) and the fraction; for a circle of `H`
  holes the move is `frac × H` holes, reported only when that product is an
  integer. First-principles ratio arithmetic.
- **Citation.** Simple (plain) indexing on a 40:1 dividing head (Machinery's
  Handbook), by name; first-principles arithmetic, public domain. Differential
  and angular indexing are noted as out of scope.
- **Edge cases.** `N < 1` → error; ratio `≤ 0` → error; non-finite → error; an
  empty / non-integer hole-circle list → error.
- **Worked example.** `N = 9`, 40:1, circles `27,54`: turns `= 40/9 = ` **4 full
  turns + 4/9 of a turn**; on the 54-hole circle `4/9 × 54 = ` **24 holes** (so
  4 turns + 24 holes); on the 27-hole circle `4/9 × 27 = ` **12 holes**.

### 2.6 `thread-measure-wire` — Three-Wire Thread Measurement — Group G

- **Inputs.** Thread pitch (enter TPI for inch, or pitch in mm for metric) and
  the pitch diameter `E` (in). Optional measuring-wire diameter `W` (defaults to
  the best-wire size).
- **Output.** The best-wire diameter, the acceptable wire range, and the
  measurement over three wires `M` (in and mm) for a 60° (UN / ISO metric)
  thread.
- **Math.** Pitch `P = 1/TPI` (inch) or the mm value converted to inches. Best
  wire `W = P / (2·cos30°) = 0.57735·P` (range 0.560·P to 0.650·P). Measurement
  over wires for the 60° form `M = E + 3W − 1.51553·P`. First-principles thread
  geometry; pairs with `thread-pitch`.
- **Citation.** The three-wire measurement-over-wires method for 60° threads and
  the best-wire / `1.51553·P` constants (Machinery's Handbook), by name;
  first-principles geometry, public domain. The pitch diameter `E` is supplied by
  the user (no thread-class table lookup here).
- **Edge cases.** Non-positive TPI / pitch → error; non-positive `E` → error; a
  user wire outside the acceptable range is flagged (not blocked); non-finite →
  error.
- **Worked example.** 1/2-13 UNC, pitch diameter `E = 0.45000 in`:
  `P = 1/13 = 0.0769231 in`; best wire `W = 0.57735 × 0.0769231 = 0.0444115 in`;
  `M = 0.45000 + 3 × 0.0444115 − 1.51553 × 0.0769231 = 0.45000 + 0.1332346 −
  0.1165792 = ` **0.466655 in**.

### 2.7 `press-brake-tonnage` — Air-Bend Tonnage — Group E

- **Inputs.** Material thickness `T` (in), bend length `L` (ft), V-die opening
  `V` (in, typically 8·T for air bending), and the material's ultimate tensile
  strength `UTS` (ksi, default 60 for mild steel).
- **Output.** Tonnage per foot and total tonnage, plus the recommended die
  opening (8·T) and minimum flange (≈ die opening × 0.7) advisories.
- **Math.** The industry air-bend rule `tons/ft = (575 × T²) / V` is the mild-
  steel (60 ksi) form; generalized linearly by strength,
  `tons/ft = (575 × (UTS/60) × T²) / V`, and total `= tons/ft × L`. Empirical
  air-bend formula; the 575 constant is the published mild-steel value. A note:
  this estimates *air bending*; bottoming and coining run substantially higher,
  and the die maker's chart governs the final setup.
- **Citation.** Press-brake air-bend tonnage formula (the 575 mild-steel
  constant) as published in press-brake tonnage charts / Machinery's Handbook,
  by name. Empirical method, cited; the user supplies geometry and may override
  the strength.
- **Edge cases.** `T ≤ 0`, `L ≤ 0`, `V ≤ 0`, `UTS ≤ 0` → error; non-finite →
  error.
- **Worked example.** `T = 0.125 in`, `L = 4.000 ft`, `V = 1.000 in` (= 8·T),
  mild steel `UTS = 60`: `tons/ft = 575 × 0.0156250 / 1.000 = ` **8.9844 tons/ft**;
  total `= 8.9844 × 4.000 = ` **35.938 tons**.

### 2.8 `punch-force` — Punch / Shear Force — Group G

- **Inputs.** Hole shape (round → enter diameter; or rectangular → enter the two
  side lengths; or enter a cut perimeter directly), material thickness `T` (in),
  and the material's shear strength `τ` (psi; ≈ 0.8 × UTS for mild steel, the
  user supplies it).
- **Output.** Cut perimeter, punching force (lb and US tons), and an estimated
  stripping force (≈ 3.5% of the punch force).
- **Math.** Perimeter from the shape (`π·D` for round, `2(a+b)` for rectangular).
  Force `F = perimeter × T × τ`; tons `= F / 2000`. First-principles shear: force
  = sheared area × shear strength. Stripping-force note is an advisory fraction.
- **Citation.** Punching force as sheared area times shear strength
  (Machinery's Handbook), by name; first-principles, public domain. The shear
  strength is user-supplied.
- **Edge cases.** Any non-positive dimension or `τ ≤ 0` → error; non-finite →
  error.
- **Worked example.** Round hole `D = 0.500 in`, `T = 0.250 in`, mild-steel
  shear `τ = 50,000 psi`: perimeter `= π × 0.500 = 1.570796 in`;
  `F = 1.570796 × 0.250 × 50,000 = 19,634.95 lb = ` **9.8175 tons**; stripping
  `≈ 0.035 × 19,634.95 = ` **687.2 lb**.

### 2.9 `weld-duty-cycle` — Welder Duty Cycle — Group E

- **Inputs.** The machine's rated amperage `A₁` and rated duty cycle `DC₁` (%),
  and a target operating amperage `A₂`.
- **Output.** The allowable duty cycle at `A₂` (% and minutes on per 10-minute
  window), and the maximum continuous (100%) amperage.
- **Math.** Heating is resistive, so the duty cycle scales inverse-square with
  current: `DC₂ = DC₁ × (A₁/A₂)²`, capped at 100%. Minutes-on `= DC₂ × 10`.
  Maximum continuous amperage `A₁₀₀ = A₁ × sqrt(DC₁/100)`. First-principles
  I²-heating relation (NEMA EW-1 duty-cycle convention).
- **Citation.** The inverse-square duty-cycle relation (NEMA EW-1 arc-welding
  power-source convention), by name; first-principles, public domain.
- **Edge cases.** `A₁ ≤ 0`, `A₂ ≤ 0`, `DC₁` outside 0–100 → error; non-finite →
  error. `A₂ ≤ A₁₀₀` yields a 100% (capped) result, flagged as continuous.
- **Worked example.** Rated 250 A at 60%. At `A₂ = 300 A`:
  `DC₂ = 60 × (250/300)² = 60 × 0.694444 = ` **41.67% = 4.167 min per 10 min**.
  Maximum continuous `A₁₀₀ = 250 × sqrt(0.60) = 250 × 0.774597 = ` **193.6 A**.

### 2.10 `carbon-equivalent` — Carbon Equivalent and Preheat Screen — Group E

- **Inputs.** Steel chemistry, weight percent: carbon `C`, manganese `Mn`,
  chromium `Cr`, molybdenum `Mo`, vanadium `V`, nickel `Ni`, copper `Cu` (each
  defaulting to 0). Optional thickness for the advisory note.
- **Output.** The IIW carbon equivalent `CEIIW` and a plain-English weldability /
  preheat band.
- **Math.** `CEIIW = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15`. First-principles
  weighted sum (the IIW / AWS D1.1 formula). Advisory bands: `< 0.35` readily
  weldable, low preheat risk; `0.35–0.55` preheat generally advised; `> 0.55`
  high hardenability / hydrogen-cracking risk, preheat and low-hydrogen process
  required. A note: this is a *screen*, not a welding procedure; the WPS, hydrogen
  level, restraint, and thickness govern the actual preheat (AWS D1.1 Annex).
- **Citation.** The IIW carbon-equivalent formula as adopted in AWS D1.1
  Structural Welding Code, by name; published formula, cited. Output is a
  screening band, not a qualified procedure.
- **Edge cases.** Any negative percent → error; all-zero chemistry → `CE = 0`
  with a "enter a composition" note; non-finite → error.
- **Worked example.** ASTM A36-type plate, `C = 0.250`, `Mn = 0.800`, others 0:
  `CE = 0.250 + 0.800/6 = 0.250 + 0.133333 = ` **0.38333** → the `0.35–0.55`
  band, "preheat generally advised."

## 3. Wiring and gates

This spec adds a **new module**, so the four documented module wiring points
apply (spec-v36 / spec-v39 precedent), plus the per-tile wiring:

- **New module `calc-shop.js`** with a `SHOP_RENDERERS` map holding all ten
  compute functions, renderers, and `*Example` constants. It imports only the
  shared ui-fields helpers (`makeNumber` / `makeSelect` / `makeOutputLine` /
  `attachExampleButton` / `debounce` / `fmt` / `DEBOUNCE_MS`) and defines a
  module-local `_finiteGuard`, matching the calc-fab / calc-mechanic pattern.
- **`scripts/build.mjs`** `FILES`: add `calc-shop.js`.
- **`sw.js`** `SHELL_ASSETS` precache: add `calc-shop.js`.
- **`scripts/check-module-sizes.mjs`**: add a `calc-shop.js` cap (start 16,000 B;
  ten small first-principles tiles fit with headroom).
- **`app.js`**: register the new `SHOP_RENDERERS` declare list and lazy-load
  branch (the module is lazy-loaded; the home-view payload is unaffected).
- **Per tile** (×10): `tools-data.js` (a `spec-v40` section after the group
  blocks, each row carrying its natural `group:` letter — K, G, or E — and
  `trades`), `tile-meta.js` (`_TILES`), `citations.js`,
  `test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js` (module
  path `../../calc-shop.js`), `scripts/related-tiles.mjs` (link `machining-time`
  / `material-removal-rate` / `turning-surface-finish` to `cutting-speed-rpm`;
  `thread-measure-wire` to `thread-pitch`; `taper-calc` to `sine-bar`;
  `press-brake-tonnage` to `bend-allowance`; the weld tiles to the existing weld
  bench), `data/search/aliases.json` (3–5 aliases each), the `// dims:`
  annotation, the regenerated v14 corpus + tile-index, and a
  `test/unit/bounds-fuzzer.test.js` row per tile pinning each worked example
  (both directions where a tile solves both) and the error seams. Appended after
  the original group blocks, so the per-block citation counts are unaffected; the
  catalog-wide citation-coverage lint covers the new entries.

## 4. As-landed verification (gate plan)

On landing, the same green bar the recent tile specs cleared: `npm run lint`
(every gate, including the v31 `check-multiline-inputs` gate and the em-dash /
gzip-cap gates), `npm test` (the unit suite, +~50 rows for the ten tiles and
their error seams), `npm run build`, `npm run data:verify`, the worked-examples
runner (+10 fixtures), the 320 px shell audit (572 tile shells), and the
full-catalog render-no-nan Chromium sweep (all ten verified clean). The wiring
lint must report **29 renderer modules / 572 tile-id entries**.

## 5. Roadmap position

v40 stands up the Machine Shop & Fab bench as its own module, giving the next
machinist / fabricator / welder tiles a home with headroom while the near-cap
modules (`calc-mechanic.js` 95.6%, `calc-agriculture.js`, `calc-plumbing.js`,
`calc-electrical.js`, and the `tools-data.js` registry) stay on the documented
per-tile-split watch list. **Considered and deferred this round**, each for a
stated reason, as the obvious next candidates for `calc-shop.js`:

- `tap-drill-size` — held over from spec-v38's roadmap. The percent-thread-
  engagement form (`% = 76.98 · (D_major − D_drill) · TPI` for 60° threads) is
  in fact a hand-verifiable closed form, so it is a strong v41 candidate; it
  carries the prior note that the *named drill letter / fraction* for a result is
  a chart lookup, which the tile would report as the nearest standard size only
  with that caveat.
- `rolled-blank` — developed neutral-axis length for rolling plate into a
  cylinder or ring (`L = π·(OD − T)` at the mid-thickness neutral axis,
  k-factor-adjustable). Clean first-principles; deferred only to keep this spec
  at ten.
- `gas-cylinder-duration` — shielding-gas runtime (`minutes = cylinder_ft³ /
  cfh`). Trivially first-principles; deferred for the same reason.
- `weld-cost-per-foot` — deposition-rate / wire-cost / labor roll-up. Deferred
  pending a decision on whether it overlaps `weld-usage` and `time-and-materials`
  enough to be redundant.
