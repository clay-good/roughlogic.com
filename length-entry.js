// spec-v1970: feet, inches and fractions typed into a length box.
//
// A carpenter reads a tape as 8'6" or 3-1/2, not as 8.5 or 3.5. A box whose
// label ends in (ft) or (in) takes what the tape says and hands every reader
// of input.value -- the renderers, the hash state, the steps panel -- the
// decimal, exactly as a number field would. Text that does not parse reads
// as "", which is what a number field returns for junk. No DOM in the parser.

const NUM = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
// The inches part of a measurement: 6, 6.5, 1/2, 6 1/2 or 6-1/2.
const INCH = "(\\d+\\s*[\\s-]\\s*\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?|\\.\\d+)";
const FT_WORD = "(?:'|ft\\.?|foot|feet)";
const IN_WORD = "(?:\"|''|in\\.?|inch|inches)";

// "6", "1/2", "6 1/2", "6-1/2" -> a number; NaN for a zero denominator.
function inchValue(s) {
  const t = s.trim();
  let m = t.match(/^(\d+)\s*[\s-]\s*(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[3]) === 0 ? NaN : Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]);
  return Number(t);
}

const RULES = [
  // 8'6"  8' 6"  8'-6"  8'6  8' 6-1/2"  -- one measurement by construction.
  [new RegExp("^" + NUM + "\\s*'\\s*-?\\s*" + INCH + "\\s*(?:" + IN_WORD + ")?$"), (ft, inch) => [Number(ft), inchValue(inch)]],
  // 8 ft 6 in, 8 feet 6 inches, 8ft 6.
  [new RegExp("^" + NUM + "\\s*(?:ft\\.?|foot|feet)\\s*-?\\s*" + INCH + "\\s*(?:" + IN_WORD + ")?$"), (ft, inch) => [Number(ft), inchValue(inch)]],
  // 8', 8 ft, and fractional feet: 1-1/2', 2 1/2 ft, 1/2 ft
  [new RegExp("^" + INCH + "\\s*" + FT_WORD + "$"), (ft) => [inchValue(ft), 0]],
  // 6", 6 in, 3-1/2", 5/8 in
  [new RegExp("^" + INCH + "\\s*" + IN_WORD + "$"), (inch) => [0, inchValue(inch)]],
];

// The decimal a length box should read, in the box's unit ("ft" or "in").
// Returns { value } (null for an empty box) or { error }.
export function parseLength(text, unit) {
  // Phones type curly quotes and primes; read them as the tape marks.
  const t = String(text ?? "").trim().toLowerCase().replace(/[\u2032\u2018\u2019]/g, "'").replace(/[\u2033\u201c\u201d]/g, '"');
  if (t === "") return { value: null };
  if (/^[+-]?(\d+(?:\.\d+)?|\.\d+)(e[+-]?\d+)?$/.test(t)) return { value: Number(t) };
  // A bare mixed number or fraction is in the box's own unit: 3-1/2, 3 1/2, 5/8.
  let m = t.match(/^(\d+\s*[\s-]\s*\d+\s*\/\s*\d+|\d+\s*\/\s*\d+)$/);
  if (m) {
    const v = inchValue(m[1]);
    return Number.isFinite(v) ? { value: v } : { error: "A fraction cannot divide by zero." };
  }
  // In a feet box, 8-6 is 8 ft 6 in (the inches under 12).
  m = t.match(/^(\d+)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (m && unit === "ft") return Number(m[2]) < 12 ? { value: Number(m[1]) + Number(m[2]) / 12 } : { error: "The inches in a feet-and-inches measurement are under 12." };
  for (const [re, fn] of RULES) {
    const r = t.match(re);
    if (!r) continue;
    const [ft, inch] = fn(r[1], r[2]);
    if (!Number.isFinite(ft) || !Number.isFinite(inch)) return { error: "A fraction cannot divide by zero." };
    if (ft > 0 && inch >= 12) return { error: "The inches in a feet-and-inches measurement are under 12." };
    const inches = ft * 12 + inch;
    return { value: unit === "ft" ? inches / 12 : inches };
  }
  return { error: "Enter a number, 8'6\", 8 ft 6 in, or 3-1/2." };
}

// Round for the hint line without showing float noise: 8.5, 0.625, 102.
export function lengthHint(value, unit) {
  return "= " + String(Number(value.toFixed(4))) + " " + unit;
}

// The unit a length label declares, or null. Only a closing (ft) or (in) counts.
export function lengthUnitOf(label) {
  const m = String(label || "").match(/\((ft|feet|in|inch|inches)\)\s*$/i);
  return m ? (/^f/i.test(m[1]) ? "ft" : "in") : null;
}

// Turn a number box into a length box. The visible text stays what was typed;
// input.value reads the parsed decimal (or "" when it does not parse), so no
// renderer changes. min/max are checked on the decimal and reported through
// setCustomValidity, which ui-validity.js already renders beside the box.
export function makeLengthEntry(input, wrap, unit) {
  let proto = Object.getPrototypeOf(input), desc = null;
  while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, "value"))) proto = Object.getPrototypeOf(proto);
  if (!desc || !desc.get || !desc.set) return;
  input.type = "text";
  input.inputMode = "decimal";
  input.dataset.lengthUnit = unit;
  const raw = () => desc.get.call(input);
  Object.defineProperty(input, "value", {
    configurable: true,
    // Rounded to 10 places so 8'7" travels as 8.5833333333, not float noise.
    get() { const r = parseLength(raw(), unit); return r.error || r.value === null ? "" : String(Number(r.value.toFixed(10))); },
    set(v) { desc.set.call(input, v); refresh(); },
  });
  const hint = typeof document !== "undefined" && document.createElement ? document.createElement("span") : null;
  if (hint && wrap) {
    hint.className = "length-hint";
    hint.id = input.id + "-hint";
    hint.setAttribute("aria-live", "polite");
    input.setAttribute("aria-describedby", hint.id);
    wrap.appendChild(hint);
  }
  function refresh() {
    const text = raw(), r = parseLength(text, unit);
    const lo = input.getAttribute("min"), hi = input.getAttribute("max");
    let msg = r.error || "";
    if (!msg && r.value !== null && lo !== null && lo !== "" && r.value < Number(lo)) msg = "Enter " + lo + " or more.";
    if (!msg && r.value !== null && hi !== null && hi !== "" && r.value > Number(hi)) msg = "Enter " + hi + " or less.";
    if (typeof input.setCustomValidity === "function") input.setCustomValidity(msg);
    if (hint) hint.textContent = !msg && r.value !== null && !/^[+-]?(\d+(?:\.\d+)?|\.\d+)$/.test(text.trim()) ? lengthHint(r.value, unit) : "";
  }
  input.addEventListener("input", refresh);
  refresh();
}
