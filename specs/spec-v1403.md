# roughlogic.com Specification v1403 -- Chip Load, Feed Rate, and Radial Chip Thinning (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes cutting speed and material removal rate but not the number a machinist actually programs: inches per minute, from chip load, flute count, and RPM. And it stops short of the correction that matters most on modern toolpaths -- radial chip thinning, which makes a light radial cut require a *higher* programmed feed than the chip load implies, not a lower one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive cutter diameter, flute count, chip load, or surface speed, or a radial engagement at or above the cutter diameter, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the feed relation IPM = RPM x flutes x chip load and the radial chip-thinning factor D / (2 sqrt(D ae - ae^2)), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `chip-load-feed-rate` -- Chip Load, Feed Rate, and Radial Chip Thinning

```
RPM              = 3.82 x SFM / diameter
programmed IPM   = RPM x flutes x chip load
chip thinning    = D / (2 sqrt(D x ae - ae^2))     for radial engagement ae < D/2
adjusted IPM     = programmed IPM x chip thinning
```

The first two lines are the ordinary feed calculation and every machinist knows them. The third is the one that
separates a conservative program from a good one.

When a cutter engages less than half its diameter radially, the chip it produces is thinner than the programmed
feed per tooth, because the tooth enters and exits the material over a short arc and never reaches full chip
thickness. Running the nominal chip load in that condition means the actual chip is too thin -- the tool rubs
instead of cutting, heat goes into the edge instead of into the chip, and the tool wears out faster than it would
at a heavier feed. The fix is counterintuitive: *increase* the programmed feed by the chip-thinning factor to
restore the real chip thickness. This is the whole basis of high-efficiency and trochoidal milling, where a 10%
radial engagement runs at very high feed rates.

**Inputs:** cutter diameter (in), number of flutes, chip load per tooth (in), surface speed (SFM), radial
engagement (in).

**Outputs:** RPM, programmed feed rate before correction, chip-thinning factor, corrected feed rate, and the
actual chip thickness at the nominal feed.

## 3. Worked example

A 0.500 in four-flute carbide end mill at 400 SFM, 0.003 in chip load, taking a 0.050 in radial cut (10% of
diameter):

```
RPM             = 3.82 x 400 / 0.500          = 3,056 RPM
programmed IPM  = 3,056 x 4 x 0.003           = 36.7 IPM
chip thinning   = 0.500 / (2 sqrt(0.5 x 0.05 - 0.05^2)) = 0.5 / 0.30 = 1.667
adjusted IPM    = 36.7 x 1.667                = 61.1 IPM
```

Sixty-one inches a minute instead of thirty-seven -- a two-thirds increase in feed, at the same spindle speed and
the same real chip thickness, simply by acknowledging what the geometry is doing. Run it at 36.7 IPM and the
actual chip is 0.0018 in, thin enough on many materials to rub and work-harden. Note that the correction only
applies below half-diameter engagement; at `ae = D/2` the factor is exactly 1.0 and above it there is no thinning
at all.

## 4. Scope and non-goals

Radial chip thinning only. Axial chip thinning applies separately to ballnose and high-feed cutters and is a
different correction that this tile does not perform. The corrected feed must still be checked against spindle
power, machine feed-rate limits, tool deflection, and fixture rigidity -- chip thinning permits a higher feed, it
does not guarantee the machine can deliver it, and on a light machine deflection will govern first. Chip load
values come from the tool manufacturer for the specific material and must be adjusted for depth of cut and tool
stickout. The tool manufacturer's data and the machinist govern.
