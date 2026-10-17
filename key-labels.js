// Reading a result key back as a label.
//
// A calculator's compute returns keys like `tank_volume_gal`; a page needs
// "Tank volume (gal)". Most tiles caption their own answers -- through the
// renderer schema, or through the curated label layers -- and where none of
// those has anything, this is the fallback.
//
// It lived inside scripts/build-shells.mjs, so the STATIC PAGE had the fallback
// and the AGENT DOOR did not: `describe_calculator` returned an empty `outputs`
// list for 36 tiles whose shells were printing "Egc AWG", "Zone", "Easting",
// "Area (ft²)" the whole time. `check-both-doors` even counted the gap --
// "1,768 name their answers" -- while both doors are supposed to answer alike.
// So the rule moved here, where both can reach it.
//
// The tables are deliberately conservative: one bad label is worse than a plain
// one, and each omission below is a checked decision rather than an oversight.

// Unit tokens a field name may END with, used to read a key like
// `tank_volume_gal` back as "Tank volume (gal)" when the calculator itself
// never captioned it. Case matters where the catalog uses case to
// disambiguate: `_A` is amps, `_F` is degrees.
const KEY_UNITS = new Map(Object.entries({
  gal: "gal", gpm: "GPM", gph: "GPH", gpd: "GPD", cfm: "CFM", cfs: "cfs", cfh: "CFH", mgd: "MGD", scfm: "SCFM",
  ft: "ft", in: "in", mm: "mm", cm: "cm", mi: "mi", yd: "yd", cy: "cy", km: "km",
  psi: "psi", psig: "psig", psid: "psid", psf: "psf", ksi: "ksi", ksf: "ksf", pcf: "pcf", plf: "plf", klf: "klf",
  lb: "lb", lbs: "lb", kip: "kip", kips: "kip", ton: "ton", tons: "ton", kg: "kg",
  hp: "hp", kw: "kW", kwh: "kWh", kva: "kVA", btuh: "Btu/h", btu: "Btu", mbh: "MBH",
  amps: "A", volts: "V", ohms: "ohms", hz: "Hz",
  deg: "deg", pct: "%", percent: "%",
  hr: "hr", hrs: "hr", yr: "yr", years: "yr", months: "months", days: "days",
  ft2: "ft\u00b2", ft3: "ft\u00b3", sqin: "sq in", sqft: "ft\u00b2", in2: "in\u00b2", in3: "in\u00b3", in4: "in\u2074",
  fpm: "fpm", fps: "fps", mph: "mph", rpm: "RPM", kt: "kt", sabins: "sabins",
  kipft: "kip-ft", ftlb: "ft-lb", inlb: "in-lb", ftkip: "ft-kip", sy: "SY", therms: "therms", acres: "acres",
  // Unambiguous multi-letter units the table was missing, so their keys read
  // back with the unit glued on as a lowercase word and the answer beside it
  // looking unitless: "Pag db = 14", "Resistance ohm = 241458", "Run time sec
  // = 300". `ohms` was already here; the singular was not.
  //
  // Deliberately NOT added: the single letters a / f / v / w / m / l. The
  // catalog uses CASE to disambiguate those (`_A` is amps, `_F` is degrees,
  // both in KEY_UNITS_CASED), and the lower-case tails are not units often
  // enough to matter -- checked, not assumed: `cramers_v` is Cramer's V, an
  // effect size, not volts, and `aspect_w` is a WIDTH, not watts. One bad
  // label is worse than a plain one. Also not `min` -- it means "minimum" far
  // more often than "minutes" (`conductor_min_A`) -- nor `acre`, which reads
  // correctly already in `seeds_per_acre`.
  //
  // And emphatically NOT `db`. It is decibels in the acoustics and RF tiles,
  // but DRY-BULB in the HVAC ones (`leaving_db_F`, `return_db_F`) and BEAM
  // DEPTH in the structural ones (`beam_depth_db_in`). Mapping it turned
  // "Leaving db (°F)" into "Leaving (dB/°F)" and a beam depth into decibels
  // per inch. Same shape as the `(C)`-is-not-always-Celsius trap: a token
  // that is a unit in one trade and a word in another needs a per-tile
  // caption, not a catalog-wide rule.
  ohm: "ohm", lbf: "lbf", psia: "psia", kvar: "kVAR", lux: "lux", sec: "sec", oz: "oz", lf: "LF",
  // Metric and cubic-yard areas and volumes, which read "Spoil volume yd3"
  // and "Area m2" on the steps panel. `ug` and `cal` only ever appear as
  // the top of a quotient ("Pel (µg/m³)", "Incident energy (cal/cm²)").
  yd3: "yd\u00b3", m2: "m\u00b2", m3: "m\u00b3", cm2: "cm\u00b2", cm3: "cm\u00b3", mm2: "mm\u00b2", ug: "\u00b5g", cal: "cal",
}));
// Before one of those areas or volumes, a count or a mass is the top of a
// density, not part of the name: "Cement (bags/yd³)", "Indoor (spores/m³)",
// "Coating (g/m²)". These words are units nowhere else, so they are only
// read here.
const AREA_VOLUME = new Set(["yd3", "m2", "m3", "cm2", "cm3", "mm2"]);
const DENSITY_TOPS = new Map(Object.entries({ g: "g", mg: "mg", umol: "\u00b5mol", bags: "bags", spores: "spores" }));
// And where the top is ambiguous, the key keeps printing itself: `mj` is
// mJ in a UV dose and MJ in reference ET, `mw` likewise, and `m1_m2` is the
// AISC end-moment ratio M1/M2, not an area.
const AREA_VOLUME_DECLINE = new Set(["mj", "mw", "m1"]);
const KEY_UNITS_CASED = new Map(Object.entries({ A: "A", V: "V", F: "\u00b0F", C: "\u00b0C", W: "W", nT: "nT" }));
// A denominator ("lb_hr" = lb/hr) is only ever the LAST token of a key.
const KEY_PER_UNITS = new Map(Object.entries({ min: "min", day: "day", s: "s", hr: "hr", sf: "ft\u00b2", yr: "yr" }));
const KEY_ACRONYMS = new Set([
  // Added 2026-09-01: each of these was rendering title-cased somewhere a
  // reader could see it, or would have on the first tile that labelled it.
  // Only unambiguous all-caps trade acronyms; mixed-case symbols (GCpi, Mmax,
  // Vmax, kvar) and ambiguous four-letter keys (cplh, splh, rctf) are left
  // alone deliberately, since upper-casing those would be a different error.
  "afci", "gfci", "acfm", "scfm", "afue", "bsfc", "dscr", "hspf", "piti", "shgc",
  "awg", "nec", "ada", "ocpd", "fla", "mca", "mocp", "rh", "cg", "tds", "bod", "tss",
  "srt", "hrt", "vslr", "sor", "wor", "apf", "uv", "led", "hvac", "pdp", "gpp", "wsfu", "dfu", "ach", "shr",
  "eer", "cop", "stc", "emt", "pvc", "rmc", "imc", "cmu", "srw", "spt", "cbr", "usc", "aashto", "asd", "lrfd",
  "asce", "aisc", "aci", "nds", "du",
  // Added 2026-10-17 from the steps-panel captions ("Rated wll (lb)", "Pel
  // (µg/m³)"); each is a whole underscore token in every key that has it.
  "wll", "udl", "pel", "twa", "lel", "ppfd", "hdd", "cfm"]);

// Read a machine field name back as English. This claims nothing the key does
// not already say -- it only spaces the words out and spells the unit -- so it
// is safe where a real caption is missing. Returns null when the key is too
// short or too cryptic to gain anything ("va", "ecc"), and those rows keep
// printing the key itself rather than a worse guess.
export function humanizeKey(key) {
  const parts = String(key).split("_").filter(Boolean);
  // An acronym is an acronym whether or not it has company. The one-word path
  // below title-cases, so `afci` came out "Afci" and `scfm` came out "Scfm" on
  // the two pages that print them as labels -- and `vslr` and `wsfu` did the
  // same despite already being on the list, because this early return never
  // consulted it. Check it first, for one word and for many.
  if (parts.length === 1 && KEY_ACRONYMS.has(parts[0].toLowerCase())) return parts[0].toUpperCase();
  // A one-word key is already English ("ratio", "efficiency"); it only needs
  // to be capitalized so it reads as a caption beside the others. Anything
  // shorter is a symbol ("df", "ka") and says more as itself.
  if (parts.length === 1) return /^[a-z]{4,}$/.test(parts[0]) ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : null;
  if (parts.length < 2) return null;
  const units = [];
  while (parts.length > 1) {
    const raw = parts[parts.length - 1];
    const first = units.length === 0;
    let u = first ? KEY_UNITS_CASED.get(raw) : undefined;
    if (u === undefined && !/^[A-Z]$/.test(raw)) u = KEY_UNITS.get(raw.toLowerCase());
    // A per-unit denominator reached anywhere but the end is an ordinary word:
    // `conductor_min_A` is a minimum in amps, `theta_s_deg` is the variable.
    if (u === undefined && first) u = KEY_PER_UNITS.get(raw.toLowerCase());
    if (u !== undefined && AREA_VOLUME.has(raw.toLowerCase()) && AREA_VOLUME_DECLINE.has(String(parts[parts.length - 2]).toLowerCase())) break;
    if (u === undefined) break;
    units.unshift(u);
    parts.pop();
    const top = parts.length > 1 && AREA_VOLUME.has(raw.toLowerCase()) ? DENSITY_TOPS.get(parts[parts.length - 1].toLowerCase()) : undefined;
    if (top) { units.unshift(top); parts.pop(); break; }
  }
  // "Rimpull per ton, in lb": the name already spent the word `per`, so the
  // token before it belongs to the name and not to a quotient.
  if (units.length > 1 && parts[parts.length - 1] === "per") { parts.push(units.shift()); }
  // `pitch_in_per_ft` spelled its own quotient. Read past the `per` with the
  // same unit tables: "Pitch (in/ft)", not "Pitch in per (ft)" -- 216 worked
  // values in the steps panel read that way. A name with no unit before the
  // `per` keeps the word: "Cost per lb"; a key that is only units reads
  // "CFM per ton". Two units before the `per` are a product ("Moment
  // (lb-in/ft)"), and "cu ft" / "sq ft" are one unit.
  let perUnit = null, perWord = null;
  if (units.length === 1 && parts.length > 1 && parts[parts.length - 1] === "per") {
    const rest = parts.slice(0, -1), num = [];
    while (rest.length) {
      const raw = rest[rest.length - 1];
      const u = KEY_UNITS.get(raw.toLowerCase());
      if (u === undefined) break;
      num.unshift(u);
      rest.pop();
    }
    const cu = rest.length && num[0] === "ft" ? { cu: "ft³", sq: "ft²" }[rest[rest.length - 1].toLowerCase()] : undefined;
    if (cu) { num[0] = cu; rest.pop(); }
    if (!num.length || rest[rest.length - 1] === "per") {
      perWord = units[0];
      parts.pop();
    } else if (!rest.length) {
      if (cu) return `${cu === "ft\u00b3" ? "Cubic" : "Square"} feet per ${units[0]}`;
      const n = num.length === 1 && num[0].toLowerCase() !== parts[0].toLowerCase() ? parts[0] : num.join("-");
      return `${n === n.toLowerCase() ? n.charAt(0).toUpperCase() + n.slice(1) : n} per ${units[0]}`;
    } else {
      perUnit = `${num.join("-")}/${units[0]}`;
      parts.length = rest.length;
    }
    units.length = 0;
  }
  if (!parts.length) return null;
  let unit = perUnit || units.filter((u, i) => i === 0 || u !== units[i - 1]).join("/");
  // in_lb / ft_lb is a torque, not a quotient.
  if (unit === "in/lb") unit = "in-lb";
  if (unit === "ft/lb") unit = "ft-lb";
  // Same for pound-FORCE: `raise_torque_in_lbf` is inch-pounds of torque, not
  // inches per pound-force, and the slash inverts the meaning.
  if (unit === "in/lbf") unit = "in-lbf";
  if (unit === "ft/lbf") unit = "ft-lbf";
  // And resistivity is a PRODUCT: soil resistivity is ohm-cm (ohm-metres in
  // SI), never ohms per centimetre.
  if (unit === "ohm/cm") unit = "ohm-cm";
  if (unit === "ohm/m") unit = "ohm-m";
  const words = parts.map((p, i) => {
    const l = p.toLowerCase();
    if (KEY_ACRONYMS.has(l)) return l.toUpperCase();
    if (/^[A-Z]/.test(p) && p.length <= 3) return p;
    return i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l;
  });
  const base = words.join(" ");
  // A symbol alone says nothing ("fc"), but a symbol with its unit does:
  // "Fc (psi)" beats "fc_psi", so a spelled unit lowers the bar.
  if (base.length < (unit || perWord ? 1 : 3)) return null;
  if (perWord) return `${base} per ${perWord}`;
  return unit ? `${base} (${unit})` : base;
}
