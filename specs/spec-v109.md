# roughlogic.com Specification v109 -- Electrical Service Grounding, Bonding, and Conductor-Size Selection (calc-electrical.js, Group A, 3 New Tiles)

> **Status: LANDED 2026-06-20 (package 0.69.0, catalog 669 -> 676 with spec-v110 / v111). Deviation: the `min-conductor-for-vd` worked example in section 2.3 omitted the single-phase factor of 2 the existing `voltageDrop` helper applies; the landed tile and its pinned fixtures use the physically correct value (20 A / 150 ft / 120 V / 3% -> 6 AWG Cu, ~2.46%), not the 8 AWG in the prose.** v109 is an in-scope catalog
> expansion under the spec-v106 charter: three Tier-1 electrical tiles, each computed from public
> code-derived sizing rules and first-principles physics, AHJ-governed, with a redo-not-harm
> failure mode. It adds three tiles to the existing **`calc-electrical.js`** module (Group A),
> changes no existing tile's output, and adds no new module, group, or dependency. It inherits
> everything from spec.md through spec-v108.md. It is independent of the v107 / v108 scope changes
> (which retire and freeze non-trade groups); v109 grows the core trade.
>
> **The gap, and the evidence for it.** A concept-check of the live Group A tiles found the
> grounding side of a service install under-covered. The catalog sizes the equipment grounding
> conductor (`Equipment Grounding Conductor Sizing`, NEC 250.122 by OCPD) but has **no** grounding
> electrode conductor sizing (NEC 250.66) and **no** bonding jumper sizing (NEC 250.102 / 250.28),
> which are the other two conductors an electrician sizes at every service. Separately, the catalog
> computes voltage drop forward (`Voltage Drop`, `Branch Voltage Drop With Multiple Loads`) but
> never the inverse a wireman actually asks on the truck: "what is the smallest conductor that
> holds my drop under 3 percent over this run?" All three are daily Tier-1 electrical math.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and reviewer-signoff
  apply. All three tiles size or select a conductor; the conductor cross-sectional area is
  annotated `L^2`, current `I`, length `L`, voltage `M L^2 T^-3 I^-1`, and resistance
  `M L^2 T^-3 I^-2`. Every bundled constant (the NEC FPN 3 percent / 5 percent advisory, the
  Chapter 9 Table 8 conductor resistances, the 12.5 percent large-service bonding rule) is bundled
  and annotated, and the editable values are editable fields.
- The v18 / v21 tile contract applies. Any non-finite input returns `{ error }`; a non-positive
  ampacity, length, current, voltage, or target-percent returns `{ error }`; no tile leaks a
  `NaN` / `Infinity` (the only divisions are by guarded-positive voltage, length, or resistance).
- The v19 / v22 citation discipline applies. **Table-reproduction note (spec-v106 §2):** these
  tiles encode only the threshold-to-size *mapping* values they need to compute, exactly as the
  existing `Equipment Grounding Conductor Sizing` (250.122), `Wire Ampacity` (310.16), and
  `Conductor Resistance` (Chapter 9 Table 8) tiles already do. They do not reproduce a full NFPA
  table; each cites NEC 250.66 / 250.102 / Chapter 9 by section, states "the AHJ-adopted edition
  governs," and links the free read-only text at `nfpa.org/freeaccess`. This is the established
  repo pattern, not a new reproduction.

## 2. The tiles

### 2.1 `grounding-electrode-conductor` -- Grounding Electrode Conductor Sizing (NEC 250.66)

The GEC from the service to the electrode system, sized by the largest ungrounded
service-entrance conductor (or the equivalent area of parallel sets), with the electrode-specific
caps that catch most field questions.

```
inputs:
  material            dimensionless   service conductor material (copper / aluminum)
  service_kcmil       L^2             largest ungrounded service conductor (AWG/kcmil, equiv area)
  electrode_type      dimensionless   rod-pipe-plate / concrete-encased / ground-ring / water-pipe-or-building-steel

base_gec  = Table 250.66 size for service_kcmil and material
cap rules (250.66(A)/(B)/(C)):
  rod/pipe/plate sole connection  -> not required larger than 6 AWG copper / 4 AWG aluminum
  concrete-encased sole connection-> not required larger than 4 AWG copper
  ground ring                     -> not smaller than the ring conductor, and not smaller than 2 AWG
output:
  required_gec (the smaller of base_gec and the applicable cap, never smaller than the floor)
```

**Pinned worked example.** Copper service, 250 kcmil ungrounded, to a ground rod: Table 250.66
base is 2 AWG copper, but the rod sole-connection cap is 6 AWG, so `required_gec = 6 AWG copper`.
**Cross-check:** same 250 kcmil copper to a concrete-encased electrode (Ufer): base 2 AWG, the
concrete-encased cap is 4 AWG, so `required_gec = 4 AWG copper`. A water-pipe / structural-steel
electrode takes the full Table 250.66 base (no cap): `2 AWG copper`.

### 2.2 `bonding-jumper` -- Main, Supply-Side, and Equipment Bonding Jumper Sizing (NEC 250.28 / 250.102)

Sizes the three bonding jumpers an electrician runs at a service and downstream.

```
inputs:
  mode                dimensionless   supply-side (main/system) / equipment (load-side)
  material            dimensionless   copper / aluminum
  service_kcmil       L^2             largest ungrounded SERVICE conductor (supply-side mode)
  ocpd_A              I               overcurrent device rating (equipment mode)
  parallel_sets       dimensionless   number of parallel raceways (equipment mode, default 1)

supply-side (250.28(D) / 250.102(C)):
  jumper = Table 250.66 size for service_kcmil
  if service phase conductors > 1100 kcmil copper (1750 kcmil aluminum):
     jumper area = max(table area, 0.125 x largest phase conductor area)   # 12.5% rule
equipment / load-side (250.102(D)):
  jumper = Table 250.122 size for ocpd_A
  if parallel_sets > 1: a full-size 250.122 jumper in EACH raceway (per ratio)
output:
  required_jumper (and, for parallel equipment mode, per-raceway size + count)
```

**Pinned worked example.** Supply-side jumper, copper, 350 kcmil service conductors: Table 250.66
gives `2 AWG copper` (no 12.5 percent rule below 1100 kcmil). **Cross-check (12.5 percent rule):**
copper service phase conductors of 1500 kcmil exceed 1100 kcmil, so the supply-side jumper area is
`0.125 x 1500 = 187.5 kcmil` -> round up to `4/0 AWG (211.6 kcmil) copper`. **Equipment mode:** a
400 A OCPD feeding one raceway -> Table 250.122 gives `3 AWG copper`; with three parallel raceways,
a `3 AWG copper` jumper in each.

### 2.3 `min-conductor-for-vd` -- Minimum Conductor Size for a Voltage-Drop Target (Inverse VD)

The inverse of the existing `Voltage Drop` tile: the smallest conductor that keeps the drop at or
below a target percent over a given run, using the bundled Chapter 9 Table 8 resistances and the
existing `voltageDrop` helper.

```
inputs:
  phase               dimensionless   single / three
  material            dimensionless   copper / aluminum
  current_A           I               load current
  length_ft           L               one-way run length
  source_voltage_V    M L^2 T^-3 I^-1 system voltage
  target_percent      dimensionless   allowed drop (default 3)

allowed_drop_V = target_percent/100 x source_voltage_V
for each AWG (smallest up): compute drop via voltageDrop(); pick the first whose drop <= allowed
output:
  min_awg (copper and aluminum), resulting_drop_V, resulting_percent
  ampacity_note: "verify this size also satisfies ampacity and termination temperature"
```

**Pinned worked example.** Single-phase, copper, 20 A, 150 ft one-way, 120 V, target 3 percent:
allowed drop 3.6 V; 12 AWG drops ~5.9 V (too much), 10 AWG ~3.7 V (too much), `8 AWG` ~2.3 V ->
`min_awg = 8 AWG copper`, resulting ~1.9 percent. **Cross-check:** same run at target 5 percent
(allowed 6.0 V) -> `12 AWG copper` passes (~4.9 percent). The ampacity note always renders: a
voltage-drop size is a floor, not a substitute for the ampacity and 110.14(C) termination check.

## 3. Concept-check and wiring

Concept-checked against the live Group A tiles: `Equipment Grounding Conductor Sizing` is 250.122
only; no tile sizes the GEC (250.66) or the bonding jumpers (250.102 / 250.28); no tile inverts
voltage drop to a conductor size. All three ship into the existing `calc-electrical.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `A`; trade `["electrical"]`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`grounding-electrode-conductor` ->
NEC 250.66; `bonding-jumper` -> NEC 250.28(D) / 250.102(C)(D); `min-conductor-for-vd` ->
first-principles I*R drop + NEC FPN 3/5 percent advisory + Chapter 9 Table 8, all with
`nfpa.org/freeaccess`); `test/fixtures/worked-examples.json` (each pinned example and its
cross-check); `test/fixtures/compute-map.js` (`grounding-electrode-conductor` ->
`computeGroundingElectrodeConductor`, `bonding-jumper` -> `computeBondingJumper`,
`min-conductor-for-vd` -> `computeMinConductorForVd`, all in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (cross-link GEC <-> bonding-jumper <-> `equipment-grounding-conductor`;
`min-conductor-for-vd` <-> `voltage-drop` / `wire-ampacity` / `conductor-resistance`);
`data/search/aliases.json` (GEC: "grounding electrode conductor", "GEC size", "250.66", "ground
rod wire size", "ufer wire"; bonding-jumper: "bonding jumper", "main bonding jumper", "supply side
bonding", "250.102", "system bonding jumper"; min-conductor-for-vd: "wire size for voltage drop",
"what size wire", "3 percent drop wire", "size conductor for drop"); the three ids appended to the
existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotations; the regenerated
v14 corpus + tile-index; and a `test/unit/bounds-fuzzer.test.js` block pinning all worked examples,
cross-checks, and every error seam.

**Module note.** The three tiles land in the existing `calc-electrical.js`. If the addition pushes
the module past its `scripts/check-module-sizes.mjs` gzip cap, raise the cap to current + ~20
percent with a dated comment (the standing per-module precedent). The shared `citations.js`
registry cap is bumped if needed for the three new entries (the standard registry-growth
side-effect). It remains lazy-loaded and absent from the home-view first-paint payload.

## 4. As-landed verification (gate plan)

The standard green bar: `npm run lint` (every gate, including module-size, wiring, sw-precache,
dimensions, corpus, tile-contract, em-dash ban, and `check-readme-counts` re-pinned to the live
catalog total **+3 tiles**, same group / module / sitemap-group counts plus three new tile URLs);
`npm test` (+6 worked-example fixtures and cross-checks; the new spec-v109 bounds-fuzzer block);
`npm run build` (three new tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner; the 320 px shell audit (the size and percent lines wrap, not scroll, on a
phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (250 kcmil Cu to a rod -> 6 AWG; 20 A / 150 ft / 120 V / 3 percent ->
8 AWG Cu).

## 5. Roadmap position

v109 closes the grounding / bonding gap on the service-install side of Group A and adds the
most-requested inverse of the voltage-drop tile. It pairs naturally with the jurisdiction /
edition-awareness pillar (spec-v106 §7): the GEC and bonding rules are edition-stable, but the
ampacity and termination cross-references the tiles point to are exactly the values that benefit
from edition selection. Further Group A growth stays evidence-driven (a named gap a wireman hits).
