# roughlogic.com Specification v1454 -- Overhead Line Ground Clearance (NESC Table 232-1) (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Clearance is the reason sag matters, and the arithmetic that connects them is a subtraction nobody writes down: the conductor's height above ground is the attachment height minus the sag at the WORST condition, not at the condition it was strung in. Getting the condition wrong is how a line passes at installation and fails at inspection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive attachment height, a negative sag or required clearance, or a sag at or beyond the attachment height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the clearance subtraction as standard practice with the required value supplied by the adopted NESC edition, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`line ground clearance`, `conductor clearance check`, `nesc clearance margin`, `max allowable sag`, `attachment height for clearance`.

## 2. The tile

### 2.1 `line-ground-clearance-nesc` -- Overhead Line Ground Clearance (NESC Table 232-1)

```
height above ground   C = H_att - S_max
margin                M = C - C_req
max allowable sag     S_allow = H_att - C_req
min attachment height H_min   = C_req + S_max
```

Four numbers, one relation, and the whole difficulty is in choosing `S_max`. NESC checks clearance at the
maximum conductor temperature the line is designed to operate at, or at the final-sag ice condition, whichever
gives the greater sag -- not at 60 degF on the day the crew strung it. A line sagged in spring with a comfortable
margin can be out of compliance at design temperature, and the difference is routinely several feet.

The tile is run four ways from one relation. Given a sag it returns the clearance and the margin. Given a
required clearance it returns the maximum sag the span may be strung to, which is the number a crew wants at the
pole. Given a sag and a requirement it returns the minimum attachment height, which is what sizes the pole. And
the margin is reported signed, so a failing span reads as a negative number of feet rather than a passing-looking
small one.

**No NESC table is shipped.** Required clearance depends on the voltage, what is under the line, and the edition
the jurisdiction has adopted, and the tile takes it as an input for the same reason `pole-embedment-depth` takes
lateral bearing as an input: a table copied into a calculator is a table that goes stale silently.

**Inputs:** attachment height above ground at the low support, maximum-condition sag, and the required clearance for the crossing (entered from the adopted NESC table)

**Outputs:** the conductor height above ground at midspan, the signed margin against the requirement, the maximum allowable sag, the minimum attachment height, and a pass or fail flag

## 3. Worked example

A distribution span attached 42 ft above ground, sagging 11.5 ft at its maximum operating temperature,
crossing a road where the adopted table requires 18.5 ft:

```
C         = 42 - 11.5   = 30.5 ft above ground
M         = 30.5 - 18.5 = +12.0 ft
S_allow   = 42 - 18.5 = 23.5 ft
H_min     = 18.5 + 11.5 = 30.0 ft
```

The span clears by 12.0 ft and could sag another 12.0 ft before it did not. Note what that headroom is worth in
temperature: from the worked example in `conductor-sag-at-temperature`, sixty degrees bought 8.0 ft of sag on a
600 ft span. A 12.0 ft margin is real but it is not large, and a longer span in the same section eats it.

## 4. Scope and non-goals

Midspan clearance over level ground, one span, one conductor, at one stated condition. It does not select
the required clearance, hold an NESC table, or know the adopted edition -- all three are the user's to supply and
the jurisdiction's to govern. It does not check clearance to buildings, signs, other conductors, or communication
attachments, which are separate rules with separate values; it does not check the swung position, which is
`conductor-blowout`; and it does not check clearance at any point other than midspan, which matters over
non-level ground where the low point of the curve and the high point of the ground are not in the same place.
The adopted NESC edition, the AHJ, and the utility's construction standard govern.
