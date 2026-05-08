// v8 §D.3 - Standard-size rounding helper.
//
// roundToStandard(value, standardSizes) returns both the calculated value
// and the recommended next standard size from a sorted ascending array.
// Returns the largest size when value exceeds the table.

export function roundToStandard(value, standardSizes) {
  if (!Number.isFinite(Number(value))) return { error: "value must be a finite number." };
  if (!Array.isArray(standardSizes) || standardSizes.length === 0) return { error: "standardSizes must be a non-empty array." };
  const v = Number(value);
  // Validate ascending sort.
  for (let i = 1; i < standardSizes.length; i++) {
    if (standardSizes[i] < standardSizes[i - 1]) return { error: "standardSizes must be sorted ascending." };
  }
  if (v <= standardSizes[0]) return { value: v, recommended: standardSizes[0], at_floor: true };
  const next = standardSizes.find((s) => s >= v);
  if (next !== undefined) {
    return { value: v, recommended: next, at_floor: false, at_cap: false };
  }
  // Above the largest size.
  return { value: v, recommended: standardSizes[standardSizes.length - 1], at_floor: false, at_cap: true };
}

// Common ladders ready for import.
export const STANDARD_SIZES = {
  transformer_kVA: [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000],
  breaker_amps:    [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000],
  pump_HP:         [0.25, 0.333, 0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100],
  water_heater_gal: [40, 50, 75, 80, 100],
  service_amps:    [100, 125, 150, 175, 200, 225, 300, 400],
};
