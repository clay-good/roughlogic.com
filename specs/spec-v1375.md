# roughlogic.com Specification v1375 -- LED Wall Data Rate and Processor Port Count (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N sizes an LED video wall's panel count and power but not its data. Pixel count times bit depth times refresh rate is the number that decides how many processor output ports the wall needs and whether a single sending card can carry it, and getting it wrong is discovered at load-in when a section of the wall is dark.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive pixel dimension, bit depth, refresh rate, or port capacity, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the uncompressed video data-rate relation and the per-port pixel capacity convention used by LED processors, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `video-wall-data-rate` -- LED Wall Data Rate and Processor Port Count

```
total pixels  = width px x height px
data rate     = total pixels x bit depth x 3 channels x refresh / 1e9   (Gbps)
ports needed  = ceil(total pixels / pixels per port)
pixels/port   = port capacity at the wall's refresh rate
```

An LED wall's processor budget is counted in pixels per output port, not in resolution. A gigabit sending-card
port carries a fixed pixel budget -- commonly around 650,000 pixels at 60 Hz, and proportionally fewer as refresh
rate or bit depth rises -- and the wall is divided among however many ports that takes. The consequence is that
two walls with the same physical size but different pixel pitches need very different amounts of processing, and
the finer wall may need a second processor entirely.

The data-rate line is the sanity check on the source side: it tells you whether the incoming signal format can
actually carry the wall. Three channels at eight bits and 60 Hz over a UHD raster is right at the edge of what a
single HDMI 2.0 or 12G-SDI link will pass, and moving to 10-bit or to a higher refresh crosses it.

**Inputs:** wall width and height in pixels (or panel dimensions and count with the panel's pixel resolution),
bit depth per channel, refresh rate (Hz), pixels per processor port.

**Outputs:** total pixels, uncompressed data rate (Gbps), processor ports required, and the spare pixel capacity
on the last port.

## 3. Worked example

A wall built out to 3,840 x 2,160, 8-bit color, 60 Hz, on ports rated 650,000 pixels each:

```
total pixels = 3,840 x 2,160            = 8,294,400
data rate    = 8,294,400 x 24 x 60 / 1e9 = 11.94 Gbps
ports        = ceil(8,294,400 / 650,000) = 13 ports
```

Thirteen ports is more than one sending card carries, so this wall needs two -- and that is a fact about the
processor, not about the panels, which is why it is missed when the wall is quoted by panel count. The 11.94 Gbps
also says the source link has no headroom: move to 10-bit and the rate goes to 14.93 Gbps and the single-link
source format has to change.

## 4. Scope and non-goals

Uncompressed raster arithmetic. It does not account for the blanking overhead in a real video link, which adds
roughly 20% to the wire rate, for compressed or chroma-subsampled transport, or for the redundancy and backup
paths a show-critical wall should carry. Pixels per port is a manufacturer figure that falls as bit depth,
refresh rate, and scan rate rise -- take it from the processor's own table for the configuration in use, not from
the headline number. It does not size power, structure, or rigging, all of which the catalog handles separately.
The processor and panel manufacturers govern.
