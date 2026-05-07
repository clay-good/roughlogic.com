# roughlogic.com Specification v3 — The Dirty Jobs Pack

> Foreword, in the voice of someone who has crawled under enough houses to know.
>
> Listen. I have spent a fair amount of my life standing knee-deep in things that
> most people wouldn't touch with a stick, watching tradespeople do real math in
> their heads while the clock runs and the customer watches and the daylight goes
> away. And every time I see a website built for those folks, it's covered in
> banner ads, asks for an email, autoplays a video, and somehow still cannot tell
> me how many bundles of shingles I need for a 22-square hip roof.
>
> roughlogic is the opposite of that, and that is why this third specification
> exists. v1 nailed the basics. v2 widened it out. v3 adds the tools that come up
> on the actual job, in the actual mud, when the actual boss is asking the actual
> question. No fluff, no filler, no "premium tier." Just numbers, sourced and
> dated, copied to the clipboard, ready to go back to work.
>
> Build it the way the rest of the site is built: one tile, one calculation, one
> citation, one copy. Then get out of the user's way.

This document is the v3 spec. It inherits everything from spec.md and spec-v2.md.
If anything below conflicts with v1 or v2, v1 and v2 win; rewrite the v3 entry
until it complies.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1 and v2

Every constraint in spec.md and spec-v2.md continues to hold without exception:

- 100 percent client-side, single-page static web application on Cloudflare Pages.
- No server, no account, no analytics, no telemetry, no AI inference, no API key.
- No localStorage / sessionStorage / cookies / IndexedDB beyond the existing
  rl-theme key. URL hash is the only state mechanism.
- CSP default-src 'self', connect-src 'self', worker-src 'self' (spec section 7).
- WCAG 2.2 Level AA, 48 px touch targets, voice-input compatibility, single h1
  per view (spec section 9).
- No emojis, no em-dashes, no decorative icons (spec section 8).
- No reproduction of NEC, IPC, IRC, IECC, IFC, IBC, ASHRAE, ACCA, NFPA, AWC,
  ASCE, ASTM, ANSI, OSHA training materials, or any other licensed code text.
  Calculations derive from public physics, U.S. government publications, or
  manufacturer data cleared for redistribution.
- Per-view inline notice on every calculator. SOP-and-incident-command variant
  on fire-ground utilities. AHJ-governs variant on code-adjacent utilities.
  Worker-safety variant on the new safety utilities introduced in this spec.
- Live-render, 50 ms debounce, aria-live polite output, "Test with example,"
  Copy and Copy-all, inline citation, source stamp, hash-bookmarkable inputs.
- Lazy-loaded calculator modules. Home-view payload budget under 100 KB after
  gzip remains the binding constraint. Add the new modules to the dynamic
  import map; do not bloat app.js.
- Public changelog, semver, no A/B, no flags, no tracking. 90-day deprecation.

## 2. New utilities (numbered continuing from v2)

v2 ended at utility 124 (the last cross-cutting affordance). v3 picks up at 125
and runs through 187. Same group letters as before, plus we extend Group I and
Group H. No new groups. Below each group is the list, then the build prompts
follow in section 7.

### 2.1 Group A extensions: Electrical (utilities 125 through 131)

- 125. Conductor Pulling Tension. Inputs: cable weight per foot, run length,
  coefficient of friction by lubricant class (dry, wax, polymer), straight-run
  length, then a list of bends with bend angle and radius. Output: total
  pulling tension at the head end and sidewall pressure at each bend, flagged
  against typical 5000 lb tension and 1000 lb/ft sidewall thresholds. First
  principles: T_out = T_in times e^(mu times theta) per the published capstan
  equation. Cite the capstan equation by name.
- 126. Cable Bend Radius Minimum. Inputs: cable type selector (THHN/XHHW/MC/
  control/coax/fiber), cable OD. Output: minimum inside bend radius as a
  multiple of cable OD per the published manufacturer-attributed table in a
  new data shard. Cite by manufacturer; do not reproduce code text.
- 127. Power Factor Correction Capacitor. Inputs: real power kW, existing PF,
  target PF, system voltage, phase. Output: required kVAR from
  kVAR = kW times (tan(acos(PF1)) minus tan(acos(PF2))) and the resulting
  capacitance in microfarads at the given voltage and 60 Hz.
- 128. Phase Balance Across Panels. Inputs: per-circuit load list with the
  phase tag (A, B, C). Output: the per-phase total load, the imbalance percent
  (max minus min over average), and a suggested swap list to reduce imbalance
  below the user-selected threshold (default 10 percent). Pure greedy; no
  network optimizer.
- 129. Branch Circuit Voltage Drop With Multiple Loads. Inputs: conductor size
  and material, run, then a list of loads at distances along the run. Output:
  voltage at each load and the worst-case drop. Uses utility 3 helper as a
  building block.
- 130. Low-Voltage DC Drop. Inputs: system voltage (12, 24, 48), wire gauge,
  run length one-way, current. Output: voltage drop and percent. Same physics
  as utility 3 but with a DC-friendly preset and an "is this acceptable for
  this application" flag table (LED lighting tolerates 3 percent, marine
  tolerates 10 percent, and so on; cite the engineering benchmarks generally).
- 131. PoE Budget and Run Distance. Inputs: PoE class (af, at, bt type 3, bt
  type 4), cable category (Cat5e, Cat6, Cat6A), run length, ambient temp.
  Output: power available at the device end after run-length resistive drop,
  and a green/amber/red flag against the class budget. Cite IEEE 802.3 by
  name only.

### 2.2 Group B extensions: Plumbing and Gas (utilities 132 through 138)

- 132. Stormwater Rational Method. Inputs: catchment area square feet, runoff
  coefficient (asphalt 0.95, gravel 0.50, lawn 0.25, etc.), rainfall intensity
  inches per hour. Output: peak flow Q = C times i times A in cubic feet per
  second and gallons per minute. Cite the rational method by name; bundle
  typical C values per surface from public engineering practice.
- 133. Manning's Equation Drainage Slope. Inputs: pipe diameter, target flow
  gpm, pipe roughness (smooth PVC 0.009, cast iron 0.013, concrete 0.013),
  pipe material selector. Output: minimum slope to achieve self-cleansing
  velocity (typical 2 ft/s) and the slope to carry the flow at half-full.
  Manning's equation is public engineering.
- 134. Hydrostatic Test Pressure and Hold Time. Inputs: system working
  pressure, pipe material, test multiplier (default 1.5x for water lines,
  1.25x for fuel gas per public engineering practice), system volume.
  Output: test pressure and a recommended hold time using a public
  acceptable-leak-rate table. Cite the methodology generally.
- 135. Grease Trap Sizing. Inputs: peak fixture flow gpm, retention time
  minutes (default 30), loading factor (default 1.25). Output: required
  trap volume gallons. Cite PDI G101 by name only.
- 136. Glycol Freeze Protection Mix. Inputs: system volume gallons, target
  burst-protection temperature, glycol type (propylene or ethylene). Output:
  glycol percent by volume and gallons of concentrate to add. Use the
  manufacturer-published freezing-point curve from a new data shard, attributed
  per manufacturer.
- 137. Hydronic Expansion Tank. Inputs: system water volume, fill pressure,
  relief pressure, max water temperature. Output: required diaphragm tank
  volume from the public expansion-tank formula
  V_tank = V_sys times ((rho_cold over rho_hot) minus 1) over (1 minus
  (P_initial over P_final)). Cite by name.
- 138. Backflow Preventer Pressure Loss. Inputs: device class (RP, DCV, PVB,
  AVB), flow gpm, pipe size. Output: pressure loss in psi from the
  manufacturer-published curves in a new data shard, attributed per device.

### 2.3 Group C extensions: HVAC (utilities 139 through 144)

- 139. Fan Affinity Laws. Inputs: baseline fan RPM, baseline CFM, baseline
  static pressure, baseline kW; target one of those values. Output: the other
  three at the target RPM via Q proportional to N, P proportional to N squared,
  kW proportional to N cubed. Cite affinity laws by name.
- 140. Belt Length and Pulley Speed. Inputs: drive pulley diameter, driven
  pulley diameter, center distance, motor RPM. Output: V-belt length from the
  public formula L = 2C + (pi over 2)(D + d) + ((D minus d) squared over 4C),
  driven RPM, and belt speed in feet per minute.
- 141. Compressed Air Receiver and Tool Budget. Inputs: list of pneumatic tools
  with their CFM at duty cycle, compressor pump CFM and pressure swing range,
  acceptable pressure drop. Output: required receiver gallons from
  V = (t times (C minus C_air) times P_atm) over (P1 minus P2) and the
  resulting tool count the system can support concurrently. Cite the receiver
  formula by name.
- 142. Geothermal Loop Length. Inputs: heating BTU at design, cooling BTU at
  design, soil class (sand, clay, rock), loop type (vertical or horizontal).
  Output: estimated loop length using public IGSHPA-style heat-transfer
  benchmarks (BTU per linear foot per soil class) bundled in a new data shard
  attributed to public-domain DOE technical reports. Notice: "Simplified
  estimate. A code-compliant ground-loop design requires a full IGSHPA
  procedure."
- 143. Hydronic Baseboard Output. Inputs: water temperature average, flow gpm,
  baseboard linear feet, element model selector. Output: BTU per hour from
  the manufacturer-attributed BTU-per-foot table (new data shard) interpolated
  by water temperature.
- 144. Pump NPSH Available. Inputs: source elevation relative to pump,
  atmospheric pressure (with elevation lookup), water temperature (sets vapor
  pressure), suction-line friction loss. Output: NPSH available in feet from
  NPSHa = H_atm minus H_vapor plus or minus H_static minus H_friction. Flag
  against a user-supplied NPSH required from the pump curve.

### 2.4 Group D extensions: Restoration (utilities 145 through 146)

- 145. Containment Air Balance. Inputs: containment volume cubic feet, target
  pressure differential inches of water column, leakage area square inches
  estimated from envelope condition. Output: required net negative CFM via
  the public orifice-flow form Q = 2610 times A times sqrt(delta_P) and a
  recommended NAM count to achieve it. Cite the orifice-flow form by name.
- 146. Drying Chamber Air Turnover. Inputs: chamber volume, target air changes
  per hour, current air mover CFM total, dehumidifier CFM. Output: actual ACH
  and the gap to target. Companion to utility 35.

### 2.5 Group E extensions: Carpentry and Construction (utilities 147 through 158)

- 147. Drywall Sheet Count and Mud. Inputs: wall area square feet, ceiling area
  square feet, sheet size (4x8, 4x10, 4x12), waste percent (default 10).
  Output: sheet count, mud gallons (typical 0.053 gal per square foot of
  finished surface), tape linear feet (typical 1.0 lf per square foot),
  screws count (typical 32 per sheet for ceilings, 28 for walls). Cite the
  per-square-foot benchmarks from public engineering practice.
- 148. Roofing Squares and Bundles. Inputs: roof area, pitch (for waste
  factor), shingle product (3-tab, architectural, premium), underlayment type.
  Output: roofing squares (1 square equals 100 square feet), bundles per
  square per product (typical 3 for 3-tab and architectural), underlayment
  rolls, drip edge linear feet, starter strip. Cite manufacturer benchmarks
  generally.
- 149. Asphalt Tonnage. Inputs: paved area, compacted depth inches, mix density
  (default 145 pcf for standard hot-mix). Output: tons of mix and recommended
  number of truck loads at typical 20 tons per haul.
- 150. Aggregate / Gravel Cubic Yards. Inputs: area, depth, material density
  selector (sand 100 pcf, pea gravel 110 pcf, crushed stone 100 pcf, road
  base 130 pcf). Output: cubic yards and tons. Cite the typical density values
  from public engineering tables.
- 151. Mortar Mix and Yield. Inputs: brick/CMU count, joint thickness, joint
  size, mortar type selector (Type N, S, M). Output: bags of mortar mix at
  the published yield (typical 30 standard bricks per bag, 30 8-inch CMU
  per 3 bags). Cite Portland Cement Association generally.
- 152. Concrete Mix Design (Simplified). Inputs: target strength psi, exposure
  class (interior, freeze-thaw, marine, sulfate), max aggregate size, slump.
  Output: water-to-cement ratio (interpolated from a public ACI 211-style
  curve in a new data shard), cement bags per cubic yard, fine and coarse
  aggregate weights. Notice: "Simplified mix design. A submittal-grade mix
  requires ACI 211 procedure."
- 153. Bolt Torque to Clamp Load. Inputs: bolt grade, diameter, lubrication
  condition (dry K=0.20, oiled K=0.18, anti-seize K=0.15), target preload as
  fraction of proof load. Output: torque from T = K times D times F. Cite the
  short-form torque equation by name. Bundle proof-load values per grade in a
  new data shard from public ASTM/SAE benchmarks (cite by name only).
- 154. Sheet Metal Bend Allowance. Inputs: material thickness, bend angle,
  inside bend radius, K-factor (default 0.44 for soft, 0.33 for hard). Output:
  bend allowance BA = (pi over 180) times angle times (R + K times t) and the
  flat blank length given the leg dimensions. Cite the bend-allowance form by
  name.
- 155. Shop Speeds and Feeds. Inputs: tool type (drill, end mill, lathe),
  material (steel, stainless, aluminum, brass, hardwood, softwood, plastic),
  tool diameter, number of flutes (for milling). Output: spindle RPM from
  RPM = (SFM times 3.82) over D and feed rate IPM = RPM times chipload times
  flutes. Bundle SFM and chipload tables from public Machinery's Handbook
  equivalent values; cite engineering practice generally.
- 156. Welding Rod and Wire Usage. Inputs: process (SMAW, GMAW, FCAW, GTAW),
  joint configuration, plate thickness, total weld length. Output: weld
  deposition weight from cross-section area times length times steel density,
  rod or wire pounds at the published deposition efficiency per process
  (SMAW 60 percent, GMAW 90 percent, FCAW 80 percent, GTAW 100 percent for
  filler), and gas cubic feet at typical flow times time. Cite AWS deposition
  benchmarks by name only.
- 157. Demolition Debris Weight. Inputs: structure type (wood frame, masonry,
  concrete, mixed), gross volume cubic yards or floor area. Output: debris
  weight in tons from typical pcf benchmarks (wood frame 50, mixed 100,
  masonry 130, concrete 150) and a recommended dumpster size from a list of
  10/20/30/40 yard containers. Cite the benchmarks generally.
- 158. Formwork Pressure. Inputs: pour rate feet per hour, concrete temperature
  Fahrenheit, concrete unit weight, slump category. Output: lateral pressure
  on formwork from the public ACI 347-style formula
  P = C_w times (150 + (9000 R over T)) capped at the wet head pressure,
  with C_w from a public weight factor table. Notice: "Verify formwork
  shoring with the design engineer. Pour-rate spikes can exceed this."

### 2.6 Group F extensions: Fire-Ground Engineering (utilities 159 through 161)

- 159. Confined Space Air Change Time. Inputs: space volume cubic feet, blower
  CFM, target purges (default 7 air changes per OSHA-published practice).
  Output: minutes to reach target purges from t = (V times N) over CFM.
  Cite OSHA 1910.146 by section number only.
- 160. Rope Rescue Mechanical Advantage. Inputs: rig type (1:1, 2:1, 3:1, 4:1,
  5:1 piggyback, T-method), rigging efficiency (default 0.9 per pulley). Output:
  theoretical MA, actual MA after pulley friction losses, force at the haul
  team given the load. Cite NFA / NFPA training literature by name only.
- 161. Sling Angle Load Multiplier. Inputs: load weight, sling configuration
  (vertical, choker, basket), included angle between legs. Output: tension per
  leg from L = W over (n times sin(theta over 2)) where theta is the included
  angle, plus a published load-reduction factor for choker hitches (typically
  0.75). Cite ASME B30.9 by section number only.

### 2.7 Group G extensions: Cross-Trade (utilities 162 through 173)

- 162. OSHA Trench Sloping. Inputs: trench depth, soil class (Type A, B, or C),
  surcharge presence. Output: maximum allowed slope ratio (Type A 0.75:1,
  Type B 1:1, Type C 1.5:1) and minimum benching geometry. Cite 29 CFR 1926
  Subpart P by section number only. Notice: "AHJ and competent person govern.
  This is a math aid."
- 163. NIOSH Lifting Equation. Inputs: load weight, horizontal distance,
  vertical lift height, asymmetry angle, frequency lifts per minute, coupling
  quality (good, fair, poor). Output: Recommended Weight Limit RWL and
  Lifting Index LI per the public NIOSH 1991 equation. Cite NIOSH by
  publication name.
- 164. Heat Stress (WBGT and Heat Index). Inputs: dry-bulb temperature,
  relative humidity, wind speed, solar exposure flag. Output: heat index from
  the NWS Rothfusz formula and an estimated WBGT from public approximation.
  Recommend work/rest cycle minutes per OSHA-published guidance. Cite NWS and
  OSHA generally.
- 165. Wind Chill Exposure. Inputs: ambient temperature, wind speed, exposed
  skin selector. Output: wind chill from the public NWS 2001 formula and time
  to frostbite per the published exposure curves.
- 166. Ladder Placement Angle. Inputs: ladder length, working height. Output:
  base distance for the published 4:1 rule, set angle in degrees, and a
  pass/fail flag at 75.5 degrees plus or minus tolerance. Cite OSHA 1926.1053
  by section number only.
- 167. Pulley System Mechanical Advantage. Inputs: rig diagram selector
  (fixed, movable, block-and-tackle 2 through 6 sheaves). Output: ideal MA
  and actual MA at the user-supplied pulley efficiency.
- 168. Ramp Slope (ADA). Inputs: total rise, available run. Output: slope
  ratio, percent, and pass/fail flag against the public 1:12 maximum.
  Companion to utility 18.
- 169. Rainwater Harvesting Yield. Inputs: catchment area square feet, monthly
  rainfall inches (allow 12 entries or a single annual figure), collection
  efficiency (default 0.62 for sloped roofs). Output: gallons per month and
  per year from gallons = area times rainfall times 0.62.
- 170. Job Estimate Roll-Up. A meta-tool that lists every calculator the user
  has visited in this session (from utility 120 Recents) and lets them pick a
  subset whose numeric outputs roll up into a single estimate sheet with
  optional unit prices. Pure UI over existing state. No new physics. Output:
  an estimate sheet renderable as the print view (utility 122) and exportable
  via the existing Project Bundle (utility 121).
- 171. Daily Multi-Job Timesheet. Inputs: list of jobs with start time, end
  time, lunch deducted, hourly rate, optional drive miles. Output: hours per
  job, total day hours with overtime split (uses utility 108 logic), gross
  pay, and reimbursable miles using utility 107.
- 172. Material Order List. A second meta-tool: takes the outputs of utilities
  93, 94, 95, 96, 147, 148, 149, 150, 151 (anything that yields a quantity)
  from the current session bundle and emits a single shopping list grouped by
  material and rounded up to typical purchase units (full sheets, full
  bundles, full bags, full loads). No prices unless the user supplies them.
- 173. Vehicle Load Distribution. Inputs: pickup truck wheelbase, payload
  weight, payload position from cab. Output: front and rear axle weights and
  a flag against user-supplied GVWR / GAWR. Cite the published static-balance
  equations by name only.

### 2.8 Group H extensions: Knowledge References (utilities 174 through 179)

Each is a reference page. Original plain-English summaries by the project
author. No numeric inputs. Same pattern as utilities 114 through 118.

- 174. Hand Signal Reference. Original plain-English summary of the published
  crane, excavator, flagger, and aircraft marshalling signals with named
  attribution. No image reproduction.
- 175. OSHA Top-10 Citations. Original plain-English summary of the most
  recently published OSHA top-10 most-cited standards, by year. Cite the
  agency publication by date.
- 176. Lockout / Tagout Steps. Original plain-English step list for an LOTO
  procedure, citing 29 CFR 1910.147 by section number only.
- 177. Defensible Space Reference. Original plain-English summary of the
  zone-based defensible space practice published by federal and state
  wildfire agencies. Cite CALFIRE / NFPA by name only.
- 178. Storm Shelter Spec Reference. Original plain-English summary of the
  FEMA P-320 published guidance for residential storm shelters. Cite FEMA
  P-320 by name only. No reproduction of figures or text.
- 179. Field First Aid Triage Quick-Read. Original plain-English summary of
  basic START triage categories. Notice: "This is not medical advice. Call
  911. See sophiewell.com for field-medicine reference." No drug dosing,
  no airway maneuvers.

### 2.9 Group I extensions: Cross-cutting platform (utilities 180 through 187)

These extend the v2 platform affordances. All are deterministic, hash-stated,
zero-network.

- 180. Job Pack. A bundle template that combines selected calculator inputs
  and outputs into a single printable job sheet with a heading line for crew,
  date, and address. Pure UI over utilities 121 and 122. Hash-stored, never
  written to disk.
- 181. QR of Current URL. A small button on the tool view header that opens a
  modal with a client-rendered QR code of window.location.href, drawn into a
  same-origin canvas. Allows the user to send the calculator state to their
  phone without typing. No third-party QR service. Bundle a tiny MIT-licensed
  QR library in the shell or use a from-scratch implementation in pure-math.js
  if the byte budget permits.
- 182. Big Buttons Mode. A theme-like toggle that increases input field height,
  button size, and font scale for gloved-hand and bright-sun use. Persisted
  in the existing rl-theme-equivalent localStorage key as a second value
  (rl-bigbuttons "1" or "0"). Confirm with the v1 stability commitment that
  one additional localStorage key is acceptable; if not, encode in the URL
  hash like recents.
- 183. High-Contrast Job Site Theme. A third theme value beyond light and
  dark, with WCAG AAA contrast pairings, intended for direct sunlight on a
  phone screen.
- 184. Numpad Layout Toggle. Switches the keyboard hint and tab order for
  numeric input fields between phone-style (123 top) and calculator-style
  (789 top), persisted as a hash flag.
- 185. Field Notes Scratchpad. A small textarea per-tool that lives only in
  the URL hash (k=...) and never leaves the page. Truncated to 280 characters
  to keep the hash short. Notice: "Notes are stored in the URL only. Closing
  the tab without bookmarking discards them."
- 186. Send To My Other Device. A short-lived offer that combines utility 181
  QR with a copy-share-link button under one heading.
- 187. Crash-Safe Resume. On any uncaught error in a renderer, the tool view
  catches, logs to console, and renders a small "this calculator crashed,
  reload to retry" panel without losing the URL hash. Deterministic recovery,
  zero state loss.

## 3. Out of scope (still and forever)

- HazMat content. Stays on the future hazardous-materials site.
- Commercial pricing databases. Drift fast, not free, not durable.
- Code-compliance verdicts. The AHJ governs.
- Third-party APIs, accounts, fetches beyond same-origin static assets.
- AI / LLM / probabilistic anything.
- Any tool that depends on a paid subscription dataset.
- Any tool that requires an account to use.

## 4. Data posture for v3

Every new shard satisfies the same four conditions as v1 and v2: public domain,
physical fact, U.S. government publication, or explicitly redistributable
manufacturer / standards-body data. No reproduction of licensed text or tables.

### New data shards introduced by v3

| Shard | Source | Notes |
| --- | --- | --- |
| data/electrical/cable-bend-radius.json | Manufacturer technical bulletins | Attribute manufacturer per entry. |
| data/electrical/poe-classes.json | IEEE 802.3 publication metadata, manufacturer cable resistance per category | Cite IEEE by name only. |
| data/plumbing/runoff-coefficients.json | Public engineering practice (cited generally) | Engineering consensus values. |
| data/plumbing/manning-roughness.json | Public engineering tables | Physical fact / engineering consensus. |
| data/plumbing/glycol-curves.json | Manufacturer freeze-point curves | Attribute per manufacturer. |
| data/plumbing/backflow-curves.json | Manufacturer pressure-loss curves | Attribute per manufacturer. |
| data/hvac/affinity-laws.json | Engineering consensus | Public formula reference; the shard mostly lists tested motor/fan data points for examples. |
| data/hvac/baseboard-output.json | Manufacturer BTU-per-foot tables | Attribute per manufacturer. |
| data/hvac/geothermal-soil.json | DOE technical reports | Public domain. |
| data/construction/aci-211-curves.json | ACI 211 published curve points | Cite ACI by name only; values are interpolated public-domain points. |
| data/construction/bolt-grades.json | ASTM/SAE proof-load benchmarks | Cite by name only. |
| data/construction/sfm-table.json | Engineering consensus speeds and feeds | Public engineering practice. |
| data/construction/aws-deposition.json | AWS deposition-efficiency benchmarks | Cite by name only. |
| data/cross/niosh-coupling.json | NIOSH 1991 publication metadata | Public domain. |
| data/cross/heat-cold-stress.json | NWS published formulas, OSHA work/rest table | Public domain. |
| data/cross/osha-trench.json | 29 CFR 1926 Subpart P metadata | Public domain reference; cite by section number only. |
| data/summaries/v3-references.json | Original plain-English Group H summaries | Original creative work, MIT-licensed. |

Every new shard receives an entry in docs/data-sources.md, scripts/sources.md,
the build-data pipeline, and data/integrity.json.

### Derivations that need a new section in docs/derivations.md

- Capstan equation for cable pulling tension.
- Power factor correction kVAR formula.
- Manning's equation slope solve.
- Hydronic expansion tank formula.
- Affinity laws.
- V-belt length formula.
- Compressed air receiver formula.
- NPSH available formula.
- Containment orifice flow Q = 2610 A sqrt(delta_P).
- ACI 211 simplified mix design.
- Bolt torque short-form T = K D F.
- Bend allowance with K-factor.
- SFM-to-RPM machining formula.
- AWS deposition-rate calculation.
- ACI 347 formwork pressure.
- Capstan-and-pulley MA with friction.
- Sling angle leg tension.
- NIOSH 1991 lifting equation.
- NWS 2001 wind chill.
- NWS Rothfusz heat index.
- Static axle-balance equations.

## 5. UI patterns

All v3 utilities follow the v1 and v2 patterns exactly. No new patterns are
introduced except the four Group I additions, which are platform features, not
calculators. The Big Buttons mode and the High-Contrast theme are CSS-only
toggles; the Numpad toggle is an inputmode hint plus tab-order swap; the
Scratchpad is one textarea bound to a single hash key. None of them touch
business logic.

## 6. Build, test, and deployment

Same as v1 and v2. New compute functions land in the existing per-group
modules: calc-electrical.js, calc-plumbing.js, calc-hvac.js, calc-restoration.js,
calc-construction.js, calc-fire.js, calc-cross.js. Group H reference utilities
extend calc-references.js. Group I features land in app.js or a small new
module per affordance. Each new utility ships with at least 10 unit-test cases.
Each first-principles calculation gets a section in docs/derivations.md and
an entry in test/unit/first-principles.test.js. The home-view payload budget
remains 100 KB after gzip. New modules dynamic-import on first use.

## 7. Step-by-step build instructions and Claude Code prompts

These prompts continue the numbering from spec-v2.md section 7 (which ends at
step 36). Paste each prompt into Claude Code with the repo as the working
directory. Each prompt assumes prior steps are complete and tests are green.
No code is supplied below; the prompts are the specification.

### Step 37: Group A v3 — Electrical, Round Three (utilities 125 through 131)

> Implement utilities 125 through 131 from spec-v3.md section 2.1 in
> calc-electrical.js. For each utility, add the compute function, an
> Example export with at least one realistic worked example, the renderer,
> and the renderer registration in ELECTRICAL_RENDERERS. Add the new tool
> entries to the TOOLS registry in app.js with the right group and trade
> tags. Use the capstan equation T_out = T_in times exp(mu times theta) for
> utility 125 and add a sidewall pressure check at each bend. Use the
> standard kVAR equation for utility 127. Compute branch-circuit voltage
> drop in utility 129 by accumulating I times R per segment. For utility
> 131 PoE, accumulate cable resistance per category from a new
> data/electrical/poe-classes.json shard, then check the device-end voltage
> against the class minimum. Add data/electrical/cable-bend-radius.json and
> data/electrical/poe-classes.json shards to scripts/build-data.mjs, then
> to docs/data-sources.md, scripts/sources.md, and data/integrity.json.
> Add TOOL_DATA_SOURCES entries for utilities 126 and 131 (reference-style
> outputs). Add at least 10 unit tests per utility in
> test/unit/calc-electrical-v3.test.js, including an edge case where the
> calculation must return a clear error (zero current, negative gauge, an
> empty bend list, an unknown PoE class, and so on). Add docs/derivations.md
> sections for the capstan equation and the PoE budget. Run npm test, npm
> run lint, npm run data:verify. The build must stay green. The home-view
> payload budget must stay under 100 KB after gzip; verify with the build
> output. Update CHANGELOG.md under Unreleased greater-than Build progress
> (v3). Do not modify any v1 or v2 utility unless it is broken; if you find
> a v1 or v2 bug while working, file it in CHANGELOG.md under Unreleased
> greater-than Bugs found, and only fix it if it blocks the new work.

### Step 38: Group B v3 — Plumbing and Gas, Round Three (utilities 132 through 138)

> Implement utilities 132 through 138 from spec-v3.md section 2.2 in
> calc-plumbing.js. Use the rational method Q = C times i times A for
> utility 132 with bundled C values from a new
> data/plumbing/runoff-coefficients.json shard. Implement Manning's
> equation for utility 133 by solving for slope given the target velocity
> and flow; bundle pipe roughness values in a new
> data/plumbing/manning-roughness.json shard. For utility 134 hydrostatic
> test, output test pressure as multiplier times working pressure and a
> recommended hold time from a public acceptable-leak-rate table that lives
> in code, not data, because the rules are simple piecewise constants.
> For utility 135 grease trap, output volume = peak gpm times retention
> minutes times loading factor. For utility 136 glycol mix, interpolate
> the manufacturer freeze-point curve from data/plumbing/glycol-curves.json
> with attribution per manufacturer. For utility 137 hydronic expansion
> tank, use the published expansion-tank formula and verify against a
> known worked example in the test. For utility 138 backflow preventer,
> bundle pressure-loss curves in data/plumbing/backflow-curves.json and
> interpolate by flow gpm. Add the four new shards to the data pipeline
> and to docs/data-sources.md, data/integrity.json. Add TOOL_DATA_SOURCES
> entries for 132, 138 (reference-style data-driven outputs). Add 10+
> tests per utility in test/unit/calc-plumbing-v3.test.js. Add
> docs/derivations.md sections for utilities 132, 133, 134, 137. Run
> the full suite, update CHANGELOG.md.

### Step 39: Group C v3 — HVAC, Round Three (utilities 139 through 144)

> Implement utilities 139 through 144 from spec-v3.md section 2.3 in
> calc-hvac.js. For utility 139 affinity laws, given any one ratio
> (RPM, CFM, SP, or kW), compute the others from the cube and square
> proportions. For utility 140 belt length, use the public V-belt formula
> and verify against a worked example. For utility 141 air receiver, use
> the published receiver-volume formula; allow the tool list with CFM at
> duty cycle to drive the consumption side. For utility 142 geothermal
> loop, divide the design BTU by the BTU-per-linear-foot benchmark for the
> selected soil class from data/hvac/geothermal-soil.json (sourced from
> public DOE technical reports, attributed in the shard). For utility 143
> baseboard output, interpolate manufacturer-attributed BTU-per-foot
> tables from data/hvac/baseboard-output.json by water temperature. For
> utility 144 NPSH available, sum static, atmospheric, vapor, and friction
> heads. Add data/hvac/affinity-laws.json (mostly an example shard),
> data/hvac/baseboard-output.json, data/hvac/geothermal-soil.json to the
> pipeline. Add TOOL_DATA_SOURCES entries for utilities 142, 143. Add
> docs/derivations.md sections for utilities 139, 140, 141, 144. Add 10+
> tests per utility in test/unit/calc-hvac-v3.test.js, including a
> regression test that verifies utility 144 catches a cavitation case
> (NPSHa less than user-supplied NPSHr). Run the full suite, update
> CHANGELOG.md.

### Step 40: Group D v3 — Restoration, Round Three (utilities 145 through 146)

> Implement utilities 145 and 146 in calc-restoration.js. Utility 145
> containment air balance: required CFM = orifice flow at the target
> negative pressure differential, computed as Q = 2610 times A times
> sqrt(delta_P) where A is in square inches and delta_P in inches w.c.;
> output a recommended NAM count from typical 500/1000/2000 CFM units
> (reuse utility 87's recommendation logic). Utility 146 chamber air
> turnover: actual ACH = (air mover total CFM + dehu CFM) times 60 over
> chamber volume; output the gap to the user-supplied target ACH. Add
> docs/derivations.md section for utility 145. Add 10+ tests per utility
> in test/unit/calc-restoration-v3.test.js. Run the full suite, update
> CHANGELOG.md.

### Step 41: Group E v3 — Carpentry and Construction, Round Three (utilities 147 through 158)

> This is the largest v3 step. Implement utilities 147 through 158 in
> calc-construction.js. Group these by physical category and verify each
> against a worked example before moving on. Utility 147 drywall: sheet
> count from area divided by sheet area times one plus waste; mud, tape,
> screws from per-square-foot benchmarks bundled in the function (no shard,
> the values are short and stable). Utility 148 roofing: roofing squares
> from area; bundles per square per shingle product; underlayment rolls
> from coverage; drip edge linear feet from perimeter input. Utility 149
> asphalt: tons = volume times density. Utility 150 aggregate: cubic yards
> = area times depth divided by 27, then times pcf-per-material to get
> tons. Utility 151 mortar: bags from unit count divided by yield-per-bag
> per mortar type. Utility 152 simplified mix design: interpolate
> water-cement ratio from data/construction/aci-211-curves.json by target
> strength and exposure class; output cement bags, fine and coarse
> aggregate weights per cubic yard. Utility 153 bolt torque: T = K D F,
> with K from lubrication selector and F from grade and target preload
> fraction; bundle proof-load values in data/construction/bolt-grades.json.
> Utility 154 bend allowance: BA = (pi over 180) times angle times
> (R + K times t); output flat blank length given the leg dimensions.
> Utility 155 speeds and feeds: RPM = SFM times 3.82 over D, IPM = RPM
> times chipload times flutes, with values from
> data/construction/sfm-table.json. Utility 156 welding: deposition mass
> from joint cross-section times length times steel density, then divide
> by deposition efficiency from data/construction/aws-deposition.json.
> Utility 157 demolition debris: weight from volume times pcf benchmark
> per structure type, then dumpster size from a list of standard sizes.
> Utility 158 formwork pressure: ACI 347 short-form
> P = C_w times (150 + 9000 R over T) capped at the wet-head pressure.
> Add the four new shards to the build pipeline. Add docs/derivations.md
> sections for utilities 152, 153, 154, 155, 156, 158. Add TOOL_DATA_SOURCES
> entries for 152, 153, 155, 156. Add 10+ tests per utility in
> test/unit/calc-construction-v3.test.js. Pay special attention to the
> dumpster size flag in utility 157 and the cap behavior in utility 158;
> include explicit tests at the cap boundary. Run the full suite, update
> CHANGELOG.md.

### Step 42: Group F v3 — Fire-Ground, Round Three (utilities 159 through 161)

> Implement utilities 159 through 161 in calc-fire.js. All Group F
> utilities continue to carry the SOP-and-incident-command notice plus
> the worker-safety variant. Utility 159 confined space air change:
> minutes = (volume times target purges) over CFM. Utility 160 rope
> rescue mechanical advantage: theoretical MA from the rig selector,
> actual MA after pulley friction = theoretical MA times efficiency
> raised to the number of pulleys; output haul-team force = load divided
> by actual MA. Utility 161 sling angle: tension per leg = load over
> (n times sin(theta over 2)); apply choker reduction factor when
> applicable. Add docs/derivations.md sections for 160, 161. Add 10+ tests
> per utility in test/unit/calc-fire-v3.test.js, including the limit case
> at small included angles where leg tension diverges. Run the full suite,
> update CHANGELOG.md.

### Step 43: Group G v3 — Cross-Trade, Round Three (utilities 162 through 173)

> Implement utilities 162 through 173 in calc-cross.js, except for the two
> meta-utilities 170 and 172, which live in app.js because they roll up
> existing state. Utility 162 trench sloping: maximum slope ratio per soil
> class from data/cross/osha-trench.json, plus benching geometry. Utility
> 163 NIOSH lifting equation: full 1991 form RWL = LC times HM times VM
> times DM times AM times FM times CM, with each multiplier from the
> public formula; LI = load over RWL; coupling multiplier from
> data/cross/niosh-coupling.json. Utility 164 heat stress: heat index
> from the NWS Rothfusz formula, WBGT from the public approximation,
> work-rest from the OSHA-published table in data/cross/heat-cold-stress.json.
> Utility 165 wind chill: NWS 2001 formula and exposure-time curve.
> Utility 166 ladder placement angle: 4:1 base distance, set angle from
> arctan, pass/fail at 75.5 degrees. Utility 167 pulley MA: as utility
> 160 but configured as a general rigging tool. Utility 168 ramp slope:
> rise over run, percent, and pass/fail at 1:12. Utility 169 rainwater
> harvesting: monthly and annual gallons from area times rainfall times
> efficiency. Utility 170 job estimate roll-up: a meta-tool that reads the
> current Recents (utility 120) and the bundled inputs (utility 121) and
> renders a printable estimate. Build it as a new tool view that does not
> own its own compute; instead it composes the existing per-tool outputs.
> Utility 171 daily timesheet: list of jobs with start/end/lunch and
> hourly rate; output uses utility 108 overtime logic and utility 107
> mileage. Utility 172 material order list: a second meta-tool that
> aggregates the quantity outputs of utilities 93, 94, 95, 96, 147, 148,
> 149, 150, 151 from the current bundle and rounds up to typical purchase
> units. Utility 173 vehicle load distribution: front and rear axle weights
> from static balance, with GVWR / GAWR flags. Add the three new shards to
> the pipeline. Add docs/derivations.md sections for 163, 164, 165, 173.
> Add TOOL_DATA_SOURCES entries for 162, 163, 164, 165. Add 10+ tests per
> utility in test/unit/calc-cross-v3.test.js. The meta-utilities 170 and
> 172 get integration tests in test/e2e/ that drive a real bundle through
> the UI. Run the full suite, update CHANGELOG.md.

### Step 44: Group H v3 — Knowledge References (utilities 174 through 179)

> Extend calc-references.js with utilities 174 through 179. All content is
> original plain-English summaries written by the project author and stored
> in data/summaries/v3-references.json. Each utility renders an h2 plus dl
> pair (term/description) with the inline citation and source-stamp
> following the existing reference-utility pattern. Utility 179 Field First
> Aid Triage carries a hardened notice: "This is not medical advice. Call
> 911. See sophiewell.com for field-medicine reference." Do not include
> drug dosing, airway maneuvers, or anything that risks turning the page
> into medical guidance. Register all six in REFERENCE_RENDERERS and add
> to TOOL_MODULES in app.js. Add the six tools to TOOLS in group H with
> appropriate trade tags. Add TOOL_DATA_SOURCES entries for all six. Add
> 5+ tests per utility (smaller suites because output is data-driven).
> Run the full suite. Update docs/data-sources.md and CHANGELOG.md.

### Step 45: Group I v3 — Job Pack and QR (utilities 180 through 181)

> Utility 180 Job Pack: implement as a new tool view that takes the current
> Recents and the bundled per-tool inputs, presents a checklist of tools to
> include, plus three header fields (crew, date, address). Output is a
> single page renderable by the existing Print view (utility 122) and
> exportable via the existing Project Bundle (utility 121). No new shards.
> Pure UI over existing state. Utility 181 QR of Current URL: add a
> "Show QR" button to the tool view header that opens a modal with a
> client-rendered QR code of window.location.href, drawn into a same-origin
> canvas. Use a tiny MIT-licensed QR library bundled with the shell, or a
> from-scratch implementation in pure-math.js if it fits the byte budget.
> The modal closes on Escape and on outside click. The QR has alt-text
> describing the encoded URL. Verify the home-view payload still passes
> the 100 KB gzip budget; if the QR library blows the budget, dynamic-import
> it on first click. Add unit tests for the encoder against the published
> QR test vectors. Run the full suite, update CHANGELOG.md.

### Step 46: Group I v3 — Big Buttons, High-Contrast Theme, Numpad Toggle (utilities 182 through 184)

> Utility 182 Big Buttons mode: add a CSS class .rl-big that scales input
> heights to 64 px, button heights to 64 px, font sizes by 1.25, and
> targets by 1.25. Toggle it from a header control. Confirm with the
> stability commitment whether one additional localStorage key
> (rl-bigbuttons "1" or "0") is acceptable; if not, encode the toggle in
> the URL hash like the recents key. Utility 183 High-Contrast Job Site
> theme: add a third theme value to the rl-theme key, with WCAG AAA
> contrast pairings. Pure CSS variables. Verify with axe-core that AAA
> contrast holds. Utility 184 Numpad layout toggle: add a header control
> that swaps inputmode hints and tab order between phone-style (123 top)
> and calculator-style (789 top). Persisted in the URL hash as a single
> flag. Verify keyboard navigation across both layouts with a Playwright
> test. Run the full suite, update CHANGELOG.md.

### Step 47: Group I v3 — Field Notes Scratchpad, Send To Other Device, Crash-Safe Resume (utilities 185 through 187)

> Utility 185 Field Notes scratchpad: add a small 280-character textarea
> per tool view, bound to a single hash key (k=...). Render a notice under
> the textarea: "Notes are stored in the URL only. Closing the tab without
> bookmarking discards them." Verify Unicode survives encode/decode
> round-trip. Utility 186 Send To Other Device: combine the QR (utility
> 181) and the existing copy-share-link (utility 124) under one heading on
> the tool view header. Pure UI consolidation. Utility 187 Crash-Safe
> Resume: wrap each renderer call in a try/catch boundary in app.js. On
> uncaught error, log to console with the tool id and the input snapshot,
> render a small panel that says "this calculator crashed. Reload to retry,
> or paste your URL into a new tab to recover state," and do not clear
> the URL hash. Add a Playwright test that injects a deliberate throw in
> a renderer and asserts the recovery panel appears and the hash is
> preserved. Run the full suite, update CHANGELOG.md.

### Step 48: Documentation, integrity, and final review for v3

> Update docs/data-sources.md, docs/derivations.md, docs/legal.md,
> docs/threat-model.md, docs/launch-checklist.md, and docs/accessibility.md
> to reflect every v3 utility, every new shard, every new derivation, and
> every new accessibility consideration (Big Buttons, High-Contrast theme,
> Numpad toggle, Scratchpad). Run npm run data:refresh to regenerate
> data/integrity.json for all new shards. Run npm run lint, npm test,
> npm run test:e2e, npm run test:a11y, npm run build. All must pass.
> Confirm the home-view payload remains under 100 KB after gzip with the
> new tools added (the home-view should still be far under the cap because
> all new calc files are dynamic-imported). Confirm Lighthouse CI still
> scores 95 or higher across performance, accessibility, best practices,
> and SEO. Update CHANGELOG.md with a v0.3.0 release stanza summarizing
> the v3 expansion. Bump package.json version to 0.3.0. Update the
> README's tool-count claim to reflect the new total (one hundred eighty
> seven utilities) and the group list to mention the v3 additions.
> Produce a written launch checklist diff vs docs/launch-checklist.md
> showing exactly what changed. The release is ready when every item in
> this step passes.

## 8. Operations and ongoing maintenance (v3 addendum)

Same as v1 and v2. Manufacturer-attributed shards (cable bend radius, glycol
curves, backflow curves, baseboard output, bolt grades) need a quarterly
attribution-and-link recheck rather than the monthly cadence used for
government-published shards, because manufacturers redirect URLs and update
catalogs without notice. Track the recheck in scripts/sources.md.

## 9. Closing note, in the voice from the foreword

I have watched a journeyman estimate a roof from the ground in his head, then
double-check it on his phone in fifteen seconds. I have watched a tech mix
glycol on the back of a service truck with a clipboard in one hand and a
calculator in the other. I have watched a captain figure pump pressure with
a Sharpie on the apparatus.

The point of this site is that the math should be there when those folks
reach for it, and nothing else should be. No banner. No login. No "are you
sure you want to allow notifications." Just the answer, the source, and the
clipboard.

v3 keeps that promise and widens the net. Every utility above is something a
real person on a real job will ask a real question about, and the answer is
deterministic, sourced, dated, and free. Build it the way the rest of it was
built. One tile, one calculation, one citation, one copy.

Then get out of the user's way.
