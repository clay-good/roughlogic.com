# roughlogic.com Specification v981 -- Max Circuit Length for a Voltage-Drop Target (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v980.md. The direct inverse of the accepted
> `min-conductor-for-vd` tile.
>
> **The gap, and the evidence for it.** The catalog sizes the smallest conductor for a target drop over a KNOWN length
> (`min-conductor-for-vd`), but nothing solves the everyday field question in the other direction: given the wire I
> already have, how FAR can I run it before the drop exceeds the limit? Grep confirmed no length-for-VD tile. The number
> this settles: #12 Cu (6,530 cmil) at 20 A on a 120 V single-phase circuit reaches **45.56 ft** before it hits 3%.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, feet out of volts/cmil/amps), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive voltage,
target percent, current, cmil, or K, or a phase other than 1 or 3 returns `{ error }`. Citation discipline (v19/v22):
the I x R voltage-drop relation solved for length by name, `GOVERNANCE.general`; the note explains that this is a screen
using the standard K approximation (12.9 Cu / 21.2 Al ohm-cmil/ft at 75 C), that it ignores conductor reactance (fine
for typical branch circuits), that the length is ONE-WAY (the factor 2 or sqrt(3) already accounts for the return), and
that NEC 210.19/215 voltage-drop guidance is a recommendation, not a hard rule -- the AHJ and engineer of record govern.

## 2. The tile

### 2.1 `max-circuit-length-for-vd` -- Max Circuit Length for a Voltage-Drop Target

```
inputs:
  source_voltage_v   source (line) voltage (V), default 120
  target_vd_pct      allowable voltage drop (%), default 3
  current_a          load current (A), default 20
  conductor_cmil     conductor area (circular mils), default 6530  (#12 Cu)
  k_constant         resistivity K (ohm-cmil/ft): 12.9 Cu, 21.2 Al, default 12.9
  phases             1 (single-phase) or 3 (three-phase), default 1

vd_target_volts = target_vd_pct / 100 x source_voltage_v
factor          = 2 (single-phase) or sqrt(3) (three-phase)
max_length_ft   = vd_target_volts x conductor_cmil / (factor x k_constant x current_a)
```

**Pinned worked example.** #12 Cu (6,530 cmil), 20 A, 120 V, 3%, single-phase: allowable drop `= 0.03 x 120 = 3.6 V`;
`L = 3.6 x 6530 / (2 x 12.9 x 20) = 23508 / 516 = ` **45.56 ft**. Cross-check: the same wire on a 208 V three-phase
circuit reaches farther -- `L = (0.03 x 208) x 6530 / (sqrt(3) x 12.9 x 20) = 6.24 x 6530 / 446.87 = ` **91.18 ft**.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `min-conductor-for-vd`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (I x R voltage drop solved for length, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the single-phase base plus the three-phase cross-check, pinning vd_target_volts
and max_length_ft); `test/fixtures/compute-map.js` (`max-circuit-length-for-vd` -> `computeMaxCircuitLengthForVd`,
module `../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `voltage-drop` / `min-conductor-for-vd` /
`awg-wire-geometry`); `data/search/aliases.json` (5 collision-checked aliases: "max circuit length", "max wire run",
"voltage drop max length", "how far can i run", "max conductor length"), then `node scripts/build-alias-shards.mjs`; a
hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to
the calc-electrical declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both lengths, the three-phase /
current / cmil / K directions, and the error seams. The calc-electrical.js gzip cap and the Group A group shell are
watched at build (cap raised for this tile). Home tile count 1,429 -> 1,430.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(6,530 cmil / 20 A / 120 V / 3% -> 45.56 ft).

## 5. Roadmap position

The direct inverse of `min-conductor-for-vd`, serving the electrician and estimator (electrical). Deliberately the
standard-K screen; the AHJ, the engineer of record, and the actual conductor temperature and reactance govern the final
run. Stays evidence-driven. Continues the electrical sweep at 1 new spec (v981).
