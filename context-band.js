// v8 §D.2 - Context band helper.
//
// formatContextBand(value, low, high, unit) renders "low / normal / high"
// beside a numeric output with a typical range. Returns a structured
// object the renderer can format any way it likes (text + classification
// for accessibility / screen-reader announcements).

export function formatContextBand(value, low, high, unit = "") {
  const v = Number(value);
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(v) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { error: "value, low, and high must all be finite numbers." };
  }
  if (lo >= hi) return { error: "low must be < high." };
  let band;
  if (v < lo) band = "low";
  else if (v > hi) band = "high";
  else band = "normal";
  const display_value = isFloat(v) ? v.toFixed(2) : String(v);
  const display_unit = unit ? " " + unit : "";
  return {
    band,
    is_low: band === "low",
    is_normal: band === "normal",
    is_high: band === "high",
    value: v, low: lo, high: hi, unit,
    text: display_value + display_unit + " (" + band + "; typical " + lo + "-" + hi + display_unit + ")",
  };
}

function isFloat(n) {
  return Number.isFinite(n) && Math.floor(n) !== n;
}
