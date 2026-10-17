// A tile that works out WHICH of several limits governs, and then reports a
// ratio, utilization or margin against a different one, hands the reader a
// confident number measured against the wrong thing. hdd-pullback did it
// (utilization against the pipe's safe pull when the rig governed, 0.09 where
// the governing ratio was 0.16) and railcar-load-limit did it (97% of the
// car's stencil where the route allowed only 92% of that), both found on
// 2026-10-16. Neither is visible to the output-text sweeps: the number is
// well formed and the label reads plausibly. This is the structural check.
//
// The rule: when a compute declares a governing/binding/controlling value and
// also returns a ratio-shaped field, that field must either be computed from
// the governing value or be listed below with the reason it measures something
// else (a comparison BETWEEN methods, or a named one of several checks).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Reviewed and deliberately measuring something other than the governing
// limit. Each entry says what the field actually is.
const REVIEWED = new Map([
  ["computeCoatingVocCompliance::basis_ratio", "VOC less water against VOC as supplied -- a basis conversion between two ways of stating the same coating, not a load against a limit"],
  ["computeConcreteAnchorShearBreakout::area_ratio", "ACI 318 17.7.2 AVc/AVco projected-area term capped at 1.0; governing_form names which coefficient formula applies, a different quantity"],
  ["computeWoodTensionBending::compression_side_ratio", "one of the two NDS 3.9.1 interaction terms -- `governing` is the max OF it, so the dependency runs the other way"],
  ["computeGuyAnchorHoldingCapacity::method_ratio", "a comparison BETWEEN the two capacity methods -- the disagreement is the finding; margin_lb uses the governing value"],
  ["computeBallnoseFeedCusp::ratio", "the feed cusp against the stepover cusp, the two candidates themselves; governing_cusp_in is the max of them"],
  ["computeGearReducerServiceFactor::governing_margin", "max_transmitted_hp / transmitted_hp, where max_transmitted_hp IS the governing limit (picked by thermal_governs) under a name the source pattern does not match"],
  ["computeGearReducerServiceFactor::mechanical_margin", "the named mechanical check; governing_margin is returned beside it for the governing one"],
  ["computeHddPullback::utilization", "the lumped-bend pull against the pipe alone; governing_utilization is returned beside it"],
  ["computeHddPullback::capstan_utilization", "the capstan pull against the pipe alone; governing_utilization is returned beside it"],
  ["computeRailcarLoadLimit::utilization_pct", "the car's own stencil; governing_utilization_pct is returned beside it"],
  ["computeSubSlabSuctionField::coverage_ratio", "slab area per suction point, not a load against a limit"],
  ["computeMainFlushingVolume::duration_min", "the duration at the REQUIRED flow; actual_duration_min uses the governing flow"],
  ["computeBlastStemmingLength::achieved_ratio", "stemming as a multiple of burden, the rule-of-thumb shape; meets_governing does the check"],
  ["computeUsrCribCapacity::load_ratio", "a load against the crib capacity; governing_limit names which HEIGHT limit governs, a different quantity"],
  ["computePalletLoadout::pallet_cube_utilization_pct", "cube fill of one pallet; binding_margin_pallets is a trailer-level count"],
  ["computePalletLoadout::slack_utilization_pct", "pallet count against the weight or floor cap, the candidates themselves"],
]);

// Sources are values NAMED governing/binding/controlling. Seeding from
// `*_governs` booleans was tried on 2026-10-16 and pulled in ten functions whose
// ratios are separate named checks (deflection beside bending, a lever arm), so
// a value picked by such a switch is exempted by name below instead.
const GOV_DECL = /const\s+(\w*(?:governing|binding|controlling)\w*)\s*=/gi;
const RATIO = /\b(\w*(?:utilization|ratio|margin|pct_of|percent_of|headroom|dcr|demand_capacity)\w*)\s*=\s*([^;]+);/g;

test("a ratio reported beside a governing limit is measured against that limit", () => {
  const files = readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f));
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const fnRe = /export function (compute\w+)\s*\(([\s\S]*?)\n}\n/g;
    let m;
    while ((m = fnRe.exec(src))) {
      const body = m[0];
      const fn = m[1];
      // The SOURCES are the governing limits and values themselves. A name like
      // governing_utilization_pct is a ratio OUTPUT that happens to carry the
      // word: it is exactly the field most likely to be measured against the
      // wrong limit, so it must be checked, never trusted as a source. (Seeding
      // railcar-load-limit's governing ratio onto the car's limit passed until
      // this line excluded it.)
      const RATIO_SHAPED = /utilization|ratio|margin|pct|percent|headroom|dcr|demand_capacity/i;
      const govNames = [...body.matchAll(GOV_DECL)].map((x) => x[1]).filter((n) => !RATIO_SHAPED.test(n));
      if (!govNames.length) continue;
      // A ratio may reach the governing value indirectly: guard-post-load
      // derives the required stress from the governing load and then divides
      // by the allowable. Propagate the taint forward through the body's own
      // assignments so only ratios that never touch the governing value flag.
      const tainted = new Set(govNames);
      const assigns = [...body.matchAll(/const\s+(\w+)\s*=\s*([^;]+);/g)].map((a) => [a[1], a[2]]);
      for (let pass = 0; pass < assigns.length; pass++) {
        let grew = false;
        for (const [lhs, rhs] of assigns) {
          if (tainted.has(lhs)) continue;
          if ([...tainted].some((t) => new RegExp("\\b" + t + "\\b").test(rhs))) { tainted.add(lhs); grew = true; }
        }
        if (!grew) break;
      }
      const retIdx = body.lastIndexOf("return {");
      const ret = retIdx >= 0 ? body.slice(retIdx) : "";
      RATIO.lastIndex = 0;
      let r;
      while ((r = RATIO.exec(body))) {
        const [, name, rhs] = r;
        if ([...tainted].some((t) => new RegExp("\\b" + t + "\\b").test(rhs))) continue;
        if (!rhs.includes("/")) continue;
        if (!new RegExp("\\b" + name + "\\b").test(ret)) continue;
        const key = `${fn}::${name}`;
        if (REVIEWED.has(key)) continue;
        offenders.push(`${f} ${key} = ${rhs.trim().slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "ratio reported beside a governing limit but not measured against it -- fix it, or add it to REVIEWED with the reason");
});

test("every REVIEWED entry still names a live compute and field", () => {
  const src = readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))
    .map((f) => readFileSync(resolve(ROOT, f), "utf8")).join("\n");
  const stale = [...REVIEWED.keys()].filter((k) => {
    const [fn, field] = k.split("::");
    return !new RegExp("function " + fn + "\\b").test(src) || !new RegExp("\\b" + field + "\\b").test(src);
  });
  assert.deepEqual(stale, [], "REVIEWED names a compute or field that no longer exists -- the list may only shrink with the code");
});
