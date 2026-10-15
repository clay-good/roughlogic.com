// calc-demo.js against references the specs did not write. The worked-example
// fixture recomputes each spec's own example, so a spec and its tile that share
// an error agree with each other; these tests hold the tiles to volume
// arithmetic done a second way and to the invariants their notes claim.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAbatementWasteContainers } from "../../calc-demo.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- abatement-waste-containers ----

const AWC = { area_ft2: 2000, thickness_in: 1, bulking_factor: 2, bag_volume_ft3: 3, bag_fill_fraction: 0.7, material_density_pcf: 30, container_volume_yd3: 20 };

test("abatement waste: volumes recomputed in cubic inches and cubic yards agree", () => {
  // A second route through the units: area in sq in x thickness in in gives cu in;
  // 1 cu ft = 1,728 cu in and 1 cu yd = 46,656 cu in (36^3), by definition of the
  // foot (12 in) and the yard (36 in).
  for (const c of [AWC, { ...AWC, area_ft2: 640, thickness_in: 2.5, bulking_factor: 1.5 }, { ...AWC, area_ft2: 13500, thickness_in: 0.375, bulking_factor: 2.5 }]) {
    const r = computeAbatementWasteContainers(c);
    const cuIn = c.area_ft2 * 144 * c.thickness_in;
    within(r.in_place_volume_ft3, cuIn / 1728, 1e-9, "in place, cu ft");
    within(r.in_place_volume_yd3, cuIn / 46656, 1e-9, "in place, cu yd");
    within(r.bulked_volume_yd3, cuIn * c.bulking_factor / 46656, 1e-9, "bulked, cu yd");
  }
});

test("abatement waste: the bag and container counts are the least whole number that holds the bulked volume", () => {
  // Brute force: count up until the bags' usable volume holds the bulked volume.
  for (const c of [AWC, { ...AWC, bag_volume_ft3: 6, bag_fill_fraction: 0.5 }, { ...AWC, bulking_factor: 1.5, container_volume_yd3: 6 }, { ...AWC, area_ft2: 7777, thickness_in: 1.75, container_volume_yd3: 30 }]) {
    const r = computeAbatementWasteContainers(c);
    const bulkedFt3 = c.area_ft2 * c.thickness_in / 12 * c.bulking_factor;
    let bags = 0; while (bags * c.bag_volume_ft3 * c.bag_fill_fraction < bulkedFt3 * (1 - 1e-12)) bags++;
    let boxes = 0; while (boxes * c.container_volume_yd3 * 27 < bulkedFt3 * (1 - 1e-12)) boxes++;
    assert.equal(r.bag_count, bags, `bags, ${JSON.stringify(c)}`);
    assert.equal(r.container_count, boxes, `containers, ${JSON.stringify(c)}`);
  }
});

test("abatement waste: an exact fill takes exactly that many containers and bags, not one more", () => {
  // 3,240 sq ft x 1 in = 270 cu ft = 10 cu yd in place; bulked x2 = 20 cu yd = one 20 cu yd box.
  const r = computeAbatementWasteContainers({ ...AWC, area_ft2: 3240 });
  assert.equal(r.container_count, 1);
  // 25.2 sq ft x 1 in = 2.1 cu ft = one 3 cu ft bag at 0.7 (2.1 cu ft usable), bulking 1.
  assert.equal(computeAbatementWasteContainers({ ...AWC, area_ft2: 25.2, bulking_factor: 1 }).bag_count, 1);
});

test("abatement waste: weight follows the in-place volume -- bulking, bag size and fill change nothing", () => {
  // Bulking is air: mass is conserved through removal and bagging.
  const w = computeAbatementWasteContainers(AWC).waste_weight_lb;
  within(w, 2000 * (1 / 12) * 30, 1e-9, "area x thickness x density");
  for (const k of [{ bulking_factor: 1 }, { bulking_factor: 2.5 }, { bag_volume_ft3: 6 }, { bag_fill_fraction: 0.5 }, { container_volume_yd3: 40 }]) {
    within(computeAbatementWasteContainers({ ...AWC, ...k }).waste_weight_lb, w, 1e-9, JSON.stringify(k));
  }
  within(computeAbatementWasteContainers(AWC).waste_weight_tons, w / 2000, 1e-9, "short tons");
});

test("abatement waste: across the cited 1.5 to 2.5 bulking range the bag count rises and brackets the naive count's multiple", () => {
  // The citation gives bulking of about 1.5 to 2.5; with a 0.7 fill the bag
  // multiple over the naive (in-place, full bag) count is bulking / fill, to
  // within the ceiling's rounding: 2.14x at 1.5 and 3.57x at 2.5.
  let prev = 0;
  for (const b of [1.5, 1.75, 2, 2.25, 2.5]) {
    const r = computeAbatementWasteContainers({ ...AWC, area_ft2: 20000, bulking_factor: b });
    assert.ok(r.bag_count >= prev, `monotone at ${b}`);
    prev = r.bag_count;
    within(r.bag_multiple, b / 0.7, 0.2, `multiple at ${b}`);
  }
});
