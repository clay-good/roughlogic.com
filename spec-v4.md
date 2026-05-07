# roughlogic.com Specification v4 — The Wider Toolbox

> Foreword, in the voice of someone who has spent more time in cabs, holds, lofts,
> and back-of-house walk-ins than in conference rooms.
>
> Pull up a chair. I want to talk about the work nobody puts on a brochure. The
> trucker chalking a freight class on a bill of lading at three in the morning.
> The marine tech running prop slip on the back of a fuel receipt because the
> owner swears the boat used to do thirty-two. The sawyer cruising timber with
> a pencil stub and the Doyle rule. The water operator dosing chlorine by the
> pounds formula while the SCADA argues with itself. The roadie hanging a
> half-million-dollar lighting rig from a forty-foot truss and doing the load
> math in his head while the band soundchecks. The line cook scaling a recipe
> from twelve to two hundred eighty-five for a wedding that started yesterday.
> The ranger pacing a search grid five miles from the nearest cell tower.
>
> Every one of those folks is doing real math, on a real clock, with real
> consequences. And every one of them, if they reach for a website to check
> their work, gets a banner ad, a cookie wall, an email gate, an autoplay
> video, and a chatbot that wants to "help."
>
> v1 nailed the basics. v2 widened the net. v3 went into the mud with the
> trades. v4 widens it further, into the cabs and the holds and the lofts and
> the kitchens and the backcountry, and it does it the same way the rest of
> the site is built: one tile, one calculation, one citation, one copy. No
> account, no server, no AI, no ads, no telemetry, no opinion. Just the
> physics, sourced and dated, and a button that puts the answer on the
> clipboard so the user can get back to work.
>
> Build it the way the rest was built. Then get out of the way.

This document is the v4 spec. It inherits everything from spec.md, spec-v2.md,
and spec-v3.md. If anything below conflicts with v1, v2, or v3, the earlier
spec wins; rewrite the v4 entry until it complies.

Repository: github.com/clay-good/roughlogic.com

## 1. Inheritance from v1, v2, and v3

Every constraint in spec.md, spec-v2.md, and spec-v3.md continues to hold
without exception:

- 100 percent client-side, single-page static web application on Cloudflare
  Pages. No server, no account, no analytics, no telemetry, no AI inference,
  no API key, no third-party fetch. Same-origin static assets only.
- No localStorage / sessionStorage / cookies / IndexedDB beyond the existing
  rl-theme key (and the v3-confirmed rl-bigbuttons key, if accepted).
  URL hash is the only state mechanism.
- CSP default-src 'self', connect-src 'self', worker-src 'self'.
- WCAG 2.2 Level AA, 48 px touch targets, voice-input compatibility, single
  h1 per view, Big Buttons mode and High-Contrast theme available from v3.
- No emojis, no em-dashes, no decorative icons.
- No reproduction of NEC, IPC, IRC, IECC, IFC, IBC, ASHRAE, ACCA, NFPA, AWC,
  ASCE, ASTM, ANSI, OSHA training materials, FMCSA driver-handbook text,
  FAA AC text, USDA crop bulletin text, AWWA training materials, NMFTA NMFC
  text, FDA Food Code text, or any other licensed code text. Calculations
  derive from public physics, U.S. government publications, or
  manufacturer / standards-body data cleared for redistribution.
- Per-view inline notice on every calculator. Worker-safety variant on the
  field, kitchen, water-ops, and rigging utilities introduced here.
  AHJ-and-carrier-tariff-governs variant on the trucking utilities.
  Pilot-in-command-governs variant on the aviation utility.
- Live-render, 50 ms debounce, aria-live polite output, "Test with example,"
  Copy and Copy-all, inline citation, source stamp, hash-bookmarkable inputs.
- Lazy-loaded calculator modules. Home-view payload budget under 100 KB
  after gzip remains the binding constraint. Add the new modules to the
  dynamic import map; do not bloat app.js.
- Public changelog, semver, no A/B, no flags, no tracking. 90-day
  deprecation. No "premium tier," ever.
- The v3 prohibition on live-data alerts, push notifications, SMS callbacks,
  or anything that requires a server still holds. Historical context, yes.
  Live alerts, no.

## 2. New utilities (numbered continuing from v3)

v3 ended at utility 187 (Crash-Safe Resume). v4 picks up at 188 and runs
through 233. Seven new groups, J through P, plus a small Group Q for
historical reference data. Existing groups A through I are not extended in
this version; v4 widens the trade coverage rather than deepening any one
trade. Below each group is the list, then the build prompts follow in
section 7.

### 2.1 Group J: Trucking and Logistics (utilities 188 through 194)

- 188. Dimensional Weight (DIM). Inputs: length, width, height in inches,
  actual weight in pounds, carrier selector (UPS Daily, UPS Retail, FedEx
  Ground, FedEx Express, USPS, DHL Express, freight). Output: dimensional
  weight from (L times W times H) over divisor, billable weight as the
  greater of dimensional and actual, and a per-carrier divisor source stamp
  bundled in a new data shard. Cite each carrier's published divisor by
  carrier name and date; do not reproduce tariff text.
- 189. Freight Density and NMFC Class. Inputs: handling-unit dimensions and
  weight, optional commodity selector. Output: density in pounds per cubic
  foot, the public density-based freight class bracket from the NMFTA
  density scale (Class 50 through 500), and a notice that the actual NMFC
  class can be set by commodity, stowability, handling, or liability and
  that the density bracket is a math aid only. Cite NMFTA by name only.
- 190. Pallet Cube and Trailer Loadout. Inputs: case dimensions, case
  weight, cases per pallet (or compute from a tile-pattern selector),
  pallet footprint (default 48x40), trailer interior dimensions selector
  (53 ft dry van, 48 ft, 28 ft pup, 40 ft reefer, 20 ft and 40 ft ocean
  container), pinwheel allowed flag. Output: pallets per trailer by floor
  area and by stack-rated weight, total cube fill percent, total weight,
  and a cube-out vs weigh-out flag.
- 191. Hours of Service Math. Inputs: shift start time, on-duty events
  (driving, on-duty not driving, sleeper, off-duty) entered as start/stop
  pairs, regulation profile selector (FMCSA property-carrier 70/8 or 60/7,
  passenger 70/7). Output: drive time used, drive time remaining before
  the 11-hour limit, on-duty time remaining before the 14-hour window,
  cumulative time remaining before the 70-or-60 hour cap, the 30-minute
  break status, and the next earliest legal drive time. Cite FMCSA 49 CFR
  395 by section number only. Notice: "Math aid for personal verification.
  The ELD on the truck is the legal record."
- 192. Federal Bridge Formula and Axle Weights. Inputs: per-axle weights
  in pounds, per-axle spacings in feet. Output: total weight, per-axle
  legal max against the 20,000 lb single and 34,000 lb tandem federal
  limits, and the bridge-formula maximum gross
  W = 500 times ((LN over (N minus 1)) + 12N + 36) for each consecutive
  axle group. Cite 23 CFR 658 / FHWA Bridge Formula by section number only.
- 193. Reefer Fuel Burn and Run Time. Inputs: reefer unit fuel-burn rate
  gallons per hour by mode (continuous vs cycle-sentry), tank capacity,
  ambient temperature band, set point. Output: estimated run time hours,
  fuel burned over a user-specified haul, and a flag if the haul exceeds
  the tank without a refuel stop. Bundle a small public benchmark table
  for typical units; cite manufacturer technical bulletins.
- 194. Incoterms 2020 Decoder. Inputs: term selector (EXW, FCA, CPT, CIP,
  DAP, DPU, DDP, FAS, FOB, CFR, CIF). Output: original plain-English
  summary of who pays freight, who carries risk, who handles export and
  import clearance, and at what point risk transfers. Cite ICC Incoterms
  2020 by name only. No reproduction of the rules text.

### 2.2 Group K: Mechanic — Auto, Marine, and Aviation (utilities 195 through 202)

- 195. Aircraft Weight and Balance. Inputs: empty weight and empty moment
  from the airplane flight manual (user supplies), reference datum
  position, station list with arm in inches and weight in pounds for
  pilot, passengers, fuel by tank, and baggage. Output: total weight,
  total moment, computed center-of-gravity in inches aft of datum, and a
  pass/fail flag against user-supplied forward and aft CG limits and
  maximum gross weight. Notice: "Pilot-in-command and the airplane
  flight manual govern. This is a math aid; verify against the AFM
  loading graph or table." Cite FAA AC 91-23A by name only.
- 196. Marine Prop Slip. Inputs: engine RPM, gear ratio, prop pitch in
  inches, actual GPS speed in knots. Output: theoretical speed = (RPM
  over gear ratio) times pitch / 1056 (or the metric-equivalent
  derivation), prop slip percent = ((theoretical minus actual) over
  theoretical) times 100, and a typical-range flag (planing 10-15
  percent, displacement 25-30 percent). Cite the prop-slip formula from
  public marine engineering practice.
- 197. Engine Displacement and Compression Ratio. Inputs: bore in inches
  or millimeters, stroke, cylinder count, combustion chamber volume in
  cc, head gasket bore and compressed thickness, deck clearance, piston
  dome or dish volume. Output: displacement in cubic inches and liters,
  static compression ratio = (V_cylinder + V_chamber + V_gasket +
  V_deck minus V_dome) over (V_chamber + V_gasket + V_deck minus V_dome),
  and a typical pump-gas-friendly window flag. Cite the public CR formula
  by name.
- 198. Bolt Stretch and Clamp Load. Inputs: bolt grade, diameter, grip
  length (clamped section), torque or target stretch in thousandths,
  fastener material modulus selector. Output: clamp load from
  F = (stretch times area times E) over grip length, and a
  cross-check torque from utility 153. Cite Machinery's Handbook
  equivalent public engineering practice. This is the stretch-method
  companion to v3 utility 153 (torque method), not a replacement.
- 199. Driveshaft Critical Speed. Inputs: shaft outside diameter, wall
  thickness, length between U-joints, material selector (steel,
  aluminum, carbon fiber composite). Output: critical RPM from the
  public Euler-Bernoulli derivation
  N_crit = (4.7 over L squared) times sqrt((E times I) over (rho times
  A)), expressed in RPM, with a typical safety-factor recommendation
  (operate below 0.6 to 0.75 of critical). Cite the derivation by name.
- 200. Fuel Energy and Range. Inputs: fuel type selector (gasoline E10,
  E85, diesel #2, LPG, CNG, jet A), tank capacity, vehicle mpg or
  efficiency, optional load adjustment factor. Output: total energy in
  BTU and kWh from public fuel-density and lower-heating-value
  benchmarks bundled in a new shard, theoretical range, and a derate
  flag if the fuel selector differs from the mpg basis. Cite DOE EERE
  fuel-property tables by name only.
- 201. Tire Size and Effective Gear Ratio. Inputs: tire size string
  (e.g., 285/75R17 or 33x12.50R17), original tire size, axle ratio,
  transmission top-gear ratio, target cruise RPM. Output: revolutions
  per mile for each tire size, effective overall ratio, cruise speed at
  target RPM, and the regear-recommendation table to restore original
  effective ratio at common axle ratios (3.73, 4.10, 4.56, 4.88, 5.13,
  5.38). Bundle the size-to-diameter conversion as public physical
  geometry.
- 202. Brake Pad Lifespan and Heat Capacity. Inputs: vehicle weight,
  speed range delta per stop, stops per mile, ambient temperature, pad
  thickness, pad material selector (organic, semi-metallic, ceramic).
  Output: kinetic energy per stop = 0.5 times m times v squared,
  estimated rotor temperature rise per stop using a bundled specific-heat
  benchmark by rotor mass, and a rough pad-life estimate from a public
  wear-rate benchmark. Cite the kinetic-energy derivation by name.
  Notice: "Estimate only. Manufacturer and AHJ govern."

### 2.3 Group L: Agriculture and Forestry (utilities 203 through 209)

- 203. Chemical Application Rate (GPA). Inputs: nozzle GPM at the
  selected pressure (or compute from nozzle orifice and pressure with
  the public square-root form), nozzle spacing in inches, ground speed
  in miles per hour. Output: gallons per acre = (5940 times GPM) over
  (speed times spacing), and the inverse: required GPM per nozzle to
  hit a target GPA. Cite the public GPA formula by name. Notice:
  "Read and follow the product label. The label is the law."
- 204. Timber Cruise — Doyle, Scribner, and International 1/4 Inch.
  Inputs: small-end diameter inside bark, log length in feet, rule
  selector. Output: board feet per log by Doyle = ((D minus 4) squared)
  times (L over 16), Scribner from a published public-domain table
  (bundled), and International 1/4 inch from the public formula
  0.22 D squared minus 0.71 D, with a note that International is the
  most accurate for small logs and Doyle is industry-standard but
  underestimates small logs. Cite USDA Forest Service general
  technical reports by name only.
- 205. Planting Density and Seed Rate. Inputs: row width in inches,
  in-row seed spacing or target population per acre, seeds per pound,
  germination percent. Output: seeds per acre, pounds of seed per acre,
  and the cost per acre if the user supplies a seed price. Pure
  geometry; cite public agronomy practice.
- 206. Tractor Drawbar Power. Inputs: drawbar pull in pounds, ground
  speed in mph, tractive efficiency selector (concrete 0.87, firm soil
  0.72, tilled soil 0.55, sand 0.50). Output: drawbar horsepower =
  (pull times speed) over 375, PTO horsepower estimate from the public
  drawbar-to-PTO efficiency benchmark, and a slip-and-pull guidance
  note. Cite ASABE D497 by name only.
- 207. Irrigation Sprinkler Uniformity. Inputs: a list of catch-can
  volumes after a timed run. Output: average application,
  Christiansen's coefficient of uniformity
  CU = 100 times (1 minus (sum of absolute deviations) over (n times
  mean)), distribution uniformity DU = 100 times (mean of low quarter)
  over mean, and a pass/fail flag against typical 85 percent and 75
  percent benchmarks. Cite Christiansen 1942 by name.
- 208. Soil Bulk Density and Compaction. Inputs: dry mass of a core in
  grams, core volume in cubic centimeters, particle density (default
  2.65 g/cc for mineral soil). Output: bulk density g/cc, total porosity
  = 1 minus (bulk density over particle density), and a flag against
  compaction thresholds for the selected texture class (sand 1.80,
  loam 1.55, clay 1.40 g/cc). Cite USDA NRCS technical notes by name
  only.
- 209. Crop Yield and Harvest Loss. Inputs: rows per pass, row spacing,
  measured length, ear or head count or weight per length, moisture
  percent (target 15.5 percent corn, 13 percent soy, 13.5 percent
  wheat). Output: yield in bushels per acre adjusted to standard
  moisture, plus an estimated header / shatter loss percent from a
  user-entered ground-loss count over a known measured area. Cite
  public extension-service practice generally.

### 2.4 Group M: Water and Wastewater Operations (utilities 210 through 215)

- 210. Pounds Formula. Inputs: flow in million gallons per day, dose in
  milligrams per liter, optional purity percent for the chemical
  selector (chlorine gas 100 percent, sodium hypochlorite 12.5 percent,
  calcium hypochlorite 65 percent, fluoride compounds, alum, ferric).
  Output: pounds per day = flow MGD times dose mg/L times 8.34, and the
  adjusted dosage at the selected purity. Cite the pounds formula by
  name. This is the holy-grail water-operator math.
- 211. Filter Loading Rate and Backwash. Inputs: filter surface area in
  square feet, flow in GPM, backwash rate selector (default 15 gpm/sq.ft).
  Output: loading rate in gpm per square foot, backwash flow in GPM,
  and pass/fail flags against typical rapid-sand (2-5 gpm/sq.ft) and
  high-rate (4-8 gpm/sq.ft) benchmarks. Cite AWWA general practice by
  name only.
- 212. Detention Time. Inputs: tank volume in gallons or computed from
  geometry (cylinder, rectangle), flow in GPM, MGD, or gallons per day.
  Output: detention time in minutes, hours, and days, and a pass/fail
  against the user-supplied target (chlorine contact time, flocculation
  time, sedimentation, etc). Cite the detention-time form by name.
- 213. Lab Dilution and Serial Dilution. Inputs: stock concentration,
  desired concentration, desired final volume; serial mode adds step
  count and dilution factor per step. Output: stock volume and diluent
  volume per the C1V1 = C2V2 form, plus the final concentrations at each
  serial step. Cite the dilution form by name. Plain field-lab math; the
  clinical equivalents stay on sophiewell.
- 214. Pump Wire-to-Water Efficiency. Inputs: flow in GPM, total dynamic
  head in feet, motor input kilowatts, motor efficiency, drive
  efficiency (default 1.0 direct drive). Output: water horsepower =
  (GPM times TDH) over 3960, brake horsepower estimate, wire-to-water
  efficiency percent, and a flag against typical good (greater than 65
  percent) and degraded (less than 50 percent) benchmarks. Cite the
  Hydraulic Institute by name only.
- 215. Solids Retention Time and F/M Ratio. Inputs: aeration tank volume,
  MLSS in mg/L, RAS flow and TSS, WAS flow and TSS, BOD load in pounds
  per day. Output: SRT in days = (aeration tank solids) over (waste
  solids), F/M ratio = BOD load over (MLVSS times tank volume), and a
  flag against conventional-activated-sludge typical ranges. Cite
  Metcalf and Eddy by name only.

### 2.5 Group N: Stage and Live Production (utilities 216 through 221)

- 216. Truss Point Load and Span Capacity. Inputs: truss model selector
  (12-inch box, 16-inch box, 20.5-inch ladder, etc.) with bundled
  manufacturer-attributed capacity curves, span between supports, list
  of point loads with position. Output: maximum allowable point load at
  each position from the bundled curve, total uniform-load equivalent,
  reaction at each support, and a pass/fail flag with safety factor.
  Notice: "Verify with the truss manufacturer's published load chart and
  a qualified rigger. Touring and entertainment rigging is governed by
  ANSI E1.21 and the venue's competent person." Bundle one or more
  manufacturer-attributed shards.
- 217. Audio Speaker Time Alignment. Inputs: distance from main hangs to
  the listening position in feet or meters, distance from delay-tower
  speakers to the same point, ambient temperature for speed-of-sound
  correction. Output: required electronic delay in milliseconds for
  each delay tower from the public speed-of-sound formula c = 331.3 +
  0.606 times T (Celsius), psychoacoustic Haas-window guidance (10-30
  ms additional to keep image at the stage). Cite the speed-of-sound
  derivation by name.
- 218. DMX-512 Address and Universe Planner. Inputs: list of fixtures
  with channel count and starting address, universe count selector.
  Output: per-fixture channel ranges, universe utilization percent
  (out of 512 channels), conflict and overflow detection, and a
  recommended split when a single universe overflows. Cite USITT
  DMX-512A by name only.
- 219. Three-Phase Neutral Imbalance and Distro Loading. Inputs: per-leg
  RMS amperage on a 3-phase 4-wire wye system. Output: neutral current
  estimate from the public balanced-load form
  I_N = sqrt(I_A squared + I_B squared + I_C squared minus I_A times
  I_B minus I_B times I_C minus I_A times I_C), imbalance percent, and
  a flag for harmonic-rich loads (LED dimmers, switching supplies)
  where the simple form underestimates neutral current and a derated
  neutral conductor can overheat. Cite the balanced-load derivation by
  name. Companion to Group A and to v3 utility 128.
- 220. SPL and Inverse Square Law. Inputs: SPL at a reference distance
  (typically 1 meter) in dB, target distance, room mode selector (free
  field, hemispherical, indoors). Output: SPL at distance from
  L2 = L1 minus 20 times log10(d2 over d1), with adjustments for the
  selected mode. Cite the inverse-square-law derivation by name.
- 221. Rigging Capacity Quick Check. Inputs: hardware type selector
  (shackle, sling, span set, steel cable, hoist), size, working load
  limit per the bundled manufacturer-attributed shard, configuration
  (vertical, choker, basket, included angle). Output: working load
  limit at the configured angle (reuses v3 utility 161 leg-tension
  math), safety factor, and a flag against the load. Cite ASME B30
  series by section number only. Notice: "A qualified and competent
  rigger governs. Math aid only."

### 2.6 Group O: Kitchen and Food Service (utilities 222 through 226)

- 222. Recipe Scaling. Inputs: original recipe (rows of ingredient,
  quantity, unit), original yield (servings or weight), target yield.
  Output: scaled rows preserving units when sensible and converting to
  weight when unit-scaling produces awkward numbers (e.g., 2.7 eggs
  becomes 135 grams of egg from public USDA reference weight). Bundle a
  small ingredient-density and unit-equivalence shard from the USDA
  FoodData Central public domain. Notice: "Bakers' percentages and
  yeast / leavening do not scale linearly. Verify critical ratios."
- 223. Yield Percentage and Edible Portion. Inputs: as-purchased weight,
  trim weight, cooking-loss percent. Output: yield percent = (edible
  portion over as-purchased) times 100, edible-portion cost per pound
  given the AP cost, and a true plate-cost back-out. Cite public
  food-service operations practice generally.
- 224. Food Safety Cooling Curve. Inputs: starting temperature, ambient
  temperature, container shape and depth selector (full hotel pan
  4 inch, half pan 2 inch, ice bath, blast chiller), product type
  selector (thin liquid, thick liquid, dense solid). Output: estimated
  time to pass from 135 F to 70 F (must be 2 hours or less per the
  public FDA Food Code 2022 requirement) and 70 F to 41 F (must be 4
  hours or less), with a pass/fail flag. Cite the FDA Food Code by
  section number only. Notice: "This is a planning aid. The thermometer
  on the food governs. Re-verify with a probe."
- 225. Plate Cost and Menu Pricing. Inputs: ingredient list with
  edible-portion cost per pound (or pull from utility 223), portion
  size, target food-cost percent (default 30 percent). Output: total
  plate cost, suggested menu price = plate cost over food-cost percent,
  contribution margin, and a sanity flag if the suggested price falls
  outside a reasonable range for the category.
- 226. Steam Table and Pan Conversion. Inputs: target volume or count,
  pan size selector (full, two-thirds, half, third, quarter, sixth,
  ninth) and depth (2.5, 4, 6 inch). Output: pan capacity in quarts and
  servings at the user's portion size, count of pans needed, and a
  warning when a deeper pan triggers the v4 utility 224 cooling-curve
  hazard. Cite NSF / public food-service standards generally.

### 2.7 Group P: Field, Backcountry, and SAR (utilities 227 through 232)

- 227. Pacing and Distance. Inputs: known calibration distance, count of
  paces over that distance, current count of paces, terrain selector
  (flat, rolling, steep, brush, snow). Output: distance in feet and
  meters with terrain correction factors from public USAF / SAR
  practice, plus a quick-reference table of typical pace-counts per
  100 m by stride length. Cite public SAR field references generally.
- 228. Magnetic Declination and Bearing Conversion. Inputs: magnetic
  declination (user enters from the topographic map margin or NOAA's
  published value), bearing in degrees, conversion direction (map to
  compass or compass to map). Output: corrected bearing per "east is
  least, west is best" with the explicit arithmetic shown. Cite NOAA
  NCEI World Magnetic Model by name only. Bundle no live magnetic data;
  declination changes annually and must come from the user.
- 229. Slope Angle and Avalanche Risk Window. Inputs: rise over run, or
  measured angle in degrees from a phone-clinometer. Output: slope angle,
  slope percent, and a flag for the public 30-to-45-degree avalanche
  start-zone window with a notice that aspect, snowpack, weather, and
  terrain traps govern. Cite American Avalanche Association published
  guidance by name only. Notice: "This is geometry. Avalanche
  forecasting is not. Consult avalanche.org and a qualified guide."
- 230. Backcountry Water and Caloric Requirement. Inputs: body weight,
  ambient temperature band, exertion level (easy, moderate, hard,
  extreme), trip days, group size. Output: water in liters per person
  per day from public USACE / military-doctrine benchmarks (2 to 6 L
  per day depending on conditions), calories per day from public
  exercise-physiology benchmarks (2500 to 6000 kcal), and total trip
  totals. Cite the public benchmarks generally.
- 231. UTM and Lat-Long Conversion. Inputs: a coordinate in either format
  with a datum selector (WGS84, NAD83, NAD27). Output: the converted
  coordinate from the public deterministic UTM forward and inverse
  formulas (Krueger series). Cite the Krueger / USGS public-domain
  derivation by name only. No web map; pure math.
- 232. Sunrise, Sunset, and Civil Twilight. Inputs: latitude, longitude,
  date, timezone offset. Output: sunrise, sunset, civil twilight begin
  and end, nautical and astronomical twilight if requested, and total
  daylight minutes. Use the public NOAA solar-position algorithm.
  Bundle no almanac data; the algorithm is deterministic from the date
  and location. Cite NOAA Solar Calculator algorithm by name only.

### 2.8 Group Q: Historical Reference Data (utility 233)

- 233. Historical Pricing Context (Deterministic Reference). Inputs:
  commodity selector (copper, aluminum, structural steel, rebar,
  framing lumber, OSB, drywall, asphalt, diesel #2, gasoline E10,
  natural gas at the city gate, wheat, corn, soybeans), date or date
  range. Output: the bundled monthly historical price for that
  commodity from public BLS PPI, EIA, USDA NASS, and FRED series with
  the source and series ID stamped on each datapoint, plus a percentile
  band (25th, 50th, 75th, 90th) over a user-selected lookback so the
  user can see whether the current quote is high, low, or normal.
  Strictly bundled JSON shards refreshed at build time by the existing
  data pipeline; no fetch at runtime. No alerts, no subscriptions, no
  notifications. Cite each underlying federal series by ID and date.
  Notice: "Reference only. Ask your supplier for a current quote."

This is the Mike-Rowe-approved alternative to live price alerts: bundle
the past, let the user see where today sits in it, and never phone home.

## 3. Out of scope (still and forever)

- HazMat content. Stays on the future hazardous-materials site.
- Clinical, pharmacologic, or pediatric dosing. Stays on sophiewell.com.
- Cryptography, key handling, secret splitting. Stays on encryptalotta.
- Live data fetches, alerts, push notifications, SMS callbacks, email
  reminders, or anything that requires a server, a database, or a phone
  number. The historical reference (utility 233) is the boundary.
- Code-compliance verdicts. The AHJ governs.
- Any tool that depends on a paid subscription dataset.
- Any tool that requires an account to use.
- AI / LLM / probabilistic anything.

## 4. Data posture for v4

Every new shard satisfies the same four conditions as v1, v2, and v3:
public domain, physical fact, U.S. government publication, or explicitly
redistributable manufacturer / standards-body data. No reproduction of
licensed text or tables.

### New data shards introduced by v4

| Shard | Source | Notes |
| --- | --- | --- |
| data/logistics/dim-divisors.json | Carrier published divisor schedules | Attribute carrier and effective date per entry. |
| data/logistics/nmfc-density-scale.json | NMFTA published density bracket scale | Cite NMFTA by name only; no commodity item numbers. |
| data/logistics/trailer-interiors.json | Manufacturer technical bulletins | Attribute manufacturer per entry. |
| data/logistics/incoterms-2020.json | Original plain-English summaries | Original creative work, MIT-licensed. Cite ICC by name only. |
| data/mechanic/fuel-properties.json | DOE EERE alternative-fuels data center | Public domain. |
| data/mechanic/tire-sizes.json | Public-geometry tire-size derivation | Physical fact. |
| data/mechanic/rotor-specific-heat.json | Public engineering benchmarks | Engineering consensus. |
| data/agriculture/log-rules.json | USDA Forest Service general technical reports | Public domain. Bundles Scribner table; Doyle and International computed. |
| data/agriculture/soil-compaction.json | USDA NRCS technical notes | Public domain. |
| data/agriculture/asabe-tractive.json | ASABE D497 published efficiency benchmarks | Cite by name only. |
| data/water/chemical-purity.json | Public water-treatment practice | Engineering consensus. |
| data/water/loading-benchmarks.json | AWWA general practice | Cite by name only. |
| data/stage/truss-capacity.json | Manufacturer-attributed load charts | Attribute manufacturer per entry. |
| data/stage/rigging-wll.json | Manufacturer-attributed WLL tables | Attribute manufacturer per entry. |
| data/kitchen/usda-fdc-density.json | USDA FoodData Central | Public domain. |
| data/kitchen/pan-sizes.json | NSF / public food-service standards | Cite generally. |
| data/field/utm-constants.json | USGS / Krueger series | Public domain. |
| data/field/noaa-solar.json | NOAA Solar Calculator algorithm constants | Public domain. |
| data/historical/commodities/*.json | BLS PPI, EIA, USDA NASS, FRED | Public domain. One shard per series, refreshed at build time. |

Every new shard receives an entry in docs/data-sources.md, scripts/sources.md,
the build-data pipeline, and data/integrity.json. The
data/historical/commodities/ tree adds a refresh task to scripts/build-data.mjs
that pulls the federal series at build time and bundles them statically; no
runtime fetches.

### Derivations that need a new section in docs/derivations.md

- Dimensional weight (carrier divisor form).
- Federal Bridge Formula.
- Marine prop slip.
- Static engine compression ratio.
- Bolt stretch / clamp load.
- Driveshaft critical speed (Euler-Bernoulli form).
- Kinetic energy and brake-rotor heat capacity.
- GPA spray formula.
- Doyle, Scribner, International 1/4-inch log rules.
- Christiansen coefficient of uniformity.
- Soil bulk density and porosity.
- Pounds formula and chemical-purity adjustment.
- Detention time.
- C1V1 = C2V2 dilution.
- Wire-to-water pump efficiency.
- SRT and F/M activated-sludge ratios.
- Speed of sound and audio time alignment.
- Three-phase neutral imbalance (balanced-load form).
- Inverse square law for SPL.
- Krueger UTM forward and inverse.
- NOAA solar position algorithm.

## 5. UI patterns

All v4 utilities follow the v1, v2, and v3 patterns exactly. No new patterns
are introduced. The trucking and aviation utilities carry expanded notices
because the legal record (the ELD on the truck, the AFM on the aircraft)
governs. The kitchen utility 224 cooling-curve carries a worker-safety and
public-health notice that the thermometer on the food, not the math, is
the verdict. The field utility 229 avalanche window carries a hardened
notice that geometry is not forecasting.

The historical-pricing reference (utility 233) carries a notice that the
data is bundled and dated at build time and that current quotes belong to
the supplier.

## 6. Build, test, and deployment

Same as v1, v2, and v3. Each new group gets a new per-group calc module:

- calc-logistics.js (Group J)
- calc-mechanic.js (Group K)
- calc-agriculture.js (Group L)
- calc-water.js (Group M)
- calc-stage.js (Group N)
- calc-kitchen.js (Group O)
- calc-field.js (Group P)
- calc-historical.js (Group Q)

Each new utility ships with at least 10 unit-test cases. Each
first-principles calculation gets a section in docs/derivations.md and an
entry in test/unit/first-principles.test.js. The home-view payload budget
remains 100 KB after gzip. New modules dynamic-import on first use.

The data/historical/commodities/ tree is the only v4 element that touches
the build pipeline non-trivially. Add a build-time fetch step that pulls
the federal series, caches them in the repo with their source URL and
fetch date stamped into the shard, and fails the build loudly if any
series is unreachable for more than 30 days, so the maintainer rather than
the user discovers staleness.

## 7. Step-by-step build instructions and Claude Code prompts

These prompts continue the numbering from spec-v3.md section 7 (which ends
at step 48). Paste each prompt into Claude Code with the repo as the working
directory. Each prompt assumes prior steps are complete and tests are green.
No code is supplied below; the prompts are the specification.

### Step 49: Group J — Trucking and Logistics (utilities 188 through 194)

> Implement utilities 188 through 194 from spec-v4.md section 2.1 in a new
> calc-logistics.js module. Add the dynamic import to app.js. For each
> utility, add the compute function, an Example export with at least one
> realistic worked example, the renderer, and the renderer registration in
> LOGISTICS_RENDERERS. Add the new tool entries to the TOOLS registry in
> app.js with group J and trucking trade tags. For utility 188 DIM, bundle
> divisors in data/logistics/dim-divisors.json with carrier and
> effective-date attribution. For utility 189 freight class, bundle the
> NMFTA density-scale brackets in data/logistics/nmfc-density-scale.json
> and cite NMFTA by name only; do not include item numbers. For utility
> 190 pallet cube, bundle trailer interior dimensions in
> data/logistics/trailer-interiors.json. For utility 191 HOS, implement
> the FMCSA property-carrier 11/14/70 rules with the 30-minute break and
> the 34-hour reset; verify with at least three worked examples covering
> drivers near the 11-hour limit, the 14-hour window, and the 70-hour cap.
> For utility 192 federal bridge formula, compute per-axle-group max from
> the public formula across every consecutive group. For utility 193
> reefer fuel burn, bundle a small benchmark table; cite manufacturer
> bulletins. For utility 194 Incoterms, render original plain-English
> summaries from data/logistics/incoterms-2020.json. Add all four shards
> to scripts/build-data.mjs, docs/data-sources.md, scripts/sources.md, and
> data/integrity.json. Add TOOL_DATA_SOURCES entries for 188, 189, 190,
> 193, 194. Add 10+ tests per utility in test/unit/calc-logistics.test.js,
> including HOS edge cases at the limit boundaries. Add docs/derivations.md
> sections for utilities 188 and 192. Run npm test, npm run lint,
> npm run data:verify. The home-view payload must stay under 100 KB after
> gzip; verify with the build output. Update CHANGELOG.md.

### Step 50: Group K — Mechanic (utilities 195 through 202)

> Implement utilities 195 through 202 from spec-v4.md section 2.2 in a new
> calc-mechanic.js module. Add the dynamic import to app.js. For utility
> 195 aircraft W&B, accept user-supplied empty weight, empty moment,
> reference datum, and a station list; output total weight, total moment,
> CG, and pass/fail against user-supplied limits. Verify with at least
> two worked examples (a Cessna 172 and a Cessna 182 loadout, using
> realistic but user-entered numbers; do not bundle airplane-specific
> data). For utility 196 marine prop slip, implement the public form and
> verify against a worked example. For utility 197 displacement and CR,
> implement both metric and imperial inputs and verify against an LS3
> worked example. For utility 198 bolt stretch, derive clamp load from
> the standard mechanics-of-materials form; cross-check against utility
> 153. For utility 199 driveshaft critical speed, implement the
> Euler-Bernoulli form with material modulus and density bundled in code.
> For utility 200 fuel energy, bundle DOE EERE properties in
> data/mechanic/fuel-properties.json. For utility 201 tire size, derive
> overall diameter from the public size-string convention and bundle
> nothing manufacturer-specific. For utility 202 brake heat, implement
> kinetic-energy per stop and rotor heat rise; bundle rotor specific
> heats in data/mechanic/rotor-specific-heat.json. Add the three new
> shards to the pipeline. Add TOOL_DATA_SOURCES entries for 195, 200,
> 201, 202. Add docs/derivations.md sections for 195, 196, 197, 198, 199,
> 202. Add 10+ tests per utility in test/unit/calc-mechanic.test.js. Run
> the full suite, update CHANGELOG.md.

### Step 51: Group L — Agriculture and Forestry (utilities 203 through 209)

> Implement utilities 203 through 209 from spec-v4.md section 2.3 in a new
> calc-agriculture.js module. Add the dynamic import to app.js. For
> utility 203 GPA, implement the standard 5940 form and the inverse. For
> utility 204 timber cruise, implement Doyle and International 1/4-inch
> from the public formulas and Scribner from a bundled public-domain
> table in data/agriculture/log-rules.json. For utility 205 planting
> density, derive seeds per acre from row spacing and either in-row
> spacing or target population; convert to pounds using user-supplied
> seeds-per-pound and germination percent. For utility 206 tractor
> drawbar, implement the standard 375 form with tractive efficiency from
> data/agriculture/asabe-tractive.json. For utility 207 irrigation
> uniformity, implement Christiansen CU and DU. For utility 208 soil
> bulk density, derive porosity from particle density; bundle compaction
> thresholds in data/agriculture/soil-compaction.json. For utility 209
> crop yield, implement the standard yield-per-acre form with moisture
> adjustment for corn, soy, and wheat using public extension-service
> standard moistures. Add the three new shards to the pipeline. Add
> TOOL_DATA_SOURCES entries for 204, 206, 208. Add docs/derivations.md
> sections for 203, 204, 207, 208. Add 10+ tests per utility in
> test/unit/calc-agriculture.test.js. Run the full suite, update
> CHANGELOG.md.

### Step 52: Group M — Water and Wastewater Operations (utilities 210 through 215)

> Implement utilities 210 through 215 from spec-v4.md section 2.4 in a new
> calc-water.js module. Add the dynamic import to app.js. For utility 210
> pounds formula, implement the standard 8.34 form with chemical purity
> adjustment from data/water/chemical-purity.json. For utility 211 filter
> loading, derive gpm per square foot and bundle benchmarks in
> data/water/loading-benchmarks.json. For utility 212 detention time,
> support cylinder and rectangle volume inputs and convert across units.
> For utility 213 dilution, implement single-step C1V1=C2V2 and serial
> dilution. For utility 214 pump efficiency, implement the standard 3960
> form with motor and drive efficiency. For utility 215 SRT and F/M,
> implement the activated-sludge derivations. Add the two new shards to
> the pipeline. Add TOOL_DATA_SOURCES entries for 210, 211. Add
> docs/derivations.md sections for 210, 212, 213, 214, 215. Add 10+
> tests per utility in test/unit/calc-water.test.js, including a
> regression test that catches a chemical-purity dosing error (a common
> field mistake). Run the full suite, update CHANGELOG.md.

### Step 53: Group N — Stage and Live Production (utilities 216 through 221)

> Implement utilities 216 through 221 from spec-v4.md section 2.5 in a new
> calc-stage.js module. Add the dynamic import to app.js. For utility 216
> truss point load, bundle manufacturer-attributed capacity curves in
> data/stage/truss-capacity.json with attribution per entry. Compute
> reactions and per-position max load. For utility 217 audio time
> alignment, implement the speed-of-sound formula with temperature
> correction. For utility 218 DMX planner, accept a fixture list and
> assign sequential addresses across universes; detect overflow and
> conflicts. For utility 219 three-phase neutral imbalance, implement the
> balanced-load form and add the harmonic-derate flag. For utility 220
> SPL, implement inverse-square with mode adjustment. For utility 221
> rigging quick-check, bundle WLL tables in data/stage/rigging-wll.json
> and reuse v3 utility 161 leg-tension math. Add the two new shards to
> the pipeline. Add TOOL_DATA_SOURCES entries for 216, 221. Add
> docs/derivations.md sections for 217, 219, 220. Add 10+ tests per
> utility in test/unit/calc-stage.test.js. Run the full suite, update
> CHANGELOG.md.

### Step 54: Group O — Kitchen and Food Service (utilities 222 through 226)

> Implement utilities 222 through 226 from spec-v4.md section 2.6 in a new
> calc-kitchen.js module. Add the dynamic import to app.js. For utility
> 222 recipe scaling, bundle a small ingredient-density and unit
> equivalence shard from USDA FoodData Central in
> data/kitchen/usda-fdc-density.json. Detect awkward unit results and
> convert to weight when scaling produces fractional eggs, sticks of
> butter, etc. For utility 223 yield percentage, derive EP cost from AP
> cost. For utility 224 cooling curve, implement the FDA Food Code 2022
> 135-to-70 in 2 hours and 70-to-41 in 4 hours rule with a pass/fail
> flag based on the geometry and product-type estimate. For utility 225
> plate cost, derive menu price from food-cost percent. For utility 226
> pan conversion, bundle pan capacities in data/kitchen/pan-sizes.json.
> Add the two new shards to the pipeline. Add TOOL_DATA_SOURCES entries
> for 222, 224, 226. Add docs/derivations.md sections for 222, 223, 225.
> Add 10+ tests per utility in test/unit/calc-kitchen.test.js, including
> the cooling-curve fail case for a deep dense product cooled in a 4-inch
> hotel pan. Run the full suite, update CHANGELOG.md.

### Step 55: Group P — Field, Backcountry, and SAR (utilities 227 through 232)

> Implement utilities 227 through 232 from spec-v4.md section 2.7 in a new
> calc-field.js module. Add the dynamic import to app.js. For utility 227
> pacing, derive distance from calibration with terrain corrections. For
> utility 228 magnetic declination, implement east-is-least / west-is-best
> arithmetic; do not bundle live magnetic data. For utility 229 slope and
> avalanche window, derive angle and percent and flag the public 30-45
> degree window with the avalanche.org notice. For utility 230 water and
> calories, derive from public USACE / military-doctrine and
> exercise-physiology benchmarks. For utility 231 UTM and lat-long, bundle
> Krueger series constants in data/field/utm-constants.json and
> implement forward and inverse. For utility 232 sunrise / sunset,
> implement the NOAA solar position algorithm with constants in
> data/field/noaa-solar.json. Add the two new shards to the pipeline.
> Add TOOL_DATA_SOURCES entries for 231, 232. Add docs/derivations.md
> sections for 227, 231, 232. Add 10+ tests per utility in
> test/unit/calc-field.test.js, including UTM round-trip tests against
> published USGS test vectors and sunrise / sunset against published
> NOAA reference values for at least three latitudes. Run the full suite,
> update CHANGELOG.md.

### Step 56: Group Q — Historical Pricing Context (utility 233)

> Implement utility 233 from spec-v4.md section 2.8 in a new
> calc-historical.js module. Add the dynamic import to app.js. The tool
> reads bundled monthly history shards under data/historical/commodities/
> and renders a chart-free numeric table plus percentile bands (25, 50,
> 75, 90) over a user-selected lookback window. Initial commodities:
> copper (BLS PPI), aluminum (BLS PPI), structural steel (BLS PPI),
> rebar (BLS PPI), framing lumber (BLS PPI), OSB (BLS PPI), drywall
> (BLS PPI), asphalt (BLS PPI), diesel #2 (EIA retail), gasoline E10
> (EIA retail), natural gas city gate (EIA), wheat / corn / soybeans
> (USDA NASS or FRED). Each shard records the federal series ID and the
> fetch date.
>
> Extend scripts/build-data.mjs with a build-time fetch step that pulls
> the federal series, normalizes them to monthly cadence, writes the
> shards into the repo with source-and-date stamps, and updates
> data/integrity.json. The build must fail loudly if any series is
> unreachable for more than 30 days. There is no runtime fetch and no
> alert mechanism. Add docs/data-sources.md entries for every series.
>
> Render the tool view with a stamped notice: "Reference only. Bundled
> at build time on {date}. Ask your supplier for a current quote."
> Add 10+ tests in test/unit/calc-historical.test.js, including
> percentile-bracket tests against fixtures. Run the full suite, update
> CHANGELOG.md.

### Step 57: Documentation, integrity, and final review for v4

> Update docs/data-sources.md, docs/derivations.md, docs/legal.md,
> docs/threat-model.md, docs/launch-checklist.md, and docs/accessibility.md
> to reflect every v4 utility, every new shard, every new derivation,
> every new notice, and every new trade tag. Run npm run data:refresh
> to regenerate data/integrity.json for all new shards including the
> historical commodity series. Run npm run lint, npm test,
> npm run test:e2e, npm run test:a11y, npm run build. All must pass.
> Confirm the home-view payload remains under 100 KB after gzip with
> the new tools added (the home-view should still be far under the cap
> because all new calc files are dynamic-imported, and the historical
> shards lazy-load on first commodity selection). Confirm Lighthouse CI
> still scores 95 or higher across performance, accessibility, best
> practices, and SEO. Update CHANGELOG.md with a v0.4.0 release stanza
> summarizing the v4 expansion. Bump package.json version to 0.4.0.
> Update the README's tool-count claim to reflect the new total (two
> hundred thirty-three utilities) and the group list to mention the v4
> additions. Produce a written launch checklist diff vs
> docs/launch-checklist.md showing exactly what changed. The release is
> ready when every item in this step passes.

## 8. Operations and ongoing maintenance (v4 addendum)

Same as v1, v2, and v3. Two cadences are added:

- Carrier-divisor and Incoterms shards (utilities 188, 194) are rechecked
  semi-annually. Carriers update DIM divisors at the start of each
  calendar year. Incoterms is stable but deserves an annual sanity check.
- Historical commodity shards (utility 233) refresh monthly during the
  build. The build is configured to fail loudly if any federal series is
  more than 30 days stale, so the maintainer rather than the user
  discovers a broken upstream.

The truss capacity, rigging WLL, fuel properties, and all other
manufacturer- or standards-attributed shards stay on the existing
quarterly recheck cadence from v3.

## 9. Closing note, in the voice from the foreword

I have watched a trucker stand in front of a scale with a pencil and a
bill of lading and figure his bridge weight in his head while the DOT
officer waited. I have watched a sawyer cruise a hundred trees in an
afternoon with nothing but the Doyle rule and a logger's tape. I have
watched a water operator pull a sample, mix a bench dose, and trim the
chlorine feed by a tenth of a milligram per liter on the strength of a
calculation he did on the back of an envelope. I have watched a head
rigger walk under an arena truss and look up and do the load math one
last time before the show, because the show happens to several thousand
people and the math doesn't care.

The point of this site is the same as it has always been. The math
should be there when those folks reach for it, and nothing else should
be. No banner. No login. No "are you sure you want to allow
notifications." Not even a price alert, because the moment you accept
a phone number, you are no longer the kind of tool a working person can
trust. Just the answer, the source, and the clipboard.

v4 keeps that promise and widens the net again. Every utility above is
something a real person on a real job will ask a real question about,
and the answer is deterministic, sourced, dated, and free. Build it the
way the rest of it was built. One tile, one calculation, one citation,
one copy.

Then get out of the user's way.

Stay dirty.
