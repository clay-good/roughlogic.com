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
  // Metric areas/volumes; `ug`, `cal` only ever top a quotient.
  // Quotient tops: "(bbl/ft)". Not `mg` (milligrams or million gallons).
  bbl: "bbl", kj: "kJ", lcy: "LCY", bcy: "BCY", ccy: "CCY",
  cuft: "ft\u00b3", yd3: "yd\u00b3", m2: "m\u00b2", m3: "m\u00b3", cm2: "cm\u00b2", cm3: "cm\u00b3", mm2: "mm\u00b2", ug: "\u00b5g", cal: "cal",
}));
// Before an area or volume, these top a density: "Cement (bags/yd³)".
const AREA_VOLUME = new Set(["yd3", "m2", "m3", "cm2", "cm3", "mm2", "ft2", "sqft", "in2", "ft3"]);
// `w` is watts only over an area; alone it is a width (`aspect_w`).
const DENSITY_TOPS = new Map(Object.entries({ g: "g", mg: "mg", umol: "\u00b5mol", bags: "bags", spores: "spores", w: "W" }));
// Ambiguous tops keep the key: mJ or MJ, and AISC's M1/M2 ratio.
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
  // 2026-10-17, from steps-panel captions ("Rated wll (lb)").
  "wll", "udl", "pel", "twa", "lel", "ppfd", "hdd", "cfm"]);

// A final `min` after these is a minimum ("Idler hp min"), else minutes.
// Every rule below is held to the `// dims:` annotations by
// shell-key-humanizer.test.js.
const GREEK = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "eps", "theta", "lambda", "mu", "nu", "rho", "sigma", "tau", "phi", "psi", "omega", "eta", "zeta", "xi", "kappa", "chi"]);
// "cut-in", not inches (not `drop`: `threshold_drop_in` is inches).
const IN_WORDS = new Set(["cut", "shut"]);
// A top-only tail ends the read: `cumulative_to_years_bbl` is barrels.
const TOP_ONLY = new Set(["bbl", "kj", "lcy", "bcy", "ccy"]);
const MIN_AFTER_UNITS = new Set(["cfm", "scfm", "acfm", "gpm", "gph", "gpd", "cfh", "mgd", "hp", "kw", "kva", "kvar", "a", "amps", "v", "volts", "w", "psi", "psig", "psia", "psf", "ksi", "f", "c", "ohm", "ohms", "hz", "rpm", "fpm", "fps", "mph", "pct", "percent"]);
const MIN_AFTER_WORDS = new Set(["max", "avg", "sigma", "q", "angle", "straight", "continuous", "closets", "fixture", "ph", "required", "allowed", "allowable"]);

// Read a machine field name back as English. This claims nothing the key does
// not already say -- it only spaces the words out and spells the unit -- so it
// is safe where a real caption is missing. Returns null when the key is too
// short or too cryptic to gain anything ("va", "ecc"), and those rows keep
// printing the key itself rather than a worse guess.
export function humanizeKey(key) {
  const parts = String(key).split("_").filter(Boolean);
  const n = parts.length;
  if (n >= 2 && parts[n - 1] === "min" && (MIN_AFTER_UNITS.has(parts[n - 2].toLowerCase()) || MIN_AFTER_WORDS.has(parts[n - 2].toLowerCase()))) {
    const head = humanizeKey(parts.slice(0, -1).join("_"));
    if (head) return head.replace(/ \(([^)]+)\)$/, " $1") + " min";
    const raw = parts.slice(0, -1).join(" ");
    return (raw === raw.toLowerCase() ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw) + " min";
  }
  // An acronym is an acronym whether or not it has company. The one-word path
  // below title-cases, so `afci` came out "Afci" and `scfm` came out "Scfm" on
  // the two pages that print them as labels -- and `vslr` and `wsfu` did the
  // same despite already being on the list, because this early return never
  // consulted it. Check it first, for one word and for many.
  if (parts.length === 1 && KEY_ACRONYMS.has(parts[0].toLowerCase())) return parts[0].toUpperCase();
  // Paired tails: acre-ft, m/s, g/s, 1/in, cut-in, phase I_C / V_B.
  if (n >= 2) {
    const last = parts[n - 1], prev = parts[n - 2].toLowerCase();
    const headOf = (k) => { const h = k.length ? humanizeKey(k.join("_")) : null; if (h) return h; const r = k.join(" "); return r.charAt(0).toUpperCase() + r.slice(1); };
    if (last.toLowerCase() === "ft" && (prev === "ac" || prev === "acre")) return n === 2 ? "Acre-ft" : `${headOf(parts.slice(0, -2))} (acre-ft)`;
    const perSecond = { m: "m/s", g: "g/s", rad: "rad/s", umol: "\u00b5mol/s" }[prev];
    if (last === "s" && perSecond && n > 2) return `${headOf(parts.slice(0, -2))} (${perSecond})`;
    if (prev === "1" && n > 2 && KEY_UNITS.has(last.toLowerCase())) return `${headOf(parts.slice(0, -2))} (1/${KEY_UNITS.get(last.toLowerCase())})`;
    for (let i = parts.length - 2; i >= 0; i--) if (parts[i + 1].toLowerCase() === "in" && IN_WORDS.has(parts[i].toLowerCase()) && (i === 0 || parts[i - 1].toLowerCase() !== "in")) parts.splice(i, 2, parts[i] + "-in");
    if (/^[ABC]$/.test(last) && /^[IV]$/.test(parts[n - 2])) return n === 2 ? `${parts[0]} ${last}` : `${headOf(parts.slice(0, -2))} ${parts[n - 2]} ${last}`;
  }
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
    if (first && TOP_ONLY.has(raw.toLowerCase())) break;
    const top = parts.length > 1 && AREA_VOLUME.has(raw.toLowerCase()) ? DENSITY_TOPS.get(parts[parts.length - 1].toLowerCase()) : undefined;
    if (top) { units.unshift(top); parts.pop(); break; }
  }
  // `gamma_s` is a subscript; any other `_s` is seconds.
  if (units.length === 1 && units[0] === "s" && GREEK.has(parts[parts.length - 1].toLowerCase())) { parts.push("s"); units.length = 0; }
  // "Rimpull per ton, in lb": the name already spent the word `per`, so the
  // token before it belongs to the name and not to a quotient.
  if (units.length > 1 && parts[parts.length - 1] === "per") { parts.push(units.shift()); }
  // `pitch_in_per_ft` -> "Pitch (in/ft)"; "Cost per lb"; "CFM per ton";
  // "Moment (lb-in/ft)"; "cu ft" is one unit.
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
