# roughlogic.com Specification v1025 -- Window / Door Rough Opening Size (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1024.md.
>
> **The gap, and the evidence for it.** No "rough opening" string exists anywhere in tools-data.js, the
> alias index, standard-sizes.js, or any calc module. `header-sizing` is the structural half (IRC R602.7
> header depth) and its own alias "what size header for a garage door opening" shows users arriving with
> opening questions; the DIMENSIONAL half -- what RO to frame for a given unit -- was absent. Discovery
> batch 3 flagged it CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite or
non-positive unit dimensions, or an unknown opening type, return `{ error }`. Citation discipline: this is a
CONVENTION tile -- the published US framing rules of thumb, stated as defaults with the manufacturer's RO
governing (the note and citation both say so, and the adders are editable inputs so a spec sheet can be
matched exactly). Conventions corroborated against multiple independent framing references 2026-07-27:
window RO = frame + 1/2 in each way; prehung door RO = slab + 2 in wide, + 2.5 in tall (36 x 80 -> 38 x 82.5).
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `rough-opening-size` -- Window / Door Rough Opening Size

```
inputs:  opening_type (window: enter FRAME outside dims | prehung-door: enter SLAB dims),
         unit_width_in, unit_height_in,
         width_adder_in / height_adder_in (-1 = use the convention; any other value overrides,
         so a manufacturer's stated RO can be matched exactly)
compute: window adders 0.5 / 0.5; prehung-door adders 2.0 / 2.5
         ro = unit + adder (each way); header rough length = ro_width + 3 (two 1.5-in jack studs)
outputs: ro_width_in, ro_height_in, header_length_in, wa_used, ha_used, note
```

**Worked example (pinned).** A 36 x 80 prehung interior door: RO 38 x 82.5 in, header rough length 41 in.
Window cross-check: a 35.5 x 47.5 frame wants a 36 x 48 RO -- the round-number framing dimension window
manufacturers size their frames 1/2 in under on purpose.

## 3. Scope limits

Dimensional conventions only -- the header's structural depth is `header-sizing`, and king/jack/cripple
counts are framing-crew layout. The manufacturer's stated RO governs whenever it differs (the tile says so
twice and takes overrides). Egress clearances, tempered-glazing triggers, and flashing are code/manufacturer
territory outside this tile.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins both conventions, the override path, the header
+3 identity, additivity, and error seams. Cap ledger: calc-finish.js 12000 -> 15000 (was at 98.3% before
this tile).
