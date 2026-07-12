# roughlogic.com Specification v637 -- Open-Channel Specific Energy and Alternate Depth (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-12). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing), no new module, group, or dependency. Inherits spec.md through spec-v636.md.
>
> **The gap, and the evidence for it.** Spec-v304 (`channel-froude-number`) lists "a specific-energy diagram" as one
> of "the deliberate next follow-ons," and spec-v632 (`hydraulic-jump`) closed by restating that "The specific-energy
> diagram spec-v304 also named remains a deliberate future follow-on." The specific energy `E = y + q^2/(2 g y^2)` is
> the flow energy measured from the channel bed. For one discharge it is a curve with two branches: the same `E`
> occurs at a deep, slow **subcritical** depth and a shallow, fast **supercritical** depth -- the two **alternate
> depths** -- which meet at the critical depth `yc`, where `E` is at its minimum `Ec = 1.5 yc`. This is the
> **energy** conjugate (the two depths carry the same specific energy, no loss), and is physically distinct from the
> **momentum** conjugate (the sequent depth) the `hydraulic-jump` tile computes across a jump that dissipates energy.
> Neither shipped tile returns `E` for a depth or the alternate depth that shares it. The number this settles: a
> 10 ft channel carrying 100 cfs at a tranquil 3 ft depth has specific energy **3.17 ft**; that same 3.17 ft of
> energy also passes at a shooting **0.81 ft** (supercritical), and the energy bottoms out at **2.19 ft** at the
> critical depth **1.46 ft**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`channel-froude-number` sibling: the width, depths, critical depth, and energies are `L`, the discharge is
`L^3 T^-1`, the velocity is `L T^-1`, and the Froude number is `dimensionless`. `g = 32.2 ft/s^2` is universal.
The v18/v21 contract: any non-finite input, or a non-positive width, discharge, or depth, returns `{ error }`.
Citation discipline (v19/v22): the specific-energy relation `E = y + q^2/(2 g y^2)`, the rectangular critical depth
`yc = (q^2/g)^(1/3)` with minimum specific energy `Ec = 1.5 yc`, and the alternate-depth relation for a rectangular
channel, as compiled in Chow (Open-Channel Hydraulics); the note states that **the two alternate depths carry the
same specific energy (an energy conjugate, not the momentum sequent depth of a jump), the flow is subcritical above
`yc` and supercritical below it, and this is the rectangular, prismatic case** -- a design aid, not a substitute for
the engineer of record's hydraulic design.

## 2. The tile

### 2.1 `specific-energy` -- Specific Energy and Alternate Depth in a Rectangular Channel

```
inputs:
  b_ft     ft     channel width (> 0)
  q_cfs    cfs    discharge (> 0)
  y_ft     ft     flow depth (> 0)

q     = q_cfs / b_ft                                  [ft^2/s]  (unit discharge)
V     = q / y_ft                                      [ft/s]
E     = y_ft + q^2 / (2 x g x y_ft^2)                 [ft]      (specific energy at this depth)
yc    = (q^2 / g)^(1/3)                               [ft]      (critical depth)
Ec    = 1.5 x yc                                      [ft]      (minimum specific energy)
Fr    = V / sqrt(g x y_ft)                            [-]       (< 1 subcritical, > 1 supercritical)
y_alt = ((E - y) + sqrt((E - y)^2 + 2 q^2/(g x y))) / 2   [ft]  (alternate depth, same E)
```

The alternate depth is the second positive root of the specific-energy cubic `y^3 - E y^2 + q^2/(2g) = 0`; given the
known depth `y` as one root, the remaining positive root is the closed form above.

**Pinned worked example (a tranquil subcritical flow).** b = 10 ft, Q = 100 cfs, y = 3 ft: `q = 10 ft^2/s`,
`V = 3.33 ft/s`, `E = 3 + 100/(2 x 32.2 x 9) = ` **3.173 ft**, `yc = (100/32.2)^(1/3) = ` **1.459 ft**,
`Ec = ` **2.188 ft**, `Fr = ` **0.339** (subcritical), alternate depth `y_alt = ` **0.811 ft** (the supercritical
depth carrying the same 3.173 ft of energy).
**Cross-check (energy conjugacy is symmetric).** Feeding the alternate depth back in returns the original: b = 10,
Q = 100, y = 0.811 ft gives `Fr = ` **2.41** (supercritical), the same `E = ` **3.173 ft** and `yc = ` **1.459 ft**,
and `y_alt = ` **3.00 ft**.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `hydraulic-jump`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Chow, the note per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`specific-energy` -> `computeSpecificEnergy` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (-> `channel-froude-number` / `hydraulic-jump` / `manning-slope`);
`data/search/aliases.json` ("specific energy", "alternate depth", "specific energy diagram", "conjugate depth
energy", plus question rows); `PLUMBING_RENDERERS["specific-energy"]` via a hand-written renderer (the module's
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`channel-froude-number`) and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the alternate-depth round-trip identity (`E(y_alt) == E(y)` and `y_alt(y_alt) == y`), the `Ec = 1.5 yc`
and `Fr <> 1` regime consistency, and the error seams (non-finite, non-positive width / discharge / depth). Group B
has no exact audit-count assertion and the mechanical-governance test is an explicit list, so no count bump. The
calc-plumbing.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> E 3.173 ft, yc 1.459 ft, alternate depth 0.811 ft).

## 5. Roadmap position

Completes the open-channel trio the two shipped tiles bracket: the regime classification (`channel-froude-number`,
spec-v304), the specific energy and its alternate depth (this tile), and the momentum jump between regimes
(`hydraulic-jump`, spec-v632). Closes the specific-energy-diagram follow-on spec-v304 and spec-v632 both named.
Further Group B growth stays evidence-driven.
