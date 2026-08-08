# roughlogic.com Specification v1217 -- Indirect Evaporative Cooler Leaving Temperature (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v1216.md.
>
> **The gap, and the evidence for it.** `computeEvaporativeCoolerEffectiveness` (the direct/swamp tile) note ends:
> "Direct (single-stage) only; an indirect or indirect/direct stage is separate." No tile computed the indirect stage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), an entering dry-bulb not above the secondary wet-bulb, or an effectiveness outside
(0, 1] returns `{ error }`. Citation discipline (v19/v22): the ASHRAE Handbook (HVAC Systems & Equipment, Ch. 41)
indirect sensible-effectiveness relation, by name, `GOVERNANCE.mechanical`. **No copyrighted table is reproduced** -- the
relation is the direct-analog sensible-effectiveness form and the effectiveness is a manufacturer rating.

## 2. The tile

### 2.1 `indirect-evaporative-cooling` -- Indirect Evaporative Cooler Leaving Temperature

```
wet_bulb_depression = T_ent - T_wb,secondary
temp_drop           = indirect_effectiveness x wet_bulb_depression
T_out               = T_ent - temp_drop            (sensible; humidity ratio unchanged)
```

**Inputs:** entering product dry-bulb `dry_bulb_F`, secondary-stream wet-bulb `secondary_wet_bulb_F`, indirect
`effectiveness` (default 0.65; typical 0.5-0.75).

**Outputs:** leaving dry-bulb `leaving_db_F`, `temp_drop_F`, `wet_bulb_depression_F`.

## 3. Worked example

`dry_bulb_F = 95, secondary_wet_bulb_F = 65, effectiveness = 0.65`:

```
depression = 95 - 65 = 30 F
drop       = 0.65 x 30 = 19.5 F
T_out      = 95 - 19.5 = 75.5 F   (dry -- no moisture added)
```

A direct 0.85 pad on the same air reaches ~69 F but near saturation; the indirect stage reaches 75.5 F dry, so a direct
pad can follow it (two-stage / IDEC) to cool below the direct-only result without the humidity penalty.

## 4. Limitations

The product air is cooled sensibly (constant humidity ratio) toward the secondary stream's wet-bulb. Standard indirect
approaches the secondary wet-bulb; a regenerative dew-point (Maisotsenko) design can go lower and is separate. The
exchanger effectiveness is a manufacturer rating. A shop estimate; the equipment data govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1217` pins the sensible cool toward the secondary wet-bulb, the effectiveness and
  secondary-wet-bulb monotonicity, the wet-bulb floor, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the indirect example and the direct-vs-indirect
  contrast).
- Formula checked against the ASHRAE indirect sensible-effectiveness relation (HVAC Systems & Equipment, Ch. 41).
