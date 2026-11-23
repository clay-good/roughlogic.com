// spec-v1339: the unit vocabulary shared by the field-index build and the
// browser's query extractor.
//
// This catalog does not carry a `unit` field on its input descriptors. It
// carries the unit inside the human label, in a trailing parenthesis --
// "Length one-way (ft)", "Design pressure (psi)" -- a convention that is
// already governed (docs/unit-notation-in-labels.md) and already linted
// (scripts/check-us-defaults.mjs). 4,357 of the catalog's 7,322 field
// descriptors end in one.
//
// The trailing parenthesis is NOT always a unit, and that is the whole
// difficulty. A survey of every label in the catalog found 1,107 distinct
// trailing tokens: the head is clean units ("in" x723, "ft" x514, "lb" x156)
// and the tail is guidance addressed to the reader ("in; 0 = none",
// "1.0 NW, 0.75 LW", "psi, A307 = 36000", "leave 0 to solve"). So the rule
// here is deliberately narrow, in the direction of refusing:
//
//   1. Take the trailing parenthesis only, and only if it closes the label.
//   2. Keep the first comma- or semicolon-delimited segment. That turns
//      "ft, optional" into "ft" and "in; 0 = none" into "in", while leaving
//      "1.0 NW" as the first segment of "1.0 NW, 0.75 LW".
//   3. Accept it ONLY if that segment is a known unit token. Anything else
//      resolves to null -- no unit, rather than a guessed one.
//
// A field with no unit is not a broken field. It simply means a bare number
// in a query cannot be matched to it by unit agreement, which is the
// conservative answer.

// Canonical unit token -> every spelling that resolves to it. The left side
// is what the index stores; the right side covers both what labels write and
// what a person types into the search box ("150 feet", "12 awg", "20 amps").
const UNIT_SPELLINGS = {
  // length
  // spec-v1976: the Spanish spellings a reader types (pie, pulgada, libra...),
  // compared after diacritics are folded. Metro/metros are deliberately absent:
  // a metric length is refused, as it is in English.
  in: ["in", "inch", "inches", '"', "pulg", "pulgada", "pulgadas"],
  ft: ["ft", "foot", "feet", "'", "pie", "pies"],
  yd: ["yd", "yard", "yards"],
  mi: ["mi", "mile", "miles"],
  mm: ["mm", "millimeter", "millimeters"],
  cm: ["cm", "centimeter", "centimeters"],
  m: ["m", "meter", "meters", "metre", "metres"],
  km: ["km", "kilometer", "kilometers"],
  // area
  in2: ["in²", "in2", "sq in", "sqin", "square inches", "square inch"],
  ft2: ["ft²", "ft2", "ft^2", "sq ft", "sqft", "square feet", "square foot"],
  yd2: ["yd²", "yd2", "sq yd", "sqyd", "square yards"],
  m2: ["m²", "m2", "sq m", "square meters"],
  // Since 2026-11-16 (with ft^2, ft^3, lbf, h, km, Hz, TPI, psia, fl oz and the
  // dotted "in. w.c."): 80 labels wrote one of these and so declared no unit.
  acre: ["acre", "acres"],
  // second moment of area -- rare but real (in⁴ x9)
  in4: ["in⁴", "in4"],
  // volume
  in3: ["in³", "in3", "cu in", "cubic inches"],
  ft3: ["ft³", "ft3", "ft^3", "cu ft", "cuft", "cubic feet", "cubic foot"],
  yd3: ["yd³", "yd3", "cu yd", "cubic yards"],
  cy: ["cy", "cubic yard", "cubic yards"],
  gal: ["gal", "gallon", "gallons", "galon", "galones"],
  l: ["l", "liter", "liters", "litre", "litres"],
  ml: ["ml", "milliliter", "milliliters"],
  floz: ["fl oz", "fl. oz", "floz", "fluid ounce", "fluid ounces"],
  // mass / force
  lb: ["lb", "lbs", "lbf", "pound", "pounds", "libra", "libras"],
  kg: ["kg", "kilogram", "kilograms"],
  g: ["g", "gram", "grams"],
  oz: ["oz", "ounce", "ounces"],
  ton: ["ton", "tons", "tonne", "tonnes"],
  kip: ["kip", "kips"],
  "kip-ft": ["kip-ft", "kipft"],
  "lb-ft": ["lb-ft", "ft-lb", "ftlb", "lbft"],
  // pressure / stress
  psi: ["psi"],
  psig: ["psig"],
  psf: ["psf"],
  ksi: ["ksi"],
  pcf: ["pcf", "lb/ft3", "lb/ft^3", "lb/cu ft"],
  // Compound rates labels already state (2026-11-23). Each is its own family,
  // so they fill only a field in exactly that unit and never convert.
  lbhr: ["lbhr", "lb/hr", "lb/h", "lbs/hr", "pph"],
  btulb: ["btulb", "btu/lb"],
  inhr: ["inhr", "in/hr", "in/h"],
  lbgal: ["lbgal", "lb/gal", "ppg"],
  ft3lb: ["ft3lb", "ft^3/lb", "ft3/lb", "cu ft/lb"],
  plf: ["plf", "lb/ft"],
  klf: ["klf", "kip/ft"],
  kpa: ["kpa"],
  bar: ["bar"],
  inwc: ["inwc", "in wc", "in. wc", "iwc", "in w.c.", "in. w.c.", "in w.c", "in. w.c"],
  // Absolute pressure is its own family: psia and psig differ by the
  // atmosphere, so neither may silently fill the other.
  psia: ["psia"],
  // temperature -- NOTE the deliberate omission of a bare "C" and "F".
  // "(C)" in this catalog is as often a coefficient (Hazen-Williams C,
  // Manning's C) as it is Celsius, so a bare letter never reads as a
  // temperature. Only the degree-marked spellings do.
  degf: ["°f", "degf", "deg f", "° f"],
  degc: ["°c", "degc", "deg c", "° c"],
  // angle
  deg: ["deg", "degree", "degrees", "°"],
  // dimensionless
  pct: ["%", "percent", "pct"],
  count: ["count", "each", "ea"],
  // money
  usd: ["$", "usd", "dollars"],
  // A utility rate is quoted in cents (2026-11-23): "15 cents per kwh", and a
  // "$0.15" converts into it.
  cents: ["cents", "cent", "¢", "cents per kwh", "cents/kwh", "¢/kwh"],
  // flow
  gpm: ["gpm"],
  gph: ["gph"],
  gpd: ["gpd"],
  cfm: ["cfm"],
  cfs: ["cfs"],
  mgd: ["mgd"],
  lpm: ["lpm", "l/min"],
  // electrical
  v: ["v", "volt", "volts", "vac", "vdc", "voltio", "voltios"],
  a: ["a", "amp", "amps", "ampere", "amperes", "amperio", "amperios"],
  w: ["w", "watt", "watts", "vatio", "vatios"],
  kw: ["kw", "kilowatt", "kilowatts"],
  kwh: ["kwh"],
  kva: ["kva"],
  va: ["va"],
  hp: ["hp", "horsepower"],
  ohm: ["ohm", "ohms"],
  awg: ["awg", "ga", "gauge", "calibre"],
  // heat
  btu: ["btu"],
  btuh: ["btu/hr", "btu/h", "btuh", "btu/hour"],
  ton_ref: ["tons refrigeration", "tons ref"],
  // rate / speed
  mph: ["mph"],
  // Surface feet per minute is a cutting speed in ft/min (2026-11-23).
  fpm: ["fpm", "ft/min", "sfm", "sfpm"],
  fps: ["fps", "ft/s", "ft/sec", "feet per second"],
  rpm: ["rpm"],
  kt: ["kt", "knot", "knots"],
  // time
  s: ["s", "sec", "secs", "second", "seconds"],
  min: ["min", "mins", "minute", "minutes"],
  hr: ["h", "hr", "hrs", "hour", "hours"],
  day: ["day", "days"],
  // Months and weeks since 2026-11-15: a loan "Term (months)" field had no unit, so
  // "360 months" could not fill it and "30 years" could not be converted into it.
  wk: ["wk", "wks", "week", "weeks"],
  mo: ["mo", "mos", "month", "months"],
  yr: ["yr", "yrs", "year", "years"],
  // concentration / level
  ppm: ["ppm"],
  "mg/l": ["mg/l", "mgl"],
  db: ["db", "dba", "dbа"],
  hz: ["hz", "hertz"],
  tpi: ["tpi"],
};

// Flattened lookup, built once. Spellings are compared lowercased and with
// internal whitespace collapsed.
const CANON = new Map();
for (const [canon, spellings] of Object.entries(UNIT_SPELLINGS)) {
  for (const s of spellings) CANON.set(s, canon);
}

function tidy(token) {
  return String(token || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Resolve one token to its canonical unit, or null when it is not a unit we
// recognize. Refusing is the correct answer for anything unlisted.
export function canonicalUnit(token) {
  const t = tidy(token);
  if (!t) return null;
  return CANON.get(t) || null;
}

// The trailing parenthetical of a label, or null. Only a parenthesis that
// closes the label counts -- "Rise (in) per foot" has a parenthetical but it
// is not a unit suffix, and reading it as one would be a guess.
function trailingParen(label) {
  const m = String(label || "").match(/\(([^()]*)\)\s*$/);
  return m ? m[1] : null;
}

// The unit a label declares, canonicalized, or null.
// A label that IS a unit word, with no parenthesis ("CFM", "AWG", "RPM").
// An allowlist, because a bare letter or symbol label is usually a variable:
// "G" is a gust factor, "Km" a Michaelis constant, "a" a coefficient, and
// "Tons" on cfm-per-ton are refrigeration tons, not 2,000 lb (2026-11-16).
const WHOLE_LABEL_UNITS = new Set(["awg", "hp", "horsepower", "cfm", "gpm", "rpm", "mph", "hours", "years", "count"]);

export function unitFromLabel(label) {
  const inner = trailingParen(label);
  if (inner === null) {
    const whole = tidy(label);
    return WHOLE_LABEL_UNITS.has(whole) ? canonicalUnit(whole) : null;
  }
  // Keep the first delimited segment: "ft, optional" -> "ft", and "in: cutter
  // for mill/drill" -> "in" (2026-11-23: the colon hid a machining diameter's
  // unit, and "2 inch diameter" became a 2 in chip load).
  const head = inner.split(/[,;:]/)[0];
  // "MPH (for RPM solve)": a parenthetical that is a note, not a unit, leaves
  // the lead word to say it (2026-11-23).
  const unit = canonicalUnit(head);
  if (unit) return unit;
  // "(F)" on a temperature label is degrees F. A bare letter is refused
  // elsewhere because "C" is as often Hazen-Williams C as Celsius; a label
  // about a temperature settles it (2026-11-23: 22 temperature fields had
  // no unit, so "95 f" could not fill them).
  const tidyHead = tidy(head);
  if ((tidyHead === "f" || tidyHead === "c") && /\b(temp|temperature|bulb|dew|ambient|superheat|subcool|rise|outdoor|indoor|supply|return|setpoint|design|coil|water|air)\b/i.test(labelLead(label))) {
    return tidyHead === "f" ? "degf" : "degc";
  }
  // "(in o.c.)", "(V on a 120 V base)": a unit word leading a note.
  const first = tidyHead.split(/\s+/);
  if (first.length > 1 && canonicalUnit(first[0]) && first[0].length > 1) return canonicalUnit(first[0]);
  const lead = tidy(labelLead(label));
  return WHOLE_LABEL_UNITS.has(lead) ? canonicalUnit(lead) : null;
}

// The label with its trailing parenthetical removed -- the human text the
// matcher derives search terms from. "Length one-way (ft)" -> "Length
// one-way". A label that is nothing BUT a parenthetical keeps its original
// text, since stripping it would leave no terms at all.
export function labelLead(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  const stripped = s.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return stripped || s;
}

// ---------------------------------------------------------------------------
// spec-v1340: unit families and conversion.
//
// A number in a query can fill a field only when the two agree on what kind of
// quantity they are. `150 ft` may fill an `(in)` field; it may never fill a
// `(gpm)` one. Everything below exists to make that judgement, and to make it
// conservatively.
//
// TWO PAIRS ARE DELIBERATELY KEPT IN SEPARATE FAMILIES even though they are
// dimensionally identical, because converting them would be arithmetically
// right and semantically wrong:
//
//   air flow (cfm, cfs) vs liquid flow (gpm, gph, mgd)
//       Both are volume per time. "400 cfm" filling a "(gpm)" field would be a
//       duct airflow answering a pump question. Refuse.
//
//   real power (w, kw, hp) vs apparent power (va, kva)
//       Both are volt-amperes. They differ by power factor, which is the whole
//       point of half the electrical catalog. Refuse.
//
// Factors are "how many base units is one of this unit". Base unit is the
// first listed in each family.
const UNIT_FAMILIES = {
  length: { in: 1, ft: 12, yd: 36, mi: 63360, mm: 0.0393700787, cm: 0.393700787, m: 39.3700787, km: 39370.0787 },
  area: { in2: 1, ft2: 144, yd2: 1296, m2: 1550.0031, acre: 6272640 },
  volume: { in3: 1, ft3: 1728, yd3: 46656, cy: 46656, gal: 231, l: 61.0237441, ml: 0.0610237441, floz: 1.8046875 },
  mass: { lb: 1, kg: 2.20462262, g: 0.00220462262, oz: 0.0625, ton: 2000, kip: 1000 },
  pressure: { psi: 1, psig: 1, psf: 0.00694444444, ksi: 1000, kpa: 0.145037738, bar: 14.5037738, inwc: 0.0361272893 },
  moment: { "lb-ft": 1, "kip-ft": 1000 },
  angle: { deg: 1 },
  ratio: { pct: 1 },
  money: { usd: 1, cents: 0.01 },
  liquidflow: { gpm: 1, gph: 0.0166666667, gpd: 0.000694444444, mgd: 694.444444, lpm: 0.264172052 },
  airflow: { cfm: 1, cfs: 60 },
  voltage: { v: 1 },
  current: { a: 1 },
  power: { w: 1, kw: 1000, hp: 745.699872 },
  apparentpower: { va: 1, kva: 1000 },
  energy: { kwh: 1 },
  resistance: { ohm: 1 },
  wiresize: { awg: 1 },
  heat: { btu: 1 },
  heatrate: { btuh: 1 },
  speed: { mph: 1, fpm: 0.0113636364, fps: 0.681818182, kt: 1.15077945 },
  rotation: { rpm: 1 },
  time: { s: 1, min: 60, hr: 3600, day: 86400, wk: 604800, mo: 2629800, yr: 31557600 },
  density: { pcf: 1 },
  massflow: { lbhr: 1 },
  specificenergy: { btulb: 1 },
  intensity: { inhr: 1 },
  liquiddensity: { lbgal: 1 },
  specificvolume: { ft3lb: 1 },
  lineload: { plf: 1, klf: 1000 },
  abspressure: { psia: 1 },
  frequency: { hz: 1 },
  threadpitch: { tpi: 1 },
  concentration: { ppm: 1, "mg/l": 1 },
  sound: { db: 1 },
  count: { count: 1 },
  // Temperature is affine, not linear, so it carries no factor table and is
  // converted by the special case in convertUnit() below.
  temperature: { degf: null, degc: null },
};

const FAMILY_OF = new Map();
for (const [family, units] of Object.entries(UNIT_FAMILIES)) {
  for (const u of Object.keys(units)) FAMILY_OF.set(u, family);
}

// The family a canonical unit belongs to, or null.
export function unitFamily(unit) {
  return FAMILY_OF.get(String(unit)) || null;
}

// Can a value in `from` legitimately fill a field measured in `to`?
export function unitsCompatible(from, to) {
  if (!from || !to) return false;
  const a = unitFamily(from);
  return Boolean(a) && a === unitFamily(to);
}

// Convert a number between two canonical units of the same family. Returns
// null when the units are not compatible -- never a guess, and never a
// silently unconverted number, which would be the more dangerous failure.
export function convertUnit(value, from, to) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (!unitsCompatible(from, to)) return null;
  if (from === to) return n;
  if (unitFamily(from) === "temperature") {
    if (from === "degf" && to === "degc") return (n - 32) * 5 / 9;
    if (from === "degc" && to === "degf") return n * 9 / 5 + 32;
    return null;
  }
  const table = UNIT_FAMILIES[unitFamily(from)];
  const f = table[from], t = table[to];
  if (!Number.isFinite(f) || !Number.isFinite(t) || t === 0) return null;
  return (n * f) / t;
}
