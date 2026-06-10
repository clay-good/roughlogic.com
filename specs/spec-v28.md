# roughlogic.com Specification v28 — New Group Z: Low-Voltage, Data, and Security Cabling (6 New Tiles + 1 Enhancement) and the Long-Term Trades Roadmap

> **As-landed note (2026-06-09):** the six tiles and the EN.1 enhancement
> landed; the **Group-Z creation (§1.1) was deferred to maintainer signoff**,
> per the gate the spec itself sets. Acting autonomously, the implementation
> took the documented **Group-A fallback**: the six tiles live in a new
> `calc-lowvoltage.js` module (own size budget) but are registered under
> **Group A (Electrical)** as a low-voltage sub-cluster, and §1.1 steps 1-4
> (GROUPS / GROUP_NAMES) were skipped. The group count stays at 24; a future
> maintainer-approved move to Group Z is a one-line change per tile. Catalog
> 543 -> 549, package 0.29.0. See docs/audit-trail.md.
>
> **Implementation status: DRAFT 2026-06-09 (targets package 0.29.0).** v28 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27.
> It inherits everything from spec.md through spec-v27.md and changes none of
> it.
>
> v28 is the **first new group since the catalog matured** and is therefore a
> deliberate architectural decision recorded here for maintainer signoff (§1.1)
> rather than an automatic landing. It opens **Group Z — Low-Voltage, Data,
> and Security Cabling** with **6 new tiles**, adds **1 additive enhancement**
> to the existing `lv-dc-drop` tile, and closes with the **long-term trades
> roadmap** (§7) that lays out the path to capture the remaining main trades.
> **No new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.** Every new tile ships with the full v14 discipline
> (dimensional annotation, bounds-fuzzer row, worked-example fixture
> cross-checked against its cited source, a complete inline `citations.js`
> entry with a relevant single-edition note, a `tile-meta.js` row with
> related-tiles and at least three search aliases, and a prerendered shell
> that passes the 320px audit) and is born into the hardened v18/v21 output
> contract and the v19/v22 citation discipline from its first commit. The
> package stamps **0.29.0** at the close.
>
> **The thesis.** The low-voltage / structured-cabling trade — data, security
> (access control and CCTV), fire alarm, and distributed audio — is one of the
> largest building trades by headcount and is the one main trade with **no
> home in the catalog**. Its math is scattered: the electrical group has PoE
> budget and a low-voltage DC drop, but a structured-cabling tech reaching for
> a **fiber loss budget**, a **cable-tray fill**, an **NVR storage estimate**,
> a **70-volt speaker line**, a **fire-alarm standby battery**, or a **coax
> attenuation** finds nothing. These are not electrician questions and do not
> belong scattered in Group A. v28 gives the trade a group of its own — the
> first earned new group since the catalog's founding sweep — and a roadmap so
> the remaining trades (masonry, finishes, irrigation, solar deepening) land
> the same way.
>
> **Count.** Measured against the live catalog of **546 tiles** (assuming
> v26/v27 land first; the +6 delta holds against **531** if they do not),
> v28 reaches **552**. Distribution of new tiles: **Z +6** (a new group). The
> one enhancement changes no tile id and no group count.
>
> Every per-tile structure below is Inputs / Output / Math / Citation / Edge
> cases / Tests; the enhancement is Tile / Change / Why / Math / Tests, per the
> v24 enhancement pattern.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile and the enhancement.
- The v18/v21 tile contract (totality, purity, domain honesty, unit-toggle
  consistency, flag-threshold correctness, magnitude safety, render
  faithfulness; no non-finite numeric field, ever) applies from the first
  commit; each inverse mode guards its new zeroable denominator (v21 RC-1).
- The v19/v22 citation discipline applies to every new `citations.js` entry.
  TIA-568 / TIA-526, IEEE 802.3, NEC Article 392 (cable tray), NEC Article 640
  / 725 / 760 (audio, Class 2/3, fire alarm), and NFPA 72 are cited **by
  name**; the adopted-edition note applies where it varies (v22 §2).
- Tile ids below are kebab-case and were checked against all 546 (and the 531
  pre-v26) live ids; none collide. Letter.number labels are scoped to v28.
- **No paywalled lookup is bundled.** Fiber attenuation coefficients,
  connector/splice losses, camera bitrates, coax per-100-ft losses, and device
  current draws are user-supplied (with common public defaults flagged), per
  spec-v12 §H. The link-budget, fill, storage, 70 V, battery, and coax math is
  first-principles (v14 §G class).

### 1.1 New-group decision (maintainer signoff required)

Adding **Group Z** touches the small set of files that enumerate the groups —
it is a recorded decision, not a silent change, per the project's honest-
decision discipline (cf. spec-v24's count reconciliation and spec-v25's
"deepen, do not silo" choice). The build must:

1. Append `"Z"` to the `GROUPS` array in `app.js` (after `"Y"`; the letter `I`
   is intentionally skipped, so `Z` is the next free letter).
2. Add `Z: "Low-Voltage, Data, and Security Cabling"` to `GROUP_NAMES` in
   `app.js`.
3. Add the group's section header and ordering wherever the home view, the
   sitemap/`tools-data.js` ordering, and the search/trade dropdown enumerate
   groups (the same touch-points the prior group landings used — confirm by
   grepping for `GROUP_NAMES` and the existing group-section render).
4. Tag each new tile with `trades: ["low-voltage"]` (a new trade key) and add
   `"low-voltage"` to any trade-filter enumeration that lists trade keys.

**This §1.1 group-creation step is gated on maintainer signoff** (the v12 §H.6
reviewer-signoff class). If the maintainer prefers to *deepen an existing
group instead of opening Z* — the spec-v25 precedent — the six tiles land in
**Group A (Electrical)** with the same ids and math, cross-linked as a
"low-voltage" sub-cluster, and §1.1 steps 1–4 are skipped. The tile bodies in
§2–§3 are written to be group-agnostic so either landing is a one-line change.

---

# Part I — Group Z: Low-Voltage, Data, and Security Cabling (6 tiles → new calc-lowvoltage.js)

The new tiles live in a new `calc-lowvoltage.js` module mirroring the existing
`calc-*.js` structure (pure exported compute functions, no DOM in the compute
layer), registered in `tools-data.js` and `tile-meta.js` exactly as every
other group's tiles are. They cross-link the existing `poe-budget`,
`lv-dc-drop`, `cable-bend-radius`, `pulling-tension`, and `conduit-fill`
electrical tiles.

### Z.1 Fiber optic loss budget (`fiber-loss-budget`)
**Inputs.** Fiber type (single-mode / OM3 / OM4 / OM5 multimode, which sets a
default attenuation coefficient), wavelength (850 / 1300 / 1310 / 1550 nm),
link length (m or km), connector-pair count and per-connector loss (default
0.75 dB, flagged), splice count and per-splice loss (default 0.3 dB), and the
application's maximum channel loss (or an application preset, e.g., 10GBASE-SR).
**Output.** The computed **total link loss**, the **available margin** against
the application maximum, and a **pass / fail** verdict; the per-term breakdown
(fiber, connectors, splices). **Math.** `loss = α(dB/km)·length_km +
connectors·loss_conn + splices·loss_splice`; `margin = max_channel_loss −
loss`; pass when `margin ≥ 0`. **Citation.** "Optical link loss budget — fiber
attenuation plus connector and splice losses against the application's maximum
channel loss — per the TIA-568 / TIA-526 fiber-test methods and the IEEE 802.3
channel-loss limits, by name; first-principles. Attenuation coefficients and
component losses are component-specific and user-supplied; the OTDR/power-meter
field test governs the certified link." **Edge cases.** A length ≤ 0 →
`{ error }` (RC-1); a negative margin fires the fail flag (C-5), it does not
block the number; multimode vs single-mode default coefficients are a labeled
choice so a value is never read against the wrong fiber. **Tests.** Six unit
tests; 300 m OM4 @ 850 nm (3.0 dB/km, 2 connectors, 0 splices) → `0.9 + 1.5 =
2.4 dB`, pass against a 2.6 dB budget; a length that pushes loss over the
budget fails; the per-term breakdown sums to the total (C-4).

### Z.2 Cable tray fill (`cable-tray-fill`)
**Inputs.** Tray type (ladder/ventilated trough / solid bottom), inside width
(in), and a list of cables (count × outside diameter, grouped by ≥ 1/0 / 4/0
class where the NEC table distinguishes). **Output.** The **fill** (sum of
cable diameters or the cross-sectional area, per the applicable 392.22 case),
the **allowable** for the tray width, the **fill percent**, and a pass / fail.
**Math.** Per NEC 392.22(A): for multiconductor cables 4/0 AWG and larger, the
sum of cable diameters ≤ the tray inside width; for smaller cables, the sum of
cross-sectional areas ≤ the column-2 allowable for the tray width; mixed loads
per the table footnotes. **Citation.** "Cable-tray fill per NEC Article 392.22
(the sum-of-diameters rule for ≥ 4/0 cables and the cross-sectional-area
allowance for smaller cables), by name. The AHJ-adopted NEC edition governs;
ampacity derating for tray fill (392.80) is a separate check, noted and
cross-linked." **Edge cases.** A tray width ≤ 0 → `{ error }` (RC-1); a cable
diameter ≤ 0 rejected; the ≥ 4/0 vs smaller method is selected by the cable
class, not silently mixed; an over-fill fires the flag (C-5). **Tests.** Six
unit tests; six 1.5″ 4/0 cables in a 12″ ladder tray → 9″ of 12″ used (pass);
a smaller-cable area case against the column-2 allowable; over-width fails.

### Z.3 IP camera / NVR storage and bandwidth (`cctv-storage`)
**Inputs.** Camera count, per-camera bitrate (Mbps — entered directly, or
estimated from resolution + fps + codec H.264/H.265 via a flagged default
table), recording schedule (continuous 24 h, or motion duty-cycle %), and the
retention period (days). **Output.** The total **storage** (GB and TB), the
aggregate **network bandwidth** (Mbps) the cameras place on the switch/uplink,
and the per-camera daily storage. **Math.** Per camera per day storage (GB)
`= bitrate_Mbps · 0.0108 · hours_recording_per_day` (where `1 Mbps · 24 h =
10.8 GB/day`); total `= Σ per-camera · days`; aggregate bandwidth `= Σ
bitrate_Mbps`. **Citation.** "IP-video storage and bandwidth from bitrate,
recording hours, and retention (`1 Mbps·24 h ≈ 10.8 GB/day`), per the standard
NVR/VMS sizing practice (first-principles bitrate accounting); the H.264/H.265
bitrate estimates are scene- and vendor-specific and user-supplied. The VMS
calculator and the installed cameras govern." **Edge cases.** A retention of
0 days → 0 storage with a note (not an error); a bitrate ≤ 0 rejected; a
motion duty-cycle outside (0, 100]% rejected. **Tests.** Six unit tests; one
4 Mbps camera, 24 h, 30 days → `4 × 10.8 × 30 ≈ 1,296 GB` (≈ 1.3 TB); 16 such
cameras → 64 Mbps aggregate; a 50% motion duty halves the storage (C-4).

### Z.4 70-volt distributed speaker line (`speaker-70v-line`)
**Inputs.** Amplifier rated power (W) and its headroom allowance (%), the list
of speaker tap settings (W per tap × count), the line voltage (70.7 V or
100 V), and the run length + wire gauge for the line-loss check. **Output.**
The **total tap load** vs the amplifier rating with a within-budget verdict,
the **line impedance** the amplifier sees (`Z = V²/P_total`) against its
minimum, the **maximum taps** remaining, and the **line loss** (dB) over the
run. **Math.** Constant-voltage line: total load `= Σ tap_watts`; budget
verdict `total ≤ rating · (1 − headroom)`; reflected impedance
`Z = V²/P_total`; line loss from the wire resistance and the line current
`I = P_total/V`. **Citation.** "Constant-voltage (70 V / 100 V) distributed-
audio line design — tap-wattage budget, reflected line impedance `Z = V²/P`,
and run line-loss — per the standard 70 V distributed-system practice and
NEC Article 640 / 725 (Class 2/3 audio) wiring, by name; first-principles
Ohm's law. Distinct from the low-impedance `speaker-impedance` (Group N) tile,
which it cross-links. The amplifier spec governs." **Edge cases.** A total tap
load of 0 → impedance suppressed with a note (not a divide-by-zero, RC-1); a
load over the amplifier budget fires the flag (C-5); 70.7 V vs 100 V is a
labeled toggle. **Tests.** Six unit tests; sixteen 8 W taps (128 W) on a 200 W
amp at 20% headroom → within budget (160 W limit); reflected `Z = 70.7²/128 ≈
39 Ω`; an over-budget tap list flagged.

### Z.5 Fire-alarm / security standby battery sizing (`standby-battery-sizing`)
**Inputs.** Total standby (supervisory) current draw (A) and the required
standby period (h; NFPA 72 commonly 24 or 60 h), total alarm current draw (A)
and the required alarm period (min; commonly 5 or 15 min), and a derating /
aging factor (default 1.2, flagged). **Output.** The required **battery
capacity** (amp-hours), the standby and alarm contributions shown separately,
and the **next standard battery size** at or above the requirement (from a
user-supplied or common list). **Math.** `Ah = [(I_standby · h_standby) +
(I_alarm · h_alarm)] · derate`, with the alarm minutes converted to hours.
**Citation.** "Secondary (standby) battery sizing for a fire-alarm or security
control unit — standby amp-hours plus alarm amp-hours times the aging/derate
factor — per NFPA 72 *National Fire Alarm and Signaling Code* §10.6 (secondary
power supply) and the panel manufacturer's battery-calculation worksheet, by
name. The AHJ-adopted NFPA 72 edition, the listed panel, and the battery
manufacturer's derating govern." **Edge cases.** A negative current or period
rejected; a derate factor < 1 flagged (it should de-rate, not credit); the
standby hours and alarm minutes are unit-locked so the two are never added in
mixed units. **Tests.** Six unit tests; 0.5 A standby × 24 h + 2.0 A alarm ×
5 min, derate 1.2 → `(12 + 0.1667) · 1.2 ≈ 14.6 Ah`; a 60 h standby case; the
next-standard-size step.

### Z.6 Coaxial cable attenuation (`coax-rg-loss`)
**Inputs.** Coax type (RG6 / RG59 / RG11 / a user type, which sets a per-100-ft
loss curve), the signal frequency (MHz), the run length (ft), and an optional
source level (dBmV or dBm) for the end-of-run level. **Output.** The **total
attenuation** (dB) over the run, the **signal level at the far end** if a
source level is entered, and the **maximum run** for a target end level.
**Math.** `loss_dB = loss_per_100ft(type, frequency) · length / 100`; end level
`= source − loss`; inverse max run `= 100 · (source − target) /
loss_per_100ft`. **Citation.** "Coaxial-cable attenuation from the per-100-ft
loss at frequency (`loss = per-100-ft · length/100`), per the cable
manufacturer's published loss curves (Belden / CommScope) and the standard
CATV/CCTV/SDI practice, by name; first-principles. The per-100-ft loss is
type- and frequency-specific and user-supplied or a flagged default; the
manufacturer's datasheet governs." **Edge cases.** A length ≤ 0 → `{ error }`
(RC-1); a per-100-ft loss ≤ 0 rejected; the inverse max-run guards a zero loss
coefficient. **Tests.** Six unit tests; 100 ft RG6 @ 1000 MHz (≈ 6 dB/100 ft)
→ ≈ 6 dB; a 200 ft run doubles it; a source of 0 dBmV less 6 dB → −6 dBmV;
max-run inverse round-trip (C-4).

---

# Part II — Enhancement to an existing tile (1)

### EN.1 `lv-dc-drop` — add the fire-alarm NAC end-of-line voltage check
**Tile.** `lv-dc-drop` (Low-Voltage DC Drop, Group A). **Change.** Add an
optional "device minimum operating voltage" input and a notification-appliance-
circuit (NAC) mode: report the **end-of-line voltage** at the worst-case
device and a **pass / fail** against the device's listed minimum (e.g., 16.0 V
on a 24 V NAC), using the worst-case secondary-supply voltage (e.g., 20.4 V at
the battery low point). **Why.** A fire-alarm or security tech runs the same DC
voltage-drop math the tile already does, but the question is not "what is the
drop" — it is "does the *last horn/strobe* still get its minimum voltage at the
battery low point." The tile stops one step short of the code answer.
**Math.** End-of-line voltage `= V_source_worstcase − V_drop` (the existing
`2·I·R·L` drop); pass when `V_eol ≥ V_device_min`. The default backward-
compatible path (no device minimum entered) reproduces the current output
exactly. **Citation.** Already cites the DC voltage-drop basis; the NAC
end-of-line check follows NFPA 72 (notification appliance circuits) and the
device's UL 1971 / 464 listed operating range, added by name. **Tests.** No
device minimum → current output unchanged (backward-compatible default); a NAC
with `V_eol` below the device minimum fires the fail flag; `V_device_min ≤ 0`
or a worst-case source ≤ 0 → `{ error }` (RC-1).

---

## 3. Candidates dropped for concept-overlap (recorded, not renamed)

Per the v20/v23/v24/v25/v26/v27 foreword discipline:

- `poe-budget` — already shipped (Group A, PoE Budget and Run Distance); the
  new group cross-links it rather than duplicating the PoE power/distance math.
- `nac-voltage-drop` (standalone) — landed instead as the **EN.1 enhancement**
  to `lv-dc-drop` (same DC-drop engine, one added end-of-line check), not a
  duplicate tile.
- `cable-voltage-drop` (generic low-voltage DC drop) — covered by `lv-dc-drop`;
  the group cross-links it.
- `comm-conduit-fill` — the conductor/cable conduit-fill case is `conduit-fill`
  (Group A); Z.2 is the distinct **cable-tray** (NEC 392) fill, not a renamed
  conduit fill.
- `speaker-impedance` (low-Z series/parallel) — already shipped (Group N); Z.4
  is the **constant-voltage 70 V** distributed case, a different design, and
  cross-links it.

## 4. Acceptance

v28 is complete when: (a) the §1.1 new-group steps land **with maintainer
signoff** (or the six tiles land in Group A per the documented fallback);
(b) each of the 6 new tiles ships with the full v14 discipline (dimensional
annotation, bounds-fuzzer row, worked-example fixture cross-checked against its
cited source, complete inline `citations.js` entry with a relevant single-
edition note, `tile-meta.js` entry with related-tiles and ≥ 3 aliases, and a
prerendered shell that passes the 320px audit); (c) the EN.1 enhancement lands
additively with a backward-compatible default (no device minimum → unchanged
output); (d) every new and changed function passes the v21 contract sweep (no
non-finite numeric field — the fiber length, tray width, bitrate, `V²/P`
impedance, battery period, and coax loss-coefficient seams are guarded per
RC-1/RC-2) and the v22 citation gates; (e) `npm test` and `npm run lint` are
green; (f) the catalog count advances by exactly 6 (Z +6; 546 → 552), and the
group count advances by exactly 1 (24 → 25 groups) **only if §1.1 lands as a
new group**; (g) package stamps 0.29.0; (h) the v28 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records the new group, the
new-tile counts, and the TIA/IEEE/NEC-392/NEC-640/NFPA-72 authorities cited.

---

## 5. Closing note (Group Z)

The catalog was built for the electrician, the plumber, and the pipefitter,
and it has since reached the HVAC tech, the carpenter, the welder, the rigger,
the surveyor, and a dozen trades beyond the trades. The one main *cabling*
trade — the people who pull the data, the cameras, the card readers, the
horns, and the speakers — had its math scattered across the electrical group or
missing entirely. v28 gives them a bench: the loss budget that says a fiber run
will link, the tray fill that says the cable fits, the storage a camera bank
needs, the load a 70-volt line can carry, the battery a fire panel must hold,
and the level left at the end of a coax. It is the first new group the catalog
has earned in its mature phase, and it is earned the same way every tile is:
one formula, one named US authority, one cross-check.

---

## 6. Scope guardrails for the roadmap (read before §7)

Every roadmap item below must clear the same bar the catalog has always
enforced, or it does not ship:

- **First-principles or a named US authority** — no proprietary chart, app, or
  paywalled table is reproduced; lookups that need a paid edition are
  user-supplied with the edition named (v22 §2, spec-v12 §H).
- **Deterministic and pure** — one formula, finite output, no non-finite
  field, full v18/v21 contract (no AI, no telemetry, no network at runtime).
- **No concept-overlap** — every candidate is checked against the live ids and
  dropped-not-renamed if an existing tile already answers it (the v20/v23
  discipline). The roadmap lists *net-new* questions only.
- **Deepen before you silo** — a trade joins an existing group unless it has
  genuinely no home and is large enough to earn one (the spec-v25 rule; Group Z
  is the first to clear that bar since founding). Each new-group proposal
  carries the §1.1 maintainer-signoff gate.
- **No autonomously-shipped legal/safety datasets** — state-keyed code tables,
  licensing data, and similar land as their own reviewed change, never bundled
  speculatively (the standing project rule).

## 7. Long-term trades roadmap — capturing the remaining main trades

This section is the **plan of record** for the user's stated goal: capture
*all* electrician, plumbing, pipe-fitting, and other main trades over time.
Each block names the trade, where it lands (deepen vs new group), and the
candidate net-new tiles (ids provisional, to be collision-checked at spec
time). Blocks are ordered by how cleanly they clear §6 today. **Nothing here
is a commitment to ship without its own spec and signoff** — it is the backlog,
written so each future spec (v29+) is a lift from this list, not a fresh start.

### 7.1 Electrician — deepen Group A (next ~6–10 tiles)
Remaining net-new NEC field math after v24's bending suite and v26's
feeder/transformer tiles: `cable-tray-ampacity` (392.80 derating),
`busway-sizing`, `motor-pf-correction-at-motor` (distinct from the panel
`pf-correction`), `conductor-fill-derate-nipple` (the 24″ nipple exception),
`raceway-expansion-fitting` (300.7 thermal movement), `arc-flash-ppe-category`
(the NFPA 70E table-method PPE category, user-supplied incident energy),
`grounding-electrode-conductor` (250.66 sizing), `parallel-set-balance`.
Authorities: NEC Articles 250 / 300 / 310 / 392, NFPA 70E.

### 7.2 Plumber — deepen Group B (next ~5–8 tiles)
`fixture-drainage-flow` (the GPM a fixture discharges for slope checks),
`grease-interceptor-gpm` (the flow-based sizing distinct from the volume
`grease-trap`), `storm-leader-sizing` (roof-drain leader/horizontal per IPC
1106), `relief-valve-discharge` (T&P relief pipe sizing), `medical-gas-sizing`
(NFPA 99, user-supplied), `recirc-balancing-valve` (flow split). Authorities:
IPC / UPC, IAPMO, NFPA 99, ASPE.

### 7.3 Pipefitter / steamfitter — deepen Group G (next ~5 tiles)
`pipe-spacing-rack` (center-to-center for parallel insulated runs),
`equal-spread-offset` (multiple parallel lines offsetting together),
`pipe-support-spacing` (MSS SP-58 max support span by size/schedule/material),
`steam-trap-sizing` (condensate load), `pipe-cold-spring` (the installation
gap for thermal growth, pairing with `pipe-expansion-loop`). Authorities:
MSS SP-58, ASME B31.1 / B31.9, NCCER.

### 7.4 Welder / metal fabricator — deepen Group E (next ~4 tiles)
`groove-weld-strength` (CJP/PJP, complementing v27's fillet tile),
`weld-distortion-shrinkage` (transverse/longitudinal shrinkage estimate),
`preheat-interpass` (AWS D1.1 Annex preheat from carbon equivalent — CE
user-supplied), `bend-test-elongation`. Authorities: AWS D1.1, AISC 360.

### 7.5 Sheet-metal / HVAC installer — deepen Group C (next ~4 tiles)
`duct-static-pressure-total` (external static from a fitting list, the Manual-D
ESP roll-up), `duct-gauge-reinforcement` (SMACNA gauge/reinforcement by size
and pressure class), `register-throw-spread` (ADPI / throw from CFM and neck),
`flex-duct-friction-correction`. Authorities: SMACNA HVAC Duct Construction
Standards, ACCA Manual D, ASHRAE.

### 7.6 Refrigeration tech — deepen Group C (next ~3 tiles)
`refrigerant-line-sizing` (suction/liquid line size for velocity + oil return),
`compression-ratio-refrig` (absolute discharge/suction pressure ratio),
`refrigerant-charge-line-length` (the per-foot adder for a long line set).
Authorities: ASHRAE Refrigeration, manufacturer line-set guidance.

### 7.7 Mason / concrete finisher — deepen Group E (next ~4 tiles)
`mortar-bed-volume`, `grout-fill-cmu` (grout for filled CMU cells per the
NCMA tables), `control-joint-spacing` (CMU / slab joint spacing per TEK /
ACI), `efflorescence-`-class items, `paver-sand-base`. Note `masonry-count`,
`mortar-mix`, `concrete`, and `concrete-mix-design` already exist — these are
the net-new questions. Authorities: NCMA TEK, ACI, TMS 402/602.

### 7.8 Painter / coatings applicator — deepen Group E or G (next ~3 tiles)
`coating-coverage-dft` (the `1604 · %solids / DFT` spreading-rate / wet-vs-dry
mil tile — distinct from the existing area-only `paint-coverage`),
`abrasive-blast-consumption` (SSPC blast-media and air), `thinning-reduction`
(reducer ratio). Authorities: SSPC/AMPP, manufacturer product data sheets
(user-supplied solids/DFT). Cross-link `paint-coverage`.

### 7.9 Flooring / tile installer — deepen Group E or G (next ~3 tiles)
`flooring-waste-factor` (area + pattern waste % + box rounding — distinct from
the count-only `tile-count`), `thinset-coverage` (bag yield by trowel notch),
`underlayment-`-and-`floor-leveler-volume`. Authorities: TCNA Handbook, ANSI
A108, manufacturer coverage tables (user-supplied). Cross-link `tile-count`.

### 7.10 Insulation installer — deepen Group C or E (next ~3 tiles)
`assembly-r-value` (layered R-value + air films + a parallel-path framing
factor → U-factor — distinct from any single-material lookup),
`pipe-insulation-thickness` (heat-loss / condensation-control thickness, the
ASHRAE 90.1 minimum table user-supplied), `continuous-insulation-tradeoff`
(cavity + CI to a target U). Authorities: ASHRAE 90.1, IECC, NAIMA.

### 7.11 Irrigation / landscape tech — new Group (or deepen L/M) — propose at spec time
The largest remaining cluster with a weak home: `precip-rate` (`PR = 96.3·GPM
/ area`), `zone-run-time` (from ET, PR, and efficiency — cross-link the
existing `et-`/agriculture tiles), `sprinkler-spacing-coverage`,
`drip-emitter-flow`, `backflow-`-and-`mainline-velocity`. Decision: deepen
Group L (Agriculture) and Group M (Water) versus a dedicated landscape group —
carries the §1.1 signoff gate. Authorities: Rain Bird / Hunter design guides
(first-principles), Irrigation Association.

### 7.12 Solar / storage installer — deepen Group A (next ~3 tiles)
Beyond the existing PV string, interconnection, and off-grid tiles:
`pv-conductor-temp-correction` (690.8 continuous-current and temperature),
`rapid-shutdown-`-context, `module-tilt-azimuth-yield` (first-principles solar
geometry). Authorities: NEC Article 690, NREL public solar-position math.

### 7.13 Trades still to scope (named, not yet blocked out)
Glazier (glass weight, deflection, U-factor assembly), locksmith (door
hardware / strike spacing, mostly reference), elevator (rope/duty — niche,
likely out of scope), drywall finisher (already partly in `drywall`; net-new
`finish-level-`-coverage), roofer (already strong in E; net-new
`fastener-pattern-uplift`), landscaper hardscape (`retaining-wall-`-batter),
fire-sprinkler fitter (`sprinkler-hydraulic-area` / `K-factor-flow` — NFPA 13,
overlaps the fire group; scope carefully against Group F). Each gets a
collision audit and a §6 clearance before it earns a spec.

### 7.14 Sequencing
The natural order is **v29 = §7.1–7.3** (finish the three founding trades'
remaining backlog), **v30 = §7.4–7.6** (the metal/air/refrigerant benches),
**v31 = §7.7–7.10** (the finishes trades, mostly Group E/C deepening),
**v32 = §7.11–7.12** (irrigation + solar, the next group decision). Each is a
6–12 tile spec in this exact format. The roadmap is deliberately larger than
any one spec so the catalog can keep growing one reviewed, cited, contract-
clean batch at a time — the way it always has.
