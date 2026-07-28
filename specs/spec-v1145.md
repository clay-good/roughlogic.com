# roughlogic.com Specification v1145 -- Gas Appliance Connection Check (calc-gas.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B), no new module, group, or dependency. Inherits spec.md through spec-v1144.md.
>
> **The gap.** A dupe scan for "sediment trap" and "appliance shutoff" returned zero hits. The gas module
> sizes pipe and converts fuels; nothing covered the last three feet.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
appliance type or a negative distance or length returns `{ error }`. Hand-written renderer, matching this
module's convention.

## 2. The tile

### 2.1 `gas-appliance-connection` -- Gas Appliance Connection Check

```
inputs:  appliance, shutoff_same_room, shutoff_distance_ft, shutoff_upstream,
         trap_present, trap_in_appliance, connector_length_ft
compute: 409.5     same room AND <= 6 ft AND upstream of the union/connector
         408.4     trap required unless the type is excepted or one is built in
         411.1.3.1 connector <= 6 ft for ranges and domestic dryers, else 3 ft
outputs: movable, shutoff_ok, distance_ok, shutoff_distance_deficit_ft, trap_exempt,
         trap_required, trap_ok, connector_limit_ft, has_connector, connector_ok,
         connector_over_ft, passes, note
```

**One category cuts across all three sections.** Ranges and domestic clothes dryers are on 408.4's
sediment-trap exception list, get **6 ft** of connector under 411.1.3.1 where everything else gets 3, and
are the appliances 409.5 has in mind when it deems a shutoff behind them accessible. The code has a
coherent idea of a **movable appliance** -- one that gets pulled out to clean behind -- and once that is
visible, all three answers follow from the category instead of three memorised lists.

The fixtures demonstrate it directly: **the same installation that fails as a furnace** (missing trap,
4 ft connector) **passes as a dryer**. The fuzzer separates the two overlapping ideas by pinning that
`illuminating`, `decorative-vented`, `gas-fireplace`, and `outdoor-grill` are trap-exempt but *not*
movable, so they keep the 3 ft connector limit.

**Two details stated rather than assumed.** The shutoff must be **upstream** of the union or connector,
because a valve downstream cannot isolate the connector -- the component most likely to fail and most
likely to be replaced. And the trap must be **downstream** of the shutoff: a drip leg on the wrong side
protects nothing once the valve is closed for service, and it photographs as correct.

## 3. Scope

Not checked: whether the connector is listed and of an approved type; connectors passing through walls,
floors, ceilings, or partitions, which is prohibited; reuse of an old connector, which is not permitted;
the size and pressure of the piping feeding the valve; clearances, venting, and combustion air; CSST
bonding; leak testing; and fuel and altitude approval.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `gas-appliance-demand`,
`gas-pipe-sizing`, and `combustion-air`. `check-module-sizes` cap for calc-gas.js raised 12000 -> 16000. Fuzzer pins both fixtures, the movable category across all three
rules, that the four other exempt types are trap-exempt but keep the 3 ft limit, that a built-in trap
satisfies 408.4 without the type being exempt, each shutoff condition failing independently, both
connector seams, that a zero length means hard-piped rather than a failure, that the verdict is the
conjunction with `null`s not counting against it, and every error seam.
