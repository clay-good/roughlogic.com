# roughlogic.com Specification v1178 -- Accessible Shower Compartment Types (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 95 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1177.md.
>
> **The gap is self-declared.** `shower-compartment-check` (spec-v1134) does the IPC 417.4 dimensions and
> says in its own scope note that accessible roll-in and transfer stalls "are governed separately and are
> larger." This is that separate governance.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
shower type, a non-positive inside dimension or entry width, or a negative clearance return `{ error }`.
Renderer: this module's `_simpleRenderer`. `check-module-sizes` cap for calc-construction.js raised 260000 -> 290000 (the module reached 260,129 B gz).

**Source.** 2010 ADA Standards for Accessible Design, 608.2.1, 608.2.2, and 608.2.3. A US federal standard
in the public domain, quoted directly.

## 2. The tile

### 2.1 `accessible-shower-check` -- Accessible Shower Compartment Types (608.2)

```
inputs:  shower_type (transfer|standard-roll-in|alternate-roll-in), width_in, depth_in,
         entry_width_in, clearance_width_in, clearance_length_in
compute: transfer          36 x 36 inside, 36 in entry, 36 x 48 clearance from the control wall
         standard roll-in  30 x 60 inside, 60 in entry, 30 x 60 clearance at the open face
         alternate roll-in 36 x 60 inside, 36 in entry at one end of the long side
         plus: which types this compartment would satisfy as built, in either orientation
outputs: type_label, required_* (five), width_ok, depth_ok, entry_ok, three deficits, inside_ok,
         clearance_entered, clearance_width_ok, clearance_length_ok, clearance_ok, two clearance
         deficits, inside_area_sf, total_footprint_sf, fits, passes, note
```

**The standard roll-in's entry is the whole long side.** The default example is a 32 x 60 stall that
satisfies both inside dimensions comfortably and fails by **28 in** on the opening, because 608.2.2 wants
60 in of entry on a 60 in face -- so a curb, a jamb, a door, or a fixed panel across it defeats the type
outright.

**The transfer type is small and the room it needs is not.** 36 in square is the only one of the three that
fits a standard alcove, and its outside clearance is 36 x 48 in measured from the **control wall**, deeper
than the stall itself. The cross-check fixture is a dimensionally perfect transfer stall that fails by 12
in on that clearance -- 21 sq ft of floor for a 9 sq ft fixture, which is the reverse of how a small fixture
reads on a plan.

**Because the three overlap confusingly, the tile answers "then what does it fit?"** It reports which types
the compartment as built would satisfy, in either orientation -- worth knowing before anything is torn out,
since a stall that fails the type it was drawn as often meets another. The fuzzer pins the same 36 x 60
stall passing the alternate roll-in and failing the standard by exactly its 24 in of entry.

**The clearance is optional input and reports `null` rather than a pass when omitted**, with the note
saying plainly that it is still required.

## 3. Scope

A compartment sizing screen, not a bathroom design. Not checked: grab bars, which differ by type and are
the reason the three are not interchangeable; the seat; controls, faucets, and the hand shower, whose
location is tied to the seat and the entry; thresholds and the roll-in curb limit; enclosures, which may
not obstruct transfer or the clear floor space; drainage and slope; and state and local accessibility law
and the plumbing code.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `shower-compartment-check`,
`grab-bar-layout`, `accessible-toilet-compartment`, and `turning-clear-floor-space`. The tools-data row
sits inside the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, all
three type geometries against an independently written table with each exact minimum passing and a tenth
under any of the three inside dimensions failing, the same stall passing one type and failing another with
the exact entry deficit, the transfer clearance failing a perfect stall, optional clearance returning
`null` with either dimension counting as entered, both clearance deficits exact and non-negative, the
would-satisfy report including the rotated case and the multi-type case, footprint arithmetic per type, and
every error seam.
