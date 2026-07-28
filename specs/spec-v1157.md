# roughlogic.com Specification v1157 -- Crane Power Line Clearance (calc-rigging.js, Group Z, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-rigging.js`** (Group Z), no new module, group, or dependency. Inherits spec.md through
> spec-v1156.md.
>
> **The gap.** A dupe scan for "power line", "energized line", and "minimum approach" returned zero hits,
> in a module that already does crane capacity, ground bearing, and load share.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so **Table A
is reproduced** rather than paraphrased around.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
option, a negative voltage, clearance, or boom length, or the Table A option without a voltage return
`{ error }`. Hand-written renderer -- **calc-rigging.js has no `_simpleRenderer` factory** (the fourth
module in this campaign with its own convention).
`check-module-sizes` cap for calc-rigging.js raised 34000 -> 40000.

## 2. The tile

### 2.1 `crane-power-line-clearance` -- Clearance from Energized Lines

```
inputs:  option (deenergized|default|table-a), voltage_kv, actual_clearance_ft, boom_length_ft
compute: deenergized -> 0
         table-a     -> Table A by voltage band (10/15/20/25/35/45 ft; over 1,000 kV = null)
         default     -> 20 ft up to 350 kV, 50 ft above
outputs: route, required_clearance_ft, default_clearance_ft, default_assumed, table_a_ft,
         table_a_saving_ft, table_a_helps, over_1000kv, determinable, clearance_ok,
         clearance_shortfall_ft, default_is_unsafe, boom_reaches, passes, note
```

**The 20 ft everyone carries is a default, not the rule** -- it is what you fall back on when you have not
determined the voltage. Determine it and Table A applies, starting at **10 ft** for lines up to 50 kV,
which covers most distribution. On a 12 kV service that is **10 ft of working radius bought back for a
phone call to the utility**, and the first fixture is exactly that: the same 12 ft held fails by 8 ft on
the default and passes on Table A.

**The trap runs the other way, and that direction kills people.** The 20 ft default applies only up to
350 kV. Above it the default is **50 ft** and Table A climbs to 25, 35, and 45. A crew at 500 kV holding
25 ft is comfortably past the number they remember and 25 ft short of the one that applies -- so the tile
raises a specific flag for a clearance that satisfies an *inapplicable* default, rather than reporting a
bare failure.

**Over 1,000 kV it returns nothing** rather than extrapolating: the distance is set by the utility owner
or operator, or a registered professional engineer qualified in power transmission and distribution.

**One framing point a distance alone hides:** where the boom is longer than the clearance held, the line
is inside the machine's reach, and clearance becomes a matter of *control* rather than geometry. That is
precisely why the clearance options are conditioned on paragraph (b)'s encroachment-prevention measures --
a dedicated spotter, proximity alarm, range control, insulating link, or range limiting device. Those are
conditions of using the clearance, not optional extras, and they are not evaluated here.

## 3. Scope

Not checked: the encroachment-prevention measures, the planning meeting and work-zone identification,
assembly and disassembly near power lines, travel under or near lines with no load, and the utility's
confirmation of voltage.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `crane-net-capacity` (which now links
forward), `crane-ground-bearing`, and `crane-lift-quick`. Fuzzer pins both fixtures, all twelve Table A
band boundaries, the `null` above 1,000 kV and that it never passes, both defaults across four voltages,
the dangerous-direction flag firing only when it should, what determining the voltage buys in three cases
including where it buys nothing, the deenergized route, that Table A refuses to run without a voltage,
that boom reach is informational only, and every error seam.
