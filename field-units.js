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
  in: ["in", "inch", "inches", '"'],
  ft: ["ft", "foot", "feet", "'"],
  yd: ["yd", "yard", "yards"],
  mi: ["mi", "mile", "miles"],
  mm: ["mm", "millimeter", "millimeters"],
  cm: ["cm", "centimeter", "centimeters"],
  m: ["m", "meter", "meters", "metre", "metres"],
  // area
  in2: ["in²", "in2", "sq in", "sqin", "square inches", "square inch"],
  ft2: ["ft²", "ft2", "sq ft", "sqft", "square feet", "square foot"],
  yd2: ["yd²", "yd2", "sq yd", "sqyd", "square yards"],
  m2: ["m²", "m2", "sq m", "square meters"],
  // second moment of area -- rare but real (in⁴ x9)
  in4: ["in⁴", "in4"],
  // volume
  in3: ["in³", "in3", "cu in", "cubic inches"],
  ft3: ["ft³", "ft3", "cu ft", "cuft", "cubic feet", "cubic foot"],
  yd3: ["yd³", "yd3", "cu yd", "cubic yards"],
  cy: ["cy", "cubic yard", "cubic yards"],
  gal: ["gal", "gallon", "gallons"],
  l: ["l", "liter", "liters", "litre", "litres"],
  ml: ["ml", "milliliter", "milliliters"],
  // mass / force
  lb: ["lb", "lbs", "pound", "pounds"],
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
  pcf: ["pcf"],
  kpa: ["kpa"],
  bar: ["bar"],
  inwc: ["inwc", "in wc", "in. wc", "iwc", "in w.c."],
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
  // flow
  gpm: ["gpm"],
  gph: ["gph"],
  gpd: ["gpd"],
  cfm: ["cfm"],
  cfs: ["cfs"],
  mgd: ["mgd"],
  lpm: ["lpm", "l/min"],
  // electrical
  v: ["v", "volt", "volts", "vac", "vdc"],
  a: ["a", "amp", "amps", "ampere", "amperes"],
  w: ["w", "watt", "watts"],
  kw: ["kw", "kilowatt", "kilowatts"],
  kwh: ["kwh"],
  kva: ["kva"],
  va: ["va"],
  hp: ["hp", "horsepower"],
  ohm: ["ohm", "ohms"],
  awg: ["awg", "ga", "gauge"],
  // heat
  btu: ["btu"],
  btuh: ["btu/hr", "btu/h", "btuh", "btu/hour"],
  ton_ref: ["tons refrigeration", "tons ref"],
  // rate / speed
  mph: ["mph"],
  fpm: ["fpm", "ft/min"],
  rpm: ["rpm"],
  kt: ["kt", "knot", "knots"],
  // time
  s: ["s", "sec", "secs", "second", "seconds"],
  min: ["min", "mins", "minute", "minutes"],
  hr: ["hr", "hrs", "hour", "hours"],
  day: ["day", "days"],
  yr: ["yr", "yrs", "year", "years"],
  // concentration / level
  ppm: ["ppm"],
  "mg/l": ["mg/l", "mgl"],
  db: ["db", "dba", "dbа"],
};

// Flattened lookup, built once. Spellings are compared lowercased and with
// internal whitespace collapsed.
const CANON = new Map();
for (const [canon, spellings] of Object.entries(UNIT_SPELLINGS)) {
  for (const s of spellings) CANON.set(s, canon);
}

function tidy(token) {
  return String(token || "").toLowerCase().replace(/\s+/g, " ").trim();
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
export function unitFromLabel(label) {
  const inner = trailingParen(label);
  if (inner === null) return null;
  // Keep the first delimited segment: "ft, optional" -> "ft".
  const head = inner.split(/[,;]/)[0];
  return canonicalUnit(head);
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
