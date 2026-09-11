# roughlogic.com Specification v1820 -- Trend Log Sample Interval and Point Storage (`calc-controls.js`, Group C HVAC, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Trend data volume is the point count times the sampling rate times the retention, and all three get chosen casually. The number that actually bites first is not the archive size, it is the controller's own buffer, which overruns between polls and loses data nobody notices.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive point count, sample interval, retention period, bytes per sample, or buffer depth returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the trend volume and buffer fill relations with the controller and historian manufacturers' documentation named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`trend log storage sizing`, `bacnet trend buffer overrun`, `point count sample interval retention`, `cov reporting data volume`, `building automation historian size`.

## 2. The tile

### 2.1 `trend-log-storage` -- Trend Log Sample Interval and Point Storage

```
samples          points x (60 / interval in minutes) x 24 x 365 x years
storage          samples x bytes per sample; a timestamp, a value, and a status
                 flag is commonly 12 to 24 bytes before any index or compression
interval          a 15 minute interval is standard for energy analysis, 5 minutes
                 for fault detection, 1 minute or faster for control diagnosis
retention         energy work wants two years to compare like seasons; commissioning
                 and diagnostics want weeks
change of value  log only when the value moves by more than a deadband; enormous
                 for binary and status points, modest for noisy analogue ones
controller buffer the real constraint: a field controller holds a limited number of
                 samples and OVERWRITES them once full
poll interval     the archive must collect faster than the buffer fills, or the
                 gap is silent -- the trend looks continuous and is not
```

Storage is cheap and attention is not, which is why trend systems fail by collecting too much rather than too
little. A site that logs every point at a fast interval forever accumulates a dataset nobody queries, on a
server nobody sized, and the volume itself becomes the reason the data is eventually purged. Choosing the
interval from the question being asked -- energy, fault detection, or control tuning -- is what keeps a trend
system useful.

The buffer overrun is the failure that actually causes trouble and it leaves no trace. A field controller
holds a fixed number of samples and wraps when it is full, so if the supervisory poll is slower than the fill
rate, the oldest samples are discarded before they are collected. The archive receives a continuous-looking
series with gaps in it, the trend plots as a line because the graph joins the points it has, and any analysis
built on it is quietly wrong.

Change-of-value logging is the right tool for the right point and not a general answer. A binary status that
changes a few times a day compresses by orders of magnitude; a noisy analogue input crossing a small deadband
can generate more records than periodic sampling would. Applied without a sensible deadband on each point,
change-of-value can increase the data volume it was adopted to reduce.

**Inputs:** the point count, the sample interval, the retention period, the bytes per sample, the controller's point count and buffer depth, the archive poll interval, and a change-of-value rate per point per day

**Outputs:** the samples per point per year, the total samples and storage volume, the volume at a faster interval, the controller's sample rate and the time its buffer takes to fill, the maximum archive poll interval, and the volume under change-of-value logging

## 3. Worked example

A site of 5,000 points logged every 5 minutes and kept 2 years:

```
per point per year = 60/5 x 24 x 365 = 105,120 samples
total              = 5,000 x 105,120 x 2 = 1,051,200,000 samples
storage at 16 B  = 16.8 GB
```

**17 GB is not a problem on any modern server.** At a one-minute interval it is 84 GB, which is still
manageable -- **storage is rarely what stops a trend system.**

**This is:**

```
a controller with 200 points at 5 min = 2,400 samples per hour
buffer depth 1,000 samples
fills in 1,000 / 2,400 h = 25 minutes
```

**25 minutes.** If the supervisory archive polls this controller hourly -- a completely ordinary setting --
**58% of every hour's data is overwritten before it is collected**, and nothing reports an error. The
archive receives samples, the trend graph draws a line through them, and the line is joining points across
gaps that are not marked.

**The poll interval has to be shorter than the fill time**, which means the buffer depth and the point count on
each controller are what set it -- not a preference, and not the same number for every controller on the site.

**Change of value helps where the point suits it.** At 100 changes per point per day:

```
5,000 x 100 x 365 x 2 = 365,000,000 samples = 5.8 GB
```

**a 65 percent reduction** -- and it is a reduction only because 100 changes a day is fewer than the
288 periodic samples a day. **A noisy analogue point crossing a small deadband can easily exceed that**, and
change-of-value applied without a deadband chosen per point increases the volume it was adopted to reduce.

## 4. Scope and non-goals

A sizing estimate. Bytes per sample is entered and varies widely with the historian: a compressed columnar time-series store can be a small fraction of the naive figure while a relational table with indexes can be several times it, so the volume here is an order-of-magnitude planning number rather than a disk requirement. It does not address database indexing, retention policies and roll-up or downsampling of older data, backup volume, or the query performance that actually determines whether a historian is usable. Controller buffer depths, whether the buffer wraps or stops, and whether the controller signals a buffer-full condition are product-specific and must come from the manufacturer's documentation; some implementations do notify and some do not. It does not address network bandwidth on the field bus (`mstp-segment-loading`), the effect of trend polling on controller processor load, or time synchronisation across controllers, which is what makes trends from different devices comparable at all. It does not select which points to trend or what interval a given analysis needs. The controller and historian manufacturers' documentation and the controls engineer govern.
