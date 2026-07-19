# roughlogic.com Specification v1007 -- Flywheel Kinetic Energy and Speed Fluctuation (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1006.md. Beside `hp-from-torque`,
> `mean-piston-speed`, and `driveshaft-crit` in the rotating-machinery family.
>
> **The gap, and the evidence for it.** The catalog has torque/HP, piston speed, and shaft-critical-speed tiles, but
> nothing computes a flywheel's stored energy or the speed swing that sizes it. Grep + the alias index confirmed no
> flywheel tile. The number this settles: a 100 lb flywheel with a 1 ft radius of gyration at 1,000 rpm stores about
> **17,000 ft-lb**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, ft-lb and a percent from lb, ft, and rpm),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive weight, radius of gyration, or rpm, or a negative energy pulse returns `{ error }`; a zero energy pulse
returns a null speed fluctuation. Citation discipline (v19/v22): the flywheel stored rotational kinetic energy and
coefficient of fluctuation by name (machine-design first principles; Machinery's Handbook), `GOVERNANCE.general`; the
note explains the radius of gyration (disk vs rim), the 32.174 ft/s^2 gravity constant, and that the actual inertia, the
load's energy profile, and the drive/prime mover govern the design.

## 2. The tile

### 2.1 `flywheel-energy` -- Flywheel Kinetic Energy and Speed Fluctuation

```
inputs:
  weight_lb                flywheel weight (lb), default 100
  radius_of_gyration_ft    radius of gyration k (ft): disk r/sqrt(2), rim ~ r, default 1
  rpm                      speed (rpm), default 1000
  energy_fluctuation_ftlb  energy pulse per cycle (ft-lb, 0 to skip), default 0

I                    = (weight_lb / 32.174) x radius_of_gyration_ft^2
omega                = rpm x pi / 30
kinetic_energy_ftlb  = 0.5 x I x omega^2
speed_fluctuation_pct = 100 x energy_fluctuation_ftlb / (I x omega^2)   [= pulse / (2 x KE)]
```

**Pinned worked example.** 100 lb, k = 1 ft, 1,000 rpm, 2,000 ft-lb pulse: `I = 100/32.174 x 1 = 3.108`; `omega = 1,000
x pi/30 = 104.7`; `KE = 0.5 x 3.108 x 104.7^2 = ` **17,042 ft-lb**; `Cs = 2,000/(2 x 17,042) = ` **5.87%** speed swing.
Cross-check: 200 lb, k = 1.5 ft, 600 rpm: `KE = 0.5 x 13.99 x 62.83^2 = ` **27,608 ft-lb**.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "machinist"]`, beside `sailboat-performance-ratios`); a
`tile-meta.js` `_TILES` entry (`K`); a `citations.js` entry (machine-design flywheel practice, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base plus the no-pulse cross-check, pinning the KE and speed fluctuation);
`test/fixtures/compute-map.js` (`flywheel-energy` -> `computeFlywheelEnergy`, module `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `hp-from-torque` / `mean-piston-speed` / `driveshaft-crit`);
`data/search/aliases.json` (5 collision-checked aliases: "flywheel", "flywheel energy", "rotational energy",
"coefficient of fluctuation", "flywheel sizing"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by
the `_simpleRenderer` factory in the `MECHANIC_RENDERERS` map, and the id added to the calc-mechanic declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the KE-scales-with-square-of-speed-and-k relations, the
bigger-flywheel-swings-less direction, and the error seams. The calc-mechanic.js gzip cap and the Group K group shell
are watched at build (cap raised for this tile). Home tile count 1,455 -> 1,456.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 lb, k 1 ft, 1,000 rpm -> 17,042 ft-lb).

## 5. Roadmap position

Rotating machinery beside `hp-from-torque`, serving the millwright / machine builder (mechanic, machinist).
Deliberately the sizing aid; the actual moment of inertia from the flywheel geometry, the load's real energy profile,
and the drive and prime mover govern the design. Stays evidence-driven. Continues the machine-design sweep at 1 new spec
(v1007). **This is the 100th new tile of the spec-v909..v1007 campaign (catalog -> 1,456).**
