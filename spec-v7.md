# roughlogic.com Specification v7 — Twenty More for the Toolbox

> Foreword, in the voice of someone who has stood next to enough tradespeople
> to know what a good tool feels like and what a sales pitch dressed up like a
> tool feels like.
>
> Pull up a chair. I want to be honest with you about something. I get excited
> when I look at the bench, the law library, the back office, because there is
> real math being gatekept in all of those places too. But this site is not
> trying to be everything. This site is trying to be the one website a
> tradesperson can pull up on a phone in a basement with one bar of signal,
> tap a number into, and get an answer that is true. That is the whole job.
> If we start sneaking in calculators that cost the developer a quarterly
> review of fifty state statutes or a yearly chase of an IRS table change,
> we are no longer building the tool we promised. We are building somebody
> else's product on the same domain, and that is how good things go bad.
>
> So v7 stays in its lane. Twenty more tools. All of them physics, geometry,
> or arithmetic. All of them sourced from public engineering practice, public
> standards-body benchmarks named by name only, or manufacturer technical
> bulletins cleared for redistribution. None of them depend on a fee, a
> license, a feed, or a forecast. None of them ask the user a single question
> the user did not come here to answer. Every one of them is something a
> tradesperson has scrawled on the back of an estimate sheet at one point or
> another, looking for a website that just gave it to them straight.
>
> Build it the way the rest of the site is built. One tile, one calculation,
> one citation, one copy. Then get out of the user's way.

This document is the v7 spec. It inherits everything from spec.md, spec-v2.md,
spec-v3.md, and spec-v4.md. (v5 and v6 were drafted as scoping exercises and
do not ship to roughlogic.com; their contents belong to other public-utility
sites.) If anything below conflicts with v1 through v4, v1 through v4 win;
rewrite the v7 entry until it complies.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1, v2, v3, and v4

Every constraint in spec.md, spec-v2.md, spec-v3.md, and spec-v4.md continues
to hold without exception:

- 100 percent client-side, single-page static web application on Cloudflare
  Pages. No server, no account, no analytics, no telemetry, no AI inference,
  no API key, no third-party fetch beyond same-origin static assets.
- No localStorage / sessionStorage / cookies / IndexedDB beyond rl-theme and
  the v3-blessed rl-bigbuttons key. URL hash is the only state mechanism.
- CSP default-src 'self', connect-src 'self', worker-src 'self'.
- WCAG 2.2 Level AA, 48 px touch targets, voice-input compatibility, single
  h1 per view. Big Buttons mode and High-Contrast theme remain available on
  every v7 utility.
- No emojis, no em-dashes, no decorative icons.
- No reproduction of NEC, IPC, IRC, IECC, IFC, IBC, ASHRAE, ACCA, NFPA, AWC,
  ASCE, ASTM, ANSI, OSHA, AISC, ACI, AWS, APA, CRSI, or any other licensed
  code or standards-body text. Calculations derive from public physics, U.S.
  government publications, or manufacturer data cleared for redistribution.
  Standards bodies are cited by name and section number only.
- Per-view inline notice on every calculator. SOP-and-incident-command
  variant on fire-ground utilities. AHJ-governs variant on code-adjacent
  utilities. Worker-safety variant on the safety utilities. Engineer-of-
  record variant on any utility whose result, if relied on as a final
  design number, would normally require a stamped engineering submittal
  (introduced in v7 for the helical pile, the crane lift, the rebar
  schedule, and the fall-protection clearance utilities).
- Live-render, 50 ms debounce, aria-live polite output, "Test with example,"
  Copy and Copy-all, inline citation, source stamp, hash-bookmarkable inputs.
- Lazy-loaded calculator modules. Home-view payload budget under 100 KB
  after gzip remains the binding constraint. New modules dynamic-import on
  first use.
- Public changelog, semver, no A/B, no flags, no tracking. 90-day
  deprecation.
- The v3 prohibition and the v4 reaffirmation on live-data alerts, push
  notifications, SMS callbacks, server-side state, paid subscription data,
  and any "phone home" feature still hold without exception. v7 adds
  nothing that needs a server and nothing that needs a recurring
  developer-funded data subscription.

## 2. New utilities (numbered continuing from v4)

v4 ended at utility 233 (Historical Pricing Context). v7 picks up at 234 and
runs through 253. Twenty new utilities, organized into the existing groups.
No new groups. Below each group is the list, then the build prompts follow
in section 7.

### 2.1 Group A extensions: Electrical (utilities 234 through 237)

- 234. Transformer kVA Sizing and FLA. Inputs: load list with each item's
  kVA or watts and power factor, secondary voltage, phase, future-growth
  reserve percent (default 25). Output: total connected kVA, recommended
  transformer kVA from the standard step series (15, 30, 45, 75, 112.5,
  150, 225, 300, 500, 750, 1000), and the primary and secondary
  full-load amperes from FLA = kVA times 1000 over (V times sqrt(phases)).
  Cite the standard ANSI/IEEE step series by name only.
- 235. Short-Circuit Current at Panel (Point-to-Point Method). Inputs:
  utility transformer kVA and impedance percent, secondary voltage,
  conductor size and material, run length, parallel set count. Output:
  available fault current at the transformer secondary, multiplier "M"
  per the published Bussmann point-to-point method, and the let-through
  fault current at the downstream panel. First principles: I_sca_sec =
  (kVA times 1000) over (V times sqrt(phases) times Z_pct), then
  M = 1 over (1 + f), where f is computed from the conductor C-value
  table. Bundle the published C-values per conductor type, size, and
  raceway in a new data/electrical/conductor-c-values.json shard. Cite
  the point-to-point method by name only.
- 236. Generator Sizing for Motor Starting. Inputs: motor list with each
  motor's running kW, starting code letter or LRA, starts-per-hour
  category, plus a non-motor steady load. Output: required generator kW
  for steady running, required kVA for the worst-case motor start under
  the published 30 percent voltage-dip criterion, and the recommended
  generator size from a typical step series. Cite NEMA MG-1 by name only
  for the code-letter table; bundle the table in
  data/electrical/nema-mg1-code-letters.json.
- 237. Service Entrance Demand Load (Standard Method). Inputs: dwelling
  square footage, small-appliance circuit count, laundry circuit
  presence, fixed-appliance list with watts, range and dryer ratings, AC
  versus heat selector with each load's watts. Output: total connected
  load and computed demand load using the published demand-factor
  schedule (general lighting first 3000 VA at 100 percent, next 117000 at
  35 percent, remainder at 25 percent; the standard fixed-appliance,
  range, and dryer rules). Notice: AHJ-governs variant. Cite the demand
  factor methodology by name only; do not reproduce code text. Bundle the
  demand factor parameters in data/electrical/dwelling-demand.json as
  numeric thresholds only (no commentary).

### 2.2 Group B extensions: Plumbing and Hydronics (utilities 238 through 241)

- 238. Water Hammer Pressure Surge (Joukowsky). Inputs: pipe material
  (copper, PEX, CPVC, steel, ductile iron), nominal pipe size, fluid
  velocity at valve closure, valve closure time, fluid type (water default,
  glycol mix optional). Output: wave celerity a from the published
  Joukowsky form a = sqrt(K over rho) divided by sqrt(1 + (K times D over
  E times t)) where K is bulk modulus, rho is fluid density, E is pipe
  modulus, D is diameter, t is wall thickness; pressure surge dP = rho
  times a times dV; flag against the published "rapid closure" threshold
  of 2L over a. Cite the Joukowsky equation by name. Bundle pipe-material
  modulus and wall-thickness values in
  data/plumbing/pipe-elastic-properties.json from public engineering
  references; cite engineering practice generally.
- 239. Pump Operating Point. Inputs: pump curve selector from a
  manufacturer-attributed family in a new data/plumbing/pump-curves.json
  shard, then the system static head, friction factor at design flow, and
  the design-flow estimate. Output: the operating point at the
  intersection of the bundled pump curve (head versus flow) and the
  computed system curve (static plus friction times flow squared);
  efficiency at that point if the curve includes it. Render both curves
  on a small SVG plot and a numeric table. Cite each pump curve by
  manufacturer per entry; ship only curves cleared for redistribution.
- 240. Septic Drainfield Trench Length. Inputs: design daily flow gpd,
  soil percolation rate (minutes per inch), trench width, application-rate
  basis (state-published values entered by the user, not bundled).
  Output: required absorption area square feet from area = gpd over
  application rate, then trench linear feet from area divided by width.
  Notice: AHJ-governs variant, expanded: "State and county codes set the
  application rate. Enter the value from your local code. This is a math
  aid." Cite the absorption-area methodology generally; do not bundle a
  per-state shard.
- 241. Pipe Thermal Expansion. Inputs: pipe material (copper, PEX, CPVC,
  steel, ductile iron, aluminum, PVC), run length, installation
  temperature, operating temperature range. Output: linear expansion
  dL = alpha times L times dT, with alpha bundled per material in
  data/plumbing/thermal-expansion-coefficients.json from public
  engineering references; recommended expansion-loop leg length using the
  published guided-cantilever form L_loop = sqrt(3 times E times D times
  dL over S_a) where S_a is allowable stress, with E and S_a per
  material. Cite the guided-cantilever form by name.

### 2.3 Group C extensions: HVAC (utilities 242 through 245)

- 242. Duct Friction Loss and Static Pressure. Inputs: duct shape (round
  or rectangular with W and H), duct material (galvanized smooth, flex,
  fiberboard), airflow CFM, run length, fitting list with each fitting's
  equivalent length or loss coefficient C_o. Output: friction loss per
  100 feet from the published Darcy-Weisbach form for ducts (or the
  ASHRAE friction-chart equivalent reduced to a closed-form approximation
  for the bundled materials), total straight-duct loss, fitting losses
  from C_o times velocity pressure, and total static pressure. Bundle
  material absolute roughness values in data/hvac/duct-roughness.json and
  a small fitting-loss-coefficient library in data/hvac/duct-fittings.json
  from public engineering references; cite ASHRAE by name only.
- 243. Refrigerant Superheat and Subcooling. Inputs: refrigerant selector
  (R-410A, R-32, R-454B, R-22 legacy, R-134a), measured suction pressure
  and suction line temperature, measured liquid line pressure and liquid
  line temperature. Output: saturation temperatures at suction and
  liquid pressures from the bundled pressure-temperature tables, then
  superheat = T_suction minus T_sat_suction and subcooling =
  T_sat_liquid minus T_liquid; flag against the manufacturer-typical
  ranges (8 to 12 degrees superheat, 8 to 15 degrees subcooling) when no
  charging chart is supplied. Bundle public manufacturer-attributed P-T
  tables for refrigerants whose tables are cleared for redistribution in
  data/hvac/refrigerant-pt-tables.json; cite by manufacturer per entry.
- 244. Cooling Tower Approach and Range. Inputs: condenser water entering
  and leaving temperatures, ambient wet-bulb temperature, design flow
  gpm, optional fan kW. Output: range = T_in minus T_out, approach =
  T_out minus T_wb, heat rejection = gpm times 500 times range BTU per
  hour, and a flag against typical 5 to 10 degree approach and 8 to 12
  degree range targets. Cite the cooling-tower heat-rejection form by
  name.
- 245. Pipe and Duct Insulation Heat Loss (Bare versus Insulated). Inputs:
  pipe or duct OD, surface temperature, ambient temperature, ambient air
  velocity, insulation thickness and thermal conductivity k, jacket
  emissivity. Output: heat loss per linear foot for bare and insulated
  cases from the published cylindrical-conduction-plus-convection-plus-
  radiation form; insulation effectiveness percent. Bundle k values for
  common insulation types (fiberglass, mineral wool, calcium silicate,
  elastomeric, polyiso) in data/hvac/insulation-k-values.json from public
  manufacturer technical data; cite engineering practice generally.

### 2.4 Group E extensions: Carpentry and Construction (utilities 246 through 251)

- 246. Stair Stringer Layout. Inputs: total floor-to-floor rise, target
  rise per step (default 7.0 inches), target tread depth (default 11.0
  inches), nosing projection, stringer stock thickness, headroom
  requirement input. Output: riser count, exact rise per step, tread
  depth, total run, stringer length from sqrt(rise squared plus run
  squared), throat depth at the steepest cut, and a pass/fail flag
  against the user-entered code-stair max rise and min tread (the user
  enters their local code values; the tool does not bundle them).
  Notice: AHJ-governs variant. First principles only.
- 247. Hip, Valley, and Jack Rafter Schedule. Inputs: building width
  (run), pitch (rise per 12), overhang, hip type (regular hip, irregular
  hip with two pitches), jack-rafter on-center spacing. Output: common
  rafter length per the published 17-and-12 hip multiplier (the diagonal
  of a 12 by 12 square is 16.97; for hip and valley the run multiplier
  is sqrt(rise squared plus 12 squared plus 12 squared) over 12), hip
  rafter length, jack-rafter shortening per the on-center spacing, and a
  cut-list table. Cite the carpentry framing-square method by name only.
- 248. Rebar Bend and Weight Schedule. Inputs: bar list with each row's
  bar size (#3 through #11), straight length, bend list (90, 135, 180,
  stirrup, hook), pieces. Output: total cut length per bar including
  bend allowance, total weight per bar size from the published unit
  weights (#3 = 0.376 lb/ft, #4 = 0.668, #5 = 1.043, #6 = 1.502,
  #7 = 2.044, #8 = 2.670, #9 = 3.400, #10 = 4.303, #11 = 5.313), and the
  total bar weight grouped by bar size. Bundle the unit-weight table in
  data/construction/rebar-unit-weights.json from public engineering
  references. Notice: engineer-of-record variant. Cite ACI/CRSI
  conventions by name only; do not reproduce hook-detail figures.
- 249. Plywood and OSB Sheathing Span Rating. Inputs: panel span rating
  (24/0, 24/16, 32/16, 40/20, 48/24, etc.), panel thickness, support
  spacing, application (roof or subfloor), live-load and dead-load
  inputs. Output: allowable uniform load from the published APA
  span-rating tables in a new data/construction/apa-span-ratings.json
  shard, plus a pass/fail flag against the user-supplied design loads.
  Cite APA by name only; bundle only the numeric load tables published
  for redistribution under the APA's technical-bulletin reuse policy.
  Notice: AHJ-governs variant.
- 250. Helical Pile Torque-to-Capacity. Inputs: helix configuration
  selector, installation torque (foot-pounds), Kt empirical multiplier
  per the manufacturer (default 10 for 1.5-inch shaft, 9 for 1.75-inch,
  7 for 2.875-inch, 5 for 3.5-inch from public engineering practice),
  factor of safety (default 2.0). Output: ultimate axial capacity =
  Kt times torque, allowable capacity = ultimate over factor of safety.
  Notice: engineer-of-record variant. Cite the torque-correlation method
  by name; bundle Kt benchmarks in
  data/construction/helical-pile-kt.json with per-manufacturer
  attribution.
- 251. Crane Lift Plan Quick-Math. Inputs: load weight, rigging weight,
  load radius from center pin, boom length, boom angle, capacity-at-this-
  configuration entered by the user from the crane's load chart (the
  tool never reproduces a load chart). Output: gross load (load plus
  rigging plus block plus jib deduction), percent of capacity = gross
  load over chart capacity, sling tension at the supplied sling angle
  (reuses utility 161 logic), and a pass/fail flag at 75 percent (yellow)
  and 90 percent (red) of chart capacity. Notice: engineer-of-record
  variant, hardened: "The crane manufacturer's load chart governs. The
  qualified lift director governs. This is a math aid only. Do not
  attempt a lift over 75 percent of chart capacity without a written
  critical-lift plan." Cite ASME B30.5 by section number only.

### 2.5 Group F extensions: Fire-Ground Engineering (utility 252)

- 252. ISO Needed Fire Flow (NFF). Inputs: building footprint square feet,
  number of stories, construction class selector (1 through 6 per the
  ISO published method), occupancy hazard factor, exposure distance to
  the nearest building. Output: needed fire flow in gpm from the public
  ISO method NFF = Ci times Oi times (X plus P) where Ci is the
  construction factor 18 times F times sqrt(A), Oi is the occupancy
  factor, X is the exposure factor, P is the communication factor;
  rounded to the published 250 gpm increment and capped at the
  published maximum. Notice: SOP-and-incident-command variant. Cite the
  ISO Fire Suppression Rating Schedule by name only; do not reproduce
  the schedule text. Bundle the construction-class F factors and the
  occupancy multipliers in data/fire/iso-nff.json from public ISO
  technical bulletins.

### 2.6 Group G extensions: Cross-Trade (utility 253)

- 253. Fall Protection Clearance. Inputs: anchor height above walking
  surface, free-fall distance allowed (default 6 feet for personal fall
  arrest), deceleration distance per the connector type (default 3.5
  feet for shock-absorbing lanyard, 1.0 feet for self-retracting
  lifeline), worker height (D-ring to feet, default 5 feet), safety
  factor (default 1 foot), harness stretch (default 1 foot). Output:
  required clearance below the anchor = free fall plus deceleration
  plus worker height plus harness stretch plus safety factor; flag
  against the user-entered actual clearance to the next lower level.
  Notice: engineer-of-record variant plus worker-safety variant. Cite
  29 CFR 1926.502 and ANSI Z359 by section number only. Bundle only
  the typical connector deceleration benchmarks in
  data/cross/fall-protection-benchmarks.json from public manufacturer
  technical data.

## 3. Out of scope (still and forever)

- HazMat content. Stays on the future hazardous-materials site.
- Commercial pricing databases. Drift fast, not free, not durable.
- Code-compliance verdicts. The AHJ governs.
- Per-state code parameter shards that require a recurring statutory
  recheck (septic application rates, stair code maxima, fire-flow
  modifiers). The user enters local values; the tool does the math.
- Third-party APIs, accounts, fetches beyond same-origin static assets.
- AI / LLM / probabilistic anything.
- Any tool that depends on a paid subscription dataset, a paid API, or a
  recurring developer-funded license.
- Any tool that requires an account to use.
- Any utility that produces a stamped-engineering result without a
  visible engineer-of-record-variant notice.

## 4. Data posture for v7

Every new shard satisfies the same four conditions as v1 through v4: public
domain, physical fact, U.S. government publication, or explicitly
redistributable manufacturer / standards-body data. No reproduction of
licensed text or tables. The v7 line that did not exist before: nothing
ships in v7 that requires a recurring data subscription, a paid feed, or a
state-statute recheck.

### New data shards introduced by v7

| Shard | Source | Notes |
| --- | --- | --- |
| data/electrical/conductor-c-values.json | Bussmann published point-to-point C-values | Cite by name only. |
| data/electrical/nema-mg1-code-letters.json | NEMA MG-1 code-letter table | Cite by name only; numeric values only. |
| data/electrical/dwelling-demand.json | Public demand-factor methodology, numeric thresholds only | Cite by name only; no code text. |
| data/plumbing/pipe-elastic-properties.json | Public engineering references for modulus, density, wall thickness | Engineering practice. |
| data/plumbing/pump-curves.json | Manufacturer technical bulletins cleared for redistribution | Attribute per manufacturer; only ship curves with explicit reuse rights. |
| data/plumbing/thermal-expansion-coefficients.json | Public engineering tables of alpha, E, allowable stress | Engineering consensus values. |
| data/hvac/duct-roughness.json | Public engineering references | Physical fact. |
| data/hvac/duct-fittings.json | Public ASHRAE-style fitting loss coefficients | Cite ASHRAE by name only. |
| data/hvac/refrigerant-pt-tables.json | Manufacturer P-T tables cleared for redistribution | Attribute per manufacturer. |
| data/hvac/insulation-k-values.json | Public manufacturer technical data | Engineering practice; per-manufacturer attribution where applicable. |
| data/construction/rebar-unit-weights.json | Public engineering references | Engineering consensus values. |
| data/construction/apa-span-ratings.json | APA published span-rating numeric tables | Cite APA by name only. |
| data/construction/helical-pile-kt.json | Manufacturer torque-correlation benchmarks | Attribute per manufacturer. |
| data/fire/iso-nff.json | Public ISO Fire Suppression Rating Schedule numeric factors | Cite by name only. |
| data/cross/fall-protection-benchmarks.json | Manufacturer connector deceleration data | Attribute per manufacturer. |

Every new shard receives an entry in docs/data-sources.md, scripts/sources.md,
the build-data pipeline, and data/integrity.json. Manufacturer-attributed
shards (pump-curves, refrigerant-pt-tables, insulation, helical-pile-kt,
fall-protection) get the v3-introduced quarterly attribution-and-link
recheck. Engineering-consensus shards (conductor C-values, pipe properties,
duct, rebar, ISO factors) are stable enough for an annual recheck.

### Derivations that need a new section in docs/derivations.md

- Transformer FLA from kVA, voltage, and phase.
- Bussmann point-to-point short-circuit method including the M-factor.
- NEMA MG-1 motor-starting kVA from code letter and HP.
- Joukowsky water-hammer surge with celerity from pipe-fluid coupling.
- Pump-and-system-curve intersection (numerical solve for the operating
  point).
- Septic absorption-area methodology.
- Pipe thermal expansion with guided-cantilever loop sizing.
- Duct friction loss from Darcy-Weisbach with the Colebrook-equivalent
  approximation used for ducts.
- Duct fitting loss from C_o times velocity pressure.
- Refrigerant superheat and subcooling from saturation-table lookup.
- Cooling-tower range, approach, and gpm-times-500-times-range heat
  rejection.
- Bare-pipe conduction-convection-radiation heat-loss form.
- Stair stringer geometry (rise, run, hypotenuse, throat).
- Hip and valley framing-square multipliers.
- Rebar bend allowance and unit-weight summation.
- APA span-rating allowable-load lookup methodology.
- Helical pile torque-to-capacity correlation.
- Crane percent-of-chart-capacity arithmetic with sling tension reuse.
- ISO Needed Fire Flow formula NFF = Ci times Oi times (X plus P).
- Fall protection clearance summation.

## 5. UI patterns

All v7 utilities follow the v1 through v4 patterns exactly. No new patterns
are introduced. Three notes specific to v7:

- The pump-curve utility 239 is the first v7 tool with a graphic output. It
  reuses the existing inline-SVG pattern from v3 utility 122 (print view)
  and v4 utility 218 (audio delay diagram). No new dependencies. The plot
  is a pure SVG of two polylines with axis labels; no charting library.
- The refrigerant utility 243 ships a clear unit selector for pressure (psig
  versus psia) because P-T table lookups are the most common source of
  field error; the default is psig with a visible "psig" pill on every
  pressure input.
- The crane lift utility 251 is the only v7 tool that explicitly refuses to
  render an output if the user has not entered a chart capacity. The
  inline notice reads: "This tool needs the chart capacity for your
  configuration. The crane manufacturer's load chart governs. We will not
  guess." The output region renders the notice instead of a number.

## 6. Build, test, and deployment

Same as v1 through v4. New compute functions land in the existing per-group
modules: calc-electrical.js, calc-plumbing.js, calc-hvac.js,
calc-construction.js, calc-fire.js, calc-cross.js. Each new utility ships
with at least 10 unit-test cases. Each first-principles calculation gets a
section in docs/derivations.md and an entry in
test/unit/first-principles.test.js. The home-view payload budget remains
100 KB after gzip. New shards are dynamic-loaded by the per-utility renderer
on first use.

Special test requirements for v7:

- Utility 235 short-circuit: include the canonical Bussmann worked example
  from a public training bulletin as a fixture.
- Utility 238 water hammer: verify celerity and dP against a published
  textbook problem to four significant figures.
- Utility 239 pump operating point: include a numerical-solver test that
  asserts the operating point converges within 0.5 gpm of the visual
  intersection on three bundled curves.
- Utility 243 refrigerant: verify against three manufacturer P-T charts
  per refrigerant; include a regression test for the psig-versus-psia
  toggle.
- Utility 246 stair stringer: include a code-edge-case test where the
  computed rise per step lands one hundredth of an inch above 7.75
  inches and the user has entered 7.75 as the local-code maximum; the
  tool must flag fail.
- Utility 251 crane lift: include an "input incomplete" test where the
  chart capacity is blank and the output region must render the refusal
  notice rather than a number.

## 7. Step-by-step build instructions and Claude Code prompts

These prompts continue the numbering from spec-v4.md section 7 (which ends
at step 57). Paste each prompt into Claude Code with the repo as the
working directory. Each prompt assumes prior steps are complete and tests
are green. No code is supplied below; the prompts are the specification.

### Step 58: Group A v7 — Electrical (utilities 234 through 237)

> Implement utilities 234 through 237 from spec-v7.md section 2.1 in
> calc-electrical.js. For each utility, add the compute function, an
> Example export with at least one realistic worked example sourced from a
> public engineering-practice problem, the renderer, and the renderer
> registration in ELECTRICAL_RENDERERS. Add the new tool entries to the
> TOOLS registry in app.js with the right group and trade tags. Use the
> standard FLA formula for utility 234 and recommend from the bundled
> ANSI/IEEE step series. Implement utility 235 by computing
> I_sca_secondary first, then walk downstream by accumulating the
> M-factor at each conductor segment using the C-values from
> data/electrical/conductor-c-values.json. Implement utility 236 by
> reading the per-HP starting kVA from
> data/electrical/nema-mg1-code-letters.json and applying the published
> 30 percent voltage-dip criterion. Implement utility 237 by walking the
> demand-factor schedule numerically; carry the AHJ-governs notice
> prominently. Add the three new shards to scripts/build-data.mjs,
> docs/data-sources.md, scripts/sources.md, and data/integrity.json. Add
> TOOL_DATA_SOURCES entries for 235, 236, 237. Add 10+ unit tests per
> utility in test/unit/calc-electrical-v7.test.js, including the
> canonical Bussmann worked example for utility 235. Add
> docs/derivations.md sections for utilities 234, 235, 236, 237. Run
> npm test, npm run lint, npm run data:verify. The build must stay green
> and the home-view payload budget must stay under 100 KB after gzip.
> Update CHANGELOG.md under Unreleased > Build progress (v7).

### Step 59: Group B v7 — Plumbing and Hydronics (utilities 238 through 241)

> Implement utilities 238 through 241 from spec-v7.md section 2.2 in
> calc-plumbing.js. Implement utility 238 Joukowsky surge by computing
> celerity from the bundled pipe-fluid coupling (data/plumbing/
> pipe-elastic-properties.json) and rho times a times dV for the surge;
> flag against 2L over a for rapid closure. Implement utility 239 pump
> operating point by reading a manufacturer-attributed pump curve from
> data/plumbing/pump-curves.json and finding the intersection of the
> bundled head-versus-flow polyline and the computed system curve
> H_sys = H_static + k times Q^2; render a pure-SVG plot of both curves
> plus the operating point. Ship only pump curves cleared for
> redistribution; if a manufacturer's terms are unclear, do not include
> their curve. Implement utility 240 septic drainfield with the
> AHJ-governs hardened notice; do not bundle a per-state shard. Implement
> utility 241 thermal expansion with the per-material alpha and the
> guided-cantilever loop-sizing form. Add docs/derivations.md sections
> for utilities 238, 239, 241. Add 10+ unit tests per utility in
> test/unit/calc-plumbing-v7.test.js. Run the full suite, update
> CHANGELOG.md.

### Step 60: Group C v7 — HVAC (utilities 242 through 245)

> Implement utilities 242 through 245 from spec-v7.md section 2.3 in
> calc-hvac.js. For utility 242 duct friction, implement the closed-form
> Darcy-Weisbach approximation for ducts using the bundled absolute
> roughness from data/hvac/duct-roughness.json and the Colebrook-equivalent
> friction factor; sum straight-duct loss with fitting losses from
> C_o times velocity pressure where C_o values come from
> data/hvac/duct-fittings.json. For utility 243 superheat and subcooling,
> bundle public manufacturer-attributed P-T tables for R-410A, R-32,
> R-454B, R-22 (legacy reference), and R-134a in
> data/hvac/refrigerant-pt-tables.json; implement a clear psig-versus-psia
> toggle on every pressure input with psig as the default. For utility
> 244 cooling tower, compute range, approach, and gpm times 500 times
> range heat rejection. For utility 245 insulation heat loss, implement
> the cylindrical-conduction-plus-convection-plus-radiation form using k
> values from data/hvac/insulation-k-values.json. Add the four new shards
> to the build pipeline. Add TOOL_DATA_SOURCES entries for 242, 243, 245.
> Add docs/derivations.md sections for utilities 242, 243, 244, 245. Add
> 10+ unit tests per utility in test/unit/calc-hvac-v7.test.js, with a
> regression test for the psig-versus-psia toggle on utility 243. Run
> the full suite, update CHANGELOG.md.

### Step 61: Group E v7 — Carpentry and Construction (utilities 246 through 251)

> Implement utilities 246 through 251 from spec-v7.md section 2.4 in
> calc-construction.js. Utility 246 stair stringer: compute riser count,
> exact rise, tread, total run, stringer hypotenuse, and a pass/fail flag
> against the user-entered local-code rise and tread maxima. Utility 247
> hip and valley: implement the framing-square method including
> irregular-hip handling where the two adjacent pitches differ. Utility
> 248 rebar schedule: read unit weights from
> data/construction/rebar-unit-weights.json and compute total cut length
> with bend allowance. Utility 249 plywood span: read APA published
> numeric span-rating tables from data/construction/apa-span-ratings.json
> and flag against user-supplied design loads. Utility 250 helical pile:
> compute ultimate and allowable capacity from torque times Kt; carry the
> engineer-of-record notice prominently. Utility 251 crane lift quick-
> math: refuse to render an output if the user has not entered a chart
> capacity for the configuration; render the hardened notice instead;
> when capacity is supplied, compute percent of chart and flag at 75 and
> 90 percent. Add the three new shards to the build pipeline (rebar
> weights, APA span ratings, helical-pile Kt). Add TOOL_DATA_SOURCES
> entries for 248, 249, 250. Add docs/derivations.md sections for
> utilities 246, 247, 248, 250, 251. Add 10+ unit tests per utility in
> test/unit/calc-construction-v7.test.js, including the stair-code edge
> case described in section 6 and the crane "input incomplete" refusal
> case. Run the full suite, update CHANGELOG.md.

### Step 62: Group F v7 — Fire-Ground (utility 252)

> Implement utility 252 ISO Needed Fire Flow in calc-fire.js. Compute
> NFF = Ci times Oi times (X + P) per the public ISO method, with Ci
> from 18 times F times sqrt(A) and the F factors per construction class
> bundled in data/fire/iso-nff.json. Round to the nearest 250 gpm and
> cap at the published maximum. Carry the SOP-and-incident-command
> variant notice. Add docs/derivations.md section for utility 252. Add
> 10+ unit tests in test/unit/calc-fire-v7.test.js, including the
> rounding-and-cap behavior. Run the full suite, update CHANGELOG.md.

### Step 63: Group G v7 — Cross-Trade (utility 253)

> Implement utility 253 fall protection clearance in calc-cross.js. Sum
> free-fall + deceleration + worker-height + harness-stretch + safety-
> factor; flag against the user-entered actual clearance below the
> anchor. Carry both the engineer-of-record and the worker-safety variant
> notices. Bundle typical connector deceleration benchmarks in
> data/cross/fall-protection-benchmarks.json with per-manufacturer
> attribution. Add TOOL_DATA_SOURCES entry. Add docs/derivations.md
> section. Add 10+ unit tests in test/unit/calc-cross-v7.test.js,
> including a "negative remaining clearance" failure case. Run the full
> suite, update CHANGELOG.md.

### Step 64: Documentation, integrity, and final review for v7

> Update docs/data-sources.md, docs/derivations.md, docs/legal.md,
> docs/threat-model.md, docs/launch-checklist.md, and docs/accessibility.md
> to reflect every v7 utility, every new shard, every new derivation, and
> the new engineer-of-record notice variant. Run npm run data:refresh to
> regenerate data/integrity.json for all new shards. Run npm run lint,
> npm test, npm run test:e2e, npm run test:a11y, npm run build. All must
> pass. Confirm the home-view payload remains under 100 KB after gzip
> with the new tools added. Confirm Lighthouse CI still scores 95 or
> higher across performance, accessibility, best practices, and SEO.
> Update CHANGELOG.md with a v0.7.0 release stanza summarizing the v7
> expansion. Bump package.json version to 0.7.0. Update the README's
> tool-count claim to reflect the new total (two hundred fifty three
> utilities). Produce a written launch checklist diff vs
> docs/launch-checklist.md showing exactly what changed. The release is
> ready when every item in this step passes.

## 8. Operations and ongoing maintenance (v7 addendum)

Same as v1 through v4. The v7 shards split into two recheck cadences:

- Annual cadence: engineering-consensus and standards-body shards
  (conductor-c-values, nema-mg1-code-letters, dwelling-demand,
  pipe-elastic-properties, thermal-expansion-coefficients, duct-roughness,
  duct-fittings, rebar-unit-weights, apa-span-ratings, iso-nff). These
  values are stable across years; the recheck is a sanity pass.
- Quarterly cadence: manufacturer-attributed shards (pump-curves,
  refrigerant-pt-tables, insulation-k-values, helical-pile-kt,
  fall-protection-benchmarks). Manufacturer URLs and catalogs move; the
  per-entry "verified on" date drives priority.

A failed recheck (URL moved, manufacturer revoked redistribution rights,
table changed) results in a CHANGELOG entry, a shard update, and a re-run
of the full data-integrity hash chain. If a manufacturer revokes
redistribution rights for a curve or a table, that entry is removed from
the shard within 30 days and the affected utility's worked example is
rebuilt around a remaining cleared entry.

## 9. Closing note, in the voice from the foreword

I have watched a journeyman pull a service-entrance demand calculation out
of his head while the inspector watched, then double-check it on his
phone before signing the load sheet. I have watched a refrigeration tech
pull a pressure-temperature chart out of a back pocket so creased the R-410A
column had worn off, and stand there squinting at it under a parking-lot
light. I have watched a framer lay out a stair stringer with a square and
a pencil on the back of the joist that was about to be the stringer.

The point of this site is the same as it has always been. The math should
be there when those folks reach for it, and nothing else should be. No
banner. No login. No "are you sure you want to allow notifications." Just
the answer, the source, and the clipboard. And nothing on this site should
ever cost the developer a dollar a month to keep alive, because the day
the bill gets too big is the day a working tool starts looking like a
business problem, and that is how good things go bad.

v7 keeps that promise and adds twenty more tools that real tradespeople
ask real questions about, with no recurring data costs, no API keys, and
no subscription feeds. Build it the way the rest of it was built. One
tile, one calculation, one citation, one copy.

Then get out of the user's way.
