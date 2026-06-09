# roughlogic.com Specification v24 — Catalog Expansion VIII (Trade-Floor Deepening: 12 New Tiles + 3 Enhancements)

> **Implementation status: LANDED 2026-06-09 (package 0.26.0, jointly with
> spec-v25).** v24 is a catalog-growth spec in the lineage of
> v15/v16/v17/v20/v23. It inherits everything from spec.md through spec-v23.md
> and changes none of it.
>
> **As-landed count (reconciled).** The draft summary below stated a 12-tile
> delta with an "A +3, E +3, G +1, K +2, N +3" distribution, but the spec
> body (sections 3-6) specifies only **10** new tiles — A +3, E +3, G +1,
> N +3 — and **no Group K new-tile section exists anywhere in the body**
> (Group K appears only as the EN.1 `tire-gearing` *enhancement*). Rather
> than fabricate two uncited Group K tiles to hit the number, the build
> landed exactly the 10 specified tiles plus the 3 enhancements. Catalog
> **515 -> 525** for v24; package stamps **0.25.0** at the v24 close
> (rolled to 0.26.0 by v25). See the 2026-06-09 stanza in
> [../docs/audit-trail.md](../docs/audit-trail.md).
>
> The original draft text follows unchanged for the record. It adds
> **10 new tiles across four existing groups** (A Electrical, E Construction,
> G Cross-Trade, N Stage/Live) plus **3 additive enhancements**
> to existing tiles. **No new groups, no new third-party dependencies, no new
> licenses, no telemetry, no AI, US standards only.** Every new tile ships
> with the full v14 discipline (dimensional annotation, bounds-fuzzer row,
> worked-example fixture cross-checked against its cited source, a complete
> inline `citations.js` entry with a relevant single-edition note, a
> `tile-meta.js` row with related-tiles and at least three search aliases,
> and a prerendered shell that passes the 320px audit) and is born into the
> hardened v18/v21 output contract and the v19/v22 citation discipline from
> its first commit. The package stamps **0.25.0** at the close.
>
> **The thesis.** The catalog is broad (515 tiles, 24 groups) but the audit
> behind v23 left one observation unrecorded: a handful of the *most-reached-
> for* numbers on a working trade floor are still missing, not because they
> are exotic but because they are so routine the prior expansions reached
> past them for the rarer tile. The headline is **conduit bending** — the
> single most-performed piece of field math an electrician does in a day
> (offset marks, three-point saddles, 90° stub deducts) and the site does not
> compute it. v24 is the "obvious in hindsight" pass: each tile is one
> formula a tradesperson already does by hand or on a paper wheel, made
> exact, cited, and shareable.
>
> **Count.** Measured against the live catalog of **515 tiles**, v24 reaches
> **527**. Distribution of new tiles: **A +3, E +3, G +1, K +2, N +3.** The
> three enhancements change no tile id and no group count.
>
> Every per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests per the v9/v12/v15/v16/v17/v20/v23 pattern; every enhancement
> is Tile / Change / Why / Math / Tests. Group-specific disclaimers apply
> unchanged (the code-dependent A/E tiles carry the "AHJ-adopted edition
> governs" note; the bending tiles additionally carry a "bender deduct/shoe
> figures are tool-specific — confirm against your bender's marked values"
> note).

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile and to every enhanced compute
  path.
- The v18/v21 tile contract (totality, purity, domain honesty, unit-toggle
  consistency, flag-threshold correctness, magnitude safety, render
  faithfulness; no non-finite numeric field, ever) applies to every new and
  changed function from the first commit. Each enhancement that adds a
  solve-for/inverse mode adds a guard for the new zeroable denominator the
  inverse introduces (the v21 RC-1 seam) in the same commit.
- The v19/v22 citation discipline (inline, current, linkified, wraps at
  320px, edition-note relevance) applies to every new `citations.js` entry.
  No new tile carries a foreign edition note (the v22 CF-01 class).
- Tile ids below are kebab-case and were checked against all 515 live ids;
  none collide. Letter.number labels are scoped to v24.
- The bending and metal-weight tiles bundle **no paywalled lookup**. Bender
  deduct/take-up figures and alloy densities are user-supplied or a declared
  public shard per spec-v12 §H. Where an edition/section is uncertain, the
  citation names the authority **by name** and directs the user to confirm
  the locally adopted edition (v22 §2).
- The conduit-bending geometry is the public cosecant/half-angle
  trigonometry taught in the electrical apprenticeship — it is **author-
  original first-principles trig**, not a reproduction of any proprietary
  bender chart (v14 §G first-principles class).

---

# Part I — Enhancements to existing tiles (3)

Each enhancement is additive: it adds an output, an input, or a mode to a
tile that already ships. None changes a default that would alter an existing
correct output without the user opting in.

## 2. Group K / N — Mechanic and Stage

### EN.1 `tire-gearing` — add speedometer-error output
**Change.** Add a stock-vs-new tire diameter (or revs-per-mile) pair and
output the speedometer error: indicated vs actual speed and the percent
error, with an over-/under-reading flag. **Why.** The tile already derives
the effective gear ratio from a tire-size change; the question the driver
*actually* has after a tire swap is "how far off is my speedo and odometer?"
**Math.** `actual = indicated × (new_dia / old_dia)`; `error% = (new_dia −
old_dia) / old_dia × 100`; equivalently from revs/mile. **Tests.** Equal
diameters → 0% error (no-op); a 3% larger tire under-reads by ~2.9% (C-4
unit-toggle round-trip dia ↔ revs/mile); `old_dia = 0 → { error }` (RC-1).

### EN.2 `spl-distance` — add incoherent multi-source summation
**Change.** Add an optional "number of identical sources" input and report
the combined SPL. **Why.** Two identical speakers are not twice as loud; the
inverse-square tile stops one step short of the array question. **Math.**
Incoherent sum of N equal sources `L_total = L_one + 10·log10(N)` (+3 dB per
doubling); the distance term is unchanged. **Citation.** Already cites the
inverse-square / ANSI basis; the 10·log10(N) addition is the public
incoherent-summation identity. **Tests.** N = 1 reproduces the current
output (backward-compatible default); N = 2 → +3.01 dB; `N ≤ 0 → { error }`.

### EN.3 `bend-allowance` — add bend-deduction and flat-pattern length
**Change.** Add the bend deduction (BD) and the developed flat-pattern length
for a part with one or more bends, beside the existing per-bend bend
allowance. **Why.** A fabricator cuts the *flat blank*; bend allowance alone
does not give the blank length. **Math.** `BD = 2·OSSB − BA` where
`OSSB = (R + T)·tan(θ/2)` (outside setback) and `BA` is the existing
allowance; `flat = Σ(flange lengths) − Σ(BD)`. **Citation.** Already cites
the bend-allowance / K-factor basis (public sheet-metal geometry); the BD and
flat-pattern identities are the same source. **Tests.** Single 90° bend BD
matches a published table value; a two-bend channel flat-pattern cross-check;
`flat` never negative for valid flanges.

---

# Part II — New tiles (12)

Each new tile is one formula, one cross-check, one tolerance, one named US
authority, and is born into the v21 contract and v22 citation discipline.

## 3. Group A — Electrical: the conduit-bending suite (3 tiles → calc-electrical.js)

These three tiles together cover the bending math an electrician performs
daily. The geometry is exact public trigonometry; only the **bender deduct /
take-up** figures are tool-specific and therefore user-supplied (with the
common EMT defaults offered as a starting point and flagged as confirm-
against-your-shoe). All three carry the "confirm bender deduct/shoe figures"
note and cross-link to `conduit-fill`, `cable-bend-radius`, and each other.

### A.1 Conduit offset bend (`conduit-offset`)
**Inputs.** Offset depth (in), bend angle (preset 10°/22.5°/30°/45°/60° or
custom), conduit trade size (for the optional gain/deduct context). **Output.**
Distance between the two bend marks (center-to-center), the total shrink
(how much shorter the run becomes), the adjusted first-mark location from a
reference point, and the chosen angle's multiplier and shrink-per-inch.
**Math.** Distance between marks `= offset × cosecant(θ) = offset / sin θ`
(so the classic multipliers 30°→2.0, 45°→1.41, 22.5°→2.61, 60°→1.15,
10°→5.76 fall out exactly); shrink `= offset × tan(θ/2)` (so 30°→¼ in,
45°→⅜ in, 22.5°→³⁄₁₆ in per inch of offset, matching the field rules of
thumb). **Citation.** "Standard conduit-bending trigonometry (the cosecant
multiplier and half-angle shrink) as taught in the electrical
apprenticeship and summarized in Ugly's Electrical References / the NECA
bending guidance, by name; first-principles trig, no proprietary chart
reproduced. NEC Chapter 9 / Article 358 bend-radius and 360°-per-run limits
govern the install; cross-check the minimum radius with `cable-bend-radius`."
**Edge cases.** θ outside (0°, 90°) rejected; box offsets (small fixed
angle) noted as a special case; the multiplier blows up as θ→0 (flagged, not
leaked as Infinity — RC-1). **Tests.** Six unit tests; 6-in offset at 30° →
12-in mark spacing, ¾·6 = 1.5-in shrink; multiplier table cross-check.

### A.2 Conduit saddle bend (`conduit-saddle`)
**Inputs.** Mode (three-point / four-point), obstruction depth (in),
center-bend configuration (preset 45°/22.5° or 60°/30° for three-point; the
two equal offsets for four-point), distance to the obstruction center from a
reference. **Output.** The center-mark location, the two (or, for four-point,
two pairs of) outer-mark locations, the total shrink, and the bend angles to
dial at each mark. **Math.** Three-point: center bend `= 2θ`, two outer bends
`= θ`; outer marks at `depth × cosecant(2θ)` from the center (the 45°/22.5°
case gives the field "2.5 × depth" spacing and ³⁄₁₆-in-per-inch shrink); the
saddle apex sits at the center mark. Four-point: two back-to-back offsets,
each per A.1, separated by the obstruction width. **Citation.** "Standard
three-/four-point saddle-bend geometry as taught in the electrical
apprenticeship and Ugly's Electrical References, by name; first-principles
trig. The bender's marked center-notch / rim-notch reference governs which
mark aligns with the bend point — confirm against your tool." **Edge cases.**
Three-point shrink applied once (not per outer bend); a saddle taller than
the conduit can clear at the chosen angle flagged; the 45°/22.5° and 60°/30°
presets are the only two that keep the conduit in-plane. **Tests.** Six unit
tests; 3-in obstruction, 45°/22.5° → 7.5-in outer-mark spacing, ⁹⁄₁₆-in
shrink (3 × ³⁄₁₆).

### A.3 Conduit 90° stub and back-to-back (`conduit-90-stub`)
**Inputs.** Mode (stub-up / back-to-back / segment-90), desired stub height
to the back of the bend (in), bender take-up/deduct for the trade size
(user-supplied; common EMT defaults ½″→5″, ¾″→6″, 1″→8″, 1¼″→11″ offered and
flagged confirm-against-your-shoe), for back-to-back the desired back-to-back
dimension and for a segment-90 the radius and per-shot angle. **Output.**
The mark location(s): stub bend mark `= desired height − deduct`; back-to-back
second mark `= back-to-back length + (first stub height)` per the take-up
rule; segment-90 the per-shot spacing and shot count to sweep 90°. **Math.**
Stub: `mark = H − deduct`. Back-to-back: the far mark referenced from the
near stub. Segment (large-radius) 90: `n = 90° / per_shot_angle`, marks at
`arc_per_shot = R × per_shot_angle(rad)`. **Citation.** "Standard 90°
stub-up deduct (take-up) and segment-bend geometry from the electrical
apprenticeship / Ugly's Electrical References, by name; the deduct is the
bender-shoe constant (tool-specific, user-supplied). NEC Article 358 minimum
radius and the four-quarter-bends-per-run limit govern." **Edge cases.**
`mark = H − deduct < 0` (stub shorter than the deduct) flagged as
impractical, not leaked negative; segment per-shot angle that does not divide
90° evenly rounds the shot count up and notes the residual. **Tests.** Six
unit tests; ¾″ EMT, 8-in stub, 6-in deduct → 2-in mark; segment 90° at 5°
shots → 18 shots.

## 4. Group E — Construction: welding, metal, and layout (3 tiles → calc-construction.js)

### E.1 Welding heat input (`weld-heat-input`)
**Inputs.** Welding process (SMAW / GMAW / FCAW / GTAW / SAW, which sets the
default thermal-efficiency factor), arc voltage (V), current (A), travel
speed (in/min or mm/min), optional WPS heat-input min/max for a pass/fail.
**Output.** Heat input in kJ/in and kJ/mm, the arc energy before the
efficiency factor, and (if a WPS range is entered) a within-range pass/fail.
**Math.** Arc energy `= (60 × V × I) / TS` (J per unit length); heat input
`HI = arc_energy × η / 1000` (kJ per unit length), with η defaulting to 0.8
(SMAW/GMAW/FCAW), 0.6 (GTAW), 1.0 (SAW) per the process — user-editable.
**Citation.** "Per the AWS D1.1 Structural Welding Code and ASME BPVC Section
IX heat-input definition `HI = (60·V·I)/TS`, by name, with the arc-
efficiency factor by process; the governing WPS/PQR ranges are user-supplied.
Free overviews at aws.org; the adopted code edition and the qualified WPS
govern." **Edge cases.** Travel speed ≤ 0 rejected (RC-1); η outside (0, 1]
rejected; the kJ/in↔kJ/mm toggle is exact (×0.0394). **Tests.** Six unit
tests; 25 V, 200 A, 8 in/min, η 0.8 → 30,000 J/in arc energy, 24 kJ/in HI;
unit-toggle round-trip (C-4); WPS-range boundary flag (C-5).

### E.2 Metal weight by shape and alloy (`metal-weight`)
**Inputs.** Shape (plate/sheet, round bar, square bar, hex bar, round
tube/pipe, rectangular tube, angle, flat bar), the governing dimensions for
that shape, length, quantity, and alloy (a short bundled density table —
carbon steel 0.2836, stainless 0.289, aluminum 6061 0.098, copper 0.323,
brass 0.307 lb/in³ — or a user-supplied density). **Output.** Weight per
piece and total (lb and kg), plus the cross-sectional area used. **Math.**
`weight = cross_section_area × length × density × quantity`; per-shape area
from geometry (tube `= π/4·(OD² − ID²)`, hex `= 0.866·width²`, etc.).
**Citation.** "First-principles `weight = volume × density`; densities are
the published nominal values for the common alloys (a small bundled public
reference shard per spec-v12 §H) or user-supplied. Mill certs and the actual
alloy temper govern the real figure." **Edge cases.** ID ≥ OD for a tube
rejected; a custom density ≤ 0 rejected; nominal pipe-size vs actual OD noted
(use actual OD/ID). **Tests.** Six unit tests; a 1″×12″×120″ A36 plate ≈ 408
lb; tube area cross-check; lb↔kg round-trip (C-4).

### E.3 Layout squaring and out-of-square check (`layout-squaring`)
**Inputs.** Mode (find-diagonal / check-square); for find-diagonal the two
side lengths; for check-square the two sides plus the two measured diagonals.
**Output.** Find-diagonal: the ideal diagonal (the 3-4-5 hypotenuse) and the
nearest whole-number multiple to pull (6-8-10, 9-12-15…). Check-square: the
out-of-square amount (the difference between the two diagonals and between
measured and ideal), and which corner to push to bring it square. **Math.**
`diagonal = √(a² + b²)` (Pythagoras / the 3-4-5 rule); for a rectangle the
two diagonals are equal when square, so `out_of_square = |d1 − d2|` and the
longer diagonal's corner is the one to draw in. **Citation.** "The
Pythagorean 3-4-5 right-angle layout method (public); the standard
foundation- and deck-squaring technique. A layout aid, not a substitute for a
transit or a string-line check on long runs." **Edge cases.** Negative or
zero sides rejected; a measured diagonal physically impossible for the sides
(triangle-inequality violation) flagged; the rack-to-square direction is
advisory. **Tests.** Six unit tests; 3 and 4 → 5 exactly; 12 and 16 → 20;
equal diagonals → 0 out-of-square.

## 5. Group G — Cross-Trade: rolling offset (1 tile → calc-cross.js)

### G.1 Rolling offset (`rolling-offset`)
**Inputs.** Vertical rise (in), horizontal roll/run-over (in), fitting angle
(preset 45°/22.5°/11.25°/60° or custom). **Output.** The true offset (the
diagonal both planes combine to), the travel (center-to-center fitting
length along the pipe), the run advance (how far the line moves along its
original direction), and the chosen angle's multiplier. **Math.** True offset
`= √(rise² + roll²)`; travel `= true_offset × cosecant(θ)` (45°→1.414,
22.5°→2.613, 11.25°→5.126, 60°→1.155); run advance `= true_offset / tan θ`.
**Citation.** "First-principles rolling-offset trigonometry used in pipe
fitting and conduit work (the Pythagorean true-offset and the cosecant travel
multiplier); public, as taught in NCCER pipefitting and the standard fitter's
references. Fitting make-up/take-out is product-specific and user-supplied.
Pairs with `conduit-offset` (the single-plane case) and the plumbing pipe
tiles." **Edge cases.** θ outside (0°, 90°) rejected; rise = roll = 0 → true
offset 0 (degenerate, flagged); the multiplier is reported, not the leaked
Infinity as θ→0 (RC-1). **Tests.** Six unit tests; rise 12, roll 9 → true
offset 15; 15 × 1.414 at 45° → 21.2-in travel; multiplier table cross-check.

## 6. Group N — Stage and Live Production: audio electronics (3 tiles → calc-stage.js)

Group N has the SPL/inverse-square and distribution math but not the
day-of-show speaker-electronics math. These three close that gap and
cross-link to `spl-distance`, `power-distro`, and `ohms-law`.

### N.1 Speaker impedance network (`speaker-impedance`)
**Inputs.** Wiring topology (series / parallel / series-parallel), the
per-driver nominal impedance(s) (Ω), the count, and the amplifier's minimum
rated load (Ω) for a safety check. **Output.** The total network impedance,
a "safe / below amp minimum" verdict, and (with a per-driver power rating)
the power split across drivers. **Math.** Series `Z = ΣZ_i`; parallel
`Z = 1 / Σ(1/Z_i)` (equal drivers `= Z/N`); series-parallel combines the two;
verdict `Z_total ≥ amp_min`. **Citation.** "Ohm's-law series/parallel
impedance combination (public); the amplifier-minimum-load check follows the
manufacturer's rated minimum (user-supplied). A nominal-impedance estimate —
real loudspeaker impedance is frequency-dependent; the amp's spec governs."
**Edge cases.** Any driver impedance ≤ 0 rejected; an empty network → `{
error }`; below-minimum load fires the verdict flag (C-5), it does not block
the number. **Tests.** Six unit tests; four 8 Ω in parallel → 2 Ω; two 8 Ω
series → 16 Ω; below-2 Ω flag at the amp minimum.

### N.2 Decibel converter (`decibel-converter`)
**Inputs.** Mode (power ratio / voltage (or pressure) ratio / reference-level
{dBu, dBV, dBSPL} / combine incoherent sources), and the corresponding
inputs (two powers, two voltages, a level + reference, or a list of source
levels). **Output.** The decibel value (or the linear value back-solved), and
for the combine mode the summed level. **Math.** Power `dB = 10·log10(P2/P1)`;
voltage/pressure `dB = 20·log10(V2/V1)`; dBu ref 0.775 V, dBV ref 1 V, dBSPL
ref 20 µPa; incoherent sum `L = 10·log10(Σ 10^(L_i/10))`. **Citation.** "Per
the ANSI S1.1 acoustical-terminology decibel definitions (power 10·log,
field-quantity 20·log) and the standard reference levels (dBu 0.775 V, dBV
1 V, dBSPL 20 µPa), by name; public. Complements `spl-distance`." **Edge
cases.** A ratio with a zero or negative argument rejected (log domain,
RC-1); the 10·log vs 20·log distinction is mode-locked so a power ratio can
never be read as a voltage ratio. **Tests.** Six unit tests; P2/P1 = 2 →
3.01 dB; V2/V1 = 2 → 6.02 dB; +4 dBu ≈ 1.228 V; two 90 dB sources → 93.01 dB.

### N.3 Amplifier power to SPL and headroom (`amp-power-spl`)
**Inputs.** Speaker sensitivity (dB @ 1 W / 1 m), amplifier power per channel
(W), listening distance (m or ft), optional crest-factor/headroom (dB) for
the program material. **Output.** The continuous SPL at the listener, the
peak SPL after headroom, and the power needed to hit a target SPL (inverse).
**Math.** `SPL(d) = sensitivity + 10·log10(P) − 20·log10(d / 1 m)`; peak
`= SPL + crest_factor`; inverse `P = 10^((target − sensitivity +
20·log10(d))/10)`. **Citation.** "First-principles loudspeaker SPL from the
1 W / 1 m sensitivity reference, the 10·log power term, and the inverse-
square distance term (public; ANSI S1.1 decibel basis). Free-field estimate —
room gain, power compression, and driver excursion limits are not modeled;
the manufacturer's max-SPL spec governs." **Edge cases.** Distance ≤ 0 or
power ≤ 0 rejected (RC-1); a target SPL beyond the driver's rated max flagged
as unachievable, not leaked. **Tests.** Six unit tests; 90 dB sensitivity,
100 W, 1 m → 110 dB; doubling power → +3 dB; inverse round-trip (C-4).

---

## 7. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20/v23 foreword discipline, candidates that duplicate an existing
tile by concept were dropped rather than relabeled:

- `compression-ratio` and `engine-displacement` — covered by `displacement-cr`
  (Engine Displacement and Compression Ratio).
- `consumable-weight` / `welding-rod-usage` — covered by `weld-usage`
  (Welding Rod and Wire Usage); v24 adds only the *heat-input* gap.
- `speaker-spl-at-distance` (inverse-square only) — covered by `spl-distance`;
  N.3 adds the power/sensitivity/headroom dimension instead.
- `pythagorean-theorem` — the generic case is in the `geometry` pack; E.3 is
  the field-specific *squaring / out-of-square diagnosis* use, not a renamed
  Pythagoras.
- `conduit-bend-radius` — covered by `cable-bend-radius`; the bending suite
  cross-links it rather than duplicating the radius limit.

## 8. Acceptance

v24 is complete when: (a) each of the 12 new tiles ships with the full v14
discipline (dimensional annotation, bounds-fuzzer row, worked-example fixture
cross-checked against its cited source, complete inline `citations.js` entry
with a relevant single-edition note, `tile-meta.js` entry with related-tiles
and ≥ 3 aliases, and a prerendered shell that passes the 320px audit);
(b) each of the 3 enhancements lands additively, changes no existing correct
output without an opt-in, and adds a guard for any new zeroable denominator
its mode introduces (v21 RC-1); (c) every new and changed function passes the
v21 contract sweep (no non-finite numeric field) and the v22 citation gates;
(d) `npm test` and `npm run lint` are green; (e) the catalog count advances by
exactly 12 (515 → 527); (f) package stamps 0.25.0; (g) the v24 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the new-tile and
enhancement counts per group.

## 9. Closing note

v20 added the next fifty-five; v23 added the inverse questions and the
professional reach-fors. v24 adds the dozen numbers a tradesperson does *by
hand* every shift — the offset multiplier chalked on a stick of EMT, the
saddle marks for a pipe in the way, the heat input a welding inspector will
ask for, the speaker load before the amp goes into protection. Nothing here
is exotic. That was the point: a field-math site that cannot bend a piece of
conduit has a gap exactly where its first user reaches first. v24 closes it.
