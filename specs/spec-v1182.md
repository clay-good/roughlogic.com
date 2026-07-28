# roughlogic.com Specification v1182 -- Lavatory Height and Bathtub Clearance (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 99 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1181.md.
>
> **The gap.** A dupe scan for "bathtub" returned zero hits, and the only "lavatory" match was
> `knee-toe-clearance`, which covers what is *under* the fixture and not its height. Nothing covered 606 or
> 607.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown seat
flag, a non-positive rim height or tub length, or a negative counter height, metering time, or clearance
return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 606.3, 606.4, 606.5, 607.2, and 607.3. A US federal
standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `lavatory-tub-clearance` -- Lavatory Height and Bathtub Clearance (606, 607)

```
inputs:  rim_height_in, counter_height_in, metering_seconds, tub_length_in,
         permanent_seat, clear_length_in, clear_width_in
compute: lavatory: max(rim, counter) <= 34 in
         metering faucet open time >= 10 s
         tub clearance length = tub length, + 12 in where a permanent seat is at the head end
         tub clearance width >= 30 in
outputs: governing_lav_height_in, counter_governs, lav_ok, lav_excess_in, rim_alone_ok,
         hidden_by_counter, metering_entered, metering_ok, metering_deficit_s,
         required_clear_length_in, seat_extra_in, clear_length_ok, clear_length_deficit_in,
         clear_width_ok, clear_width_deficit_in, tub_ok, clear_area_sf, passes, note
```

**The counter fails the fixture.** 34 in is measured to the front of the **higher** of the rim or the
counter surface, so the default example's 33-in rim passes on its own and the 36-in counter around it
governs at 2 in over. The tile flags `hidden_by_counter` by name, because it changes who has to fix it: a
vessel sink or a thick stone top fails a lavatory that was specified correctly, and the fixture was never
the problem. The fuzzer pins that the flag fires only when the rim alone would have passed.

**Metering faucets carry a number that is not a dimension.** 10 seconds minimum, longer than most are
shipped set, and adjusted at the cartridge rather than specified at purchase. It is optional input and
reports `null` when absent rather than a pass.

**The 12 in past the head-end wall is the part nobody draws.** The tub clearance runs the length of the tub
at 30 in wide, and *with a permanent seat* it extends 12 in beyond the wall at the head end -- so a 60-in
tub needs **72 in** of clear floor. The fuzzer checks at four tub lengths that the seat is the only input
that moves it and that it moves it by exactly 12 in.

**The cross-check fixture sits exactly on every limit and passes**: a 34-in rim with no counter, a faucet
held open exactly 10 s, and a seatless 60-in tub with 60 in of clearance.

## 3. Scope

A clearance screen, not a bathroom design. Not checked: the clear floor space at the lavatory and the knee
and toe clearance under it, which are separate tiles and which a cabinet defeats before the height does;
whether faucet controls meet the operable-parts requirements; the 606.5 pipe-protection requirement, which
is quoted but is not a measurable this tile checks; grab bars at the tub; the tub seat's own dimensions;
controls and the hand shower; enclosures, which may not obstruct transfer; and state and local
accessibility law and the plumbing code.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `knee-toe-clearance`,
`water-closet-location`, `accessible-shower-check`, and `reach-range`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the higher-of rule at
five rim-and-counter combinations, the inclusive 34-in limit, the hidden-by-counter flag firing only in its
own case, exact non-negative excesses, the metering seam with `null` when absent and an absent faucet not
failing, the head-end 12 in at four tub lengths as the seat's only effect, tub length and width failing
independently with exact deficits, the clearance area following the required length, that every check fails
independently, and every error seam.
