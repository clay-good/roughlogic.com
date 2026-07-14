# roughlogic.com Specification v672 -- Max Bearing Load for a Target L10 Life (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K,
> machining / mechanic), no new module, group, or dependency. Inherits spec.md through spec-v671.md.
>
> **The gap, and the evidence for it.** Spec-v504 (`bearing-l10-life`) runs ISO 281 forward: given the equivalent load,
> it returns the L10 rating life. The design question a machine builder asks is the inverse -- **how hard can I load this
> bearing and still get the life I need**. The forward tile makes you guess loads and re-read the hours; the inverse
> solves it directly. From `L10 = (C/P)^p x 10^6 rev` with `L10 = target_hr x 60 x rpm`,
> `P_max = C x (10^6 / L10_rev)^(1/p)` (p = 3 ball, 10/3 roller). The number this settles: a ball bearing rated
> C = 5,000 lbf at 1,750 rpm can carry **1,000 lbf** for a **1,190 hr** L10; a roller bearing of the same rating carries
> **1,175 lbf** because its 10/3 exponent is gentler. Because life scales as the cube of the load ratio, the load limit
> is only weakly sensitive to the target life -- doubling the hours cuts the allowable load by about 20%.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`bearing-l10-life` sibling: the dynamic load rating and the returned load are `M L T^-2` (lbf), the target life is `T`
(hr), the speed is `T^-1` (rpm), the L10 revolutions and the exponent are `dimensionless`, and the bearing type is the
same `ball` / `roller` select. The v18/v21 contract: any non-finite input, or a non-positive rating / target life /
speed, or an unknown bearing type, returns `{ error }`. Citation discipline (v19/v22): ISO 281 / ABMA 9 & 11 basic
rating life solved for the load, by name; the note states that **P_max scales as `(10^6 / L10_rev)^(1/p)`, the load
limit is weakly sensitive to the target life, the basic L10 assumes clean, well-lubricated operation (contamination
needs the modified aISO life), L10 is the life at which 10% have failed not the average, and this is a planning estimate
-- the mounting, lubrication, and application govern**.

## 2. The tile

### 2.1 `bearing-max-load` -- Max Bearing Load for a Target L10 Life

```
inputs:
  dynamic_rating_lbf   lbf   basic dynamic load rating C (> 0)
  target_life_hr       hr    target rating life L10h (> 0)
  speed_rpm            rpm   operating speed (> 0)
  bearing_type         -     ball (p = 3) or roller (p = 10/3)

L10_rev = target_life_hr x 60 x speed_rpm
P_max   = dynamic_rating_lbf x (10^6 / L10_rev)^(1/p)   [lbf]
```

**Pinned worked example (a ball bearing).** C = 5,000 lbf, target = 1,190 hr, 1,750 rpm, ball (p = 3): with
`L10_rev = 1190 x 60 x 1750 = 124.95 million`, `P_max = 5000 x (10^6 / 124.95e6)^(1/3) = 5000 x 0.2000 = ` **1,000 lbf**;
feeding 1,000 lbf back through `bearing-l10-life` returns 1,190 hr, the input. **Cross-check (a roller bearing).** Same
rating and target life, roller (p = 10/3): `P_max = 5000 x (10^6 / 124.95e6)^(3/10) = ` **1,175 lbf** -- the roller's
gentler exponent lets it carry about 18% more load for the same life.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`, beside `bearing-l10-life`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (ISO 281 solved for load, `GOVERNANCE.general` matching the sibling, the note per
§1); `test/fixtures/worked-examples.json` (both examples, exercising both bearing types);
`test/fixtures/compute-map.js` (`bearing-max-load` -> `computeBearingMaxLoad` in `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `bearing-l10-life` / `vbelt-drive` / `shrink-fit` / `press-fit-pressure`, and the forward
tile links back); `data/search/aliases.json` ("max bearing load", "load for target bearing life", "how hard can i load a
bearing", plus adjacent rows); `MACHINING_RENDERERS["bearing-max-load"]` via a hand-written renderer with the same
`makeSelect` ball/roller toggle as the sibling (the select value feeds the compute, so the check-dead-inputs gate is
satisfied) and the id added to the calc-machining declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples,
the ball/roller exponent, the round-trip through `computeBearingL10Life`, and the error seams. The Group K
audit-coverage test parses only the original `// Group K: Mechanic` block (this tile is in a later section, so the exact
count of 12 is unaffected), so no count bump. The calc-machining.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 1,000 lbf for a 1,190 hr ball-bearing life).

## 5. Roadmap position

Pairs the forward bearing tile (`bearing-l10-life`, life from load) with its inverse (load from the target life), the
two halves of the bearing-sizing question. Further Group K growth stays evidence-driven.
