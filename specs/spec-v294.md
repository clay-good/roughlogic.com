# roughlogic.com Specification v294 -- Slip-Critical Bolt Design Strength (AISC 360 J3.8) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.104.0; proposed 2026-07-02). Batch spec-v293..v295 (the steel connection/detailing depth trio -- web
> local strength (v293), the slip-critical bolt (this spec), fillet-weld size limits (v295)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `bolt-shear-bearing` computes bearing-type bolt shear
> and bearing/tearout, but a slip-critical connection -- required wherever slip cannot be tolerated (oversized holes,
> fatigue, load reversal) -- is governed by friction, not shear, and follows a different AISC equation. Adds one tile to
> the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v293.md.
>
> **The gap, and the evidence for it.** AISC 360 J3.8 takes the slip resistance of a pretensioned high-strength bolt as
> `Rn = mu Du hf Tb ns`, where `mu` is the faying-surface slip coefficient (0.30 Class A, 0.50 Class B), `Du = 1.13`, `hf`
> is the filler factor (1.0 with no fillers or fillers developed), `Tb` the minimum bolt pretension, and `ns` the number of
> slip planes; the resistance factor is `phi = 1.00` (standard holes) with `Omega = 1.50`. For a single 3/4 in A325 bolt on
> a Class A surface (`mu = 0.30`, `Tb = 28 kip`, one slip plane), `Rn = 0.30 x 1.13 x 1.0 x 28 x 1 = 9.49 kip` per bolt --
> ASD 6.33, LRFD 9.49 -- so a four-bolt connection resists 38 kip (LRFD) before it slips. `bolt-shear-bearing` gives the
> ultimate shear; this tile gives the service-slip resistance that governs a slip-critical joint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The slip coefficient `mu`,
the multiplier `Du`, the filler factor `hf`, and the slip-plane count `ns` and bolt count `n` are dimensionless; the minimum
pretension `Tb` is a force (kip); the nominal, ASD, and LRFD slip resistances (per bolt and total) are forces (kip). The
v18/v21 contract: any non-finite input, a pretension at or below zero, or a bolt/plane count below one returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 J3.8 slip provisions by name; `editionNote` names
**the AISC 360-22 J3.8 slip resistance `Rn = mu Du hf Tb ns`, with `mu` = 0.30 (Class A) / 0.50 (Class B), `Du = 1.13`, the
Table J3.1 minimum pretension `Tb`, and `phi = 1.00` / `Omega = 1.50` for standard holes**, and states that **this returns
the slip resistance of a pretensioned slip-critical bolt -- it uses the standard-hole resistance factors (oversized and
slotted holes reduce `phi`/raise `Omega`), the entered `mu`, `Tb`, and `ns`, and does not check the bolt shear/bearing at
the strength level (`bolt-shear-bearing`, which must also be satisfied), the bolt tension interaction, or the pretension
installation method; and this is a design aid, not a substitute for the engineer of record** -- the structural engineer of
record's stamped design governs.

## 2. The tile

### 2.1 `steel-bolt-slip-critical` -- Slip-Critical Bolt Design Strength (AISC 360 J3.8)

```
inputs:
  mu       -     slip coefficient (0.30 Class A, 0.50 Class B)
  Tb_kip   kip   minimum bolt pretension (Table J3.1)
  ns       -     slip planes (1 single-shear, 2 double-shear)
  n        -     number of bolts
  hf       -     filler factor (default 1.0)
  Du       -     multiplier (default 1.13)

Rn_bolt = mu * Du * hf * Tb_kip * ns             ; slip resistance per bolt, kip
ASD_bolt = Rn_bolt / 1.50 ; LRFD_bolt = 1.00 * Rn_bolt
ASD_total = n * ASD_bolt ; LRFD_total = n * LRFD_bolt
```

**Pinned worked example (a 3/4 in A325 bolt, Class A, single slip plane).** `mu = 0.30`, `Tb = 28`, `ns = 1`, `n = 1`,
`hf = 1.0`, `Du = 1.13`: `Rn = 0.30 x 1.13 x 1.0 x 28 x 1 = 9.49 kip` per bolt, ASD `= 6.33 kip`, LRFD `= 9.49 kip`. A
four-bolt group (`n = 4`) resists `4 x 9.49 = 38.0 kip` LRFD, `25.3 kip` ASD. **Cross-check (a Class B surface, double
shear).** Blast-clean the faying surfaces to Class B (`mu = 0.50`) and use double shear (`ns = 2`) on the same bolt:
`Rn = 0.50 x 1.13 x 1.0 x 28 x 2 = 31.6 kip` per bolt -- a 3.3x jump from surface preparation and a second slip plane, the
two levers that make a slip-critical joint efficient. The non-finite, `Tb <= 0`, and `n < 1` / `ns < 1` error paths bracket
the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching `bolt-shear-bearing`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 J3.8 provisions, `editionNote` naming
`Rn = mu Du hf Tb ns`, the `mu`/`Du`/`Tb` values, and the standard-hole, also-check-shear caveats);
`test/fixtures/worked-examples.json` (the Class A example + the Class B double-shear cross-check);
`test/fixtures/compute-map.js` (`steel-bolt-slip-critical` -> `computeSteelBoltSlipCritical` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `bolt-shear-bearing` / `bolt-group-eccentric` / `bolt-torque` / `steel-web-local-strength`);
`data/search/aliases.json` ("slip critical", "slip resistance bolt", "AISC J3.8", "faying surface", "Class A Class B",
"pretensioned bolt", "friction connection", "no slip bolt", "bolt pretension Tb"); the id appended to the existing steel
renderers block in `app.js`; the `// dims:` annotation (`mu`/`ns`/`n`/`hf`/`Du` dimensionless, `Tb` force, resistances
force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the per-bolt-times-n
totals, the Class A/B and single/double-shear scaling, and the `Tb <= 0` / `n < 1` / non-finite error seams. No new module;
re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the total-from-per-bolt assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-bolt and total ASD/LRFD stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (3/4 in Class A -> 9.49 kip/bolt, 6.33 ASD).

## 5. Roadmap position

Middle of the steel connection/detailing depth batch (v293..v295) in `calc-steel.js`, adding the friction limit state beside
the bearing-type bolt shear. Fillet-weld size limits (v295) follow. The oversized/slotted-hole resistance factors, the
combined tension-and-slip interaction (J3.9), and the pretension-installation (turn-of-nut / DTI) reference are the
deliberate next follow-ons once the trio lands.
