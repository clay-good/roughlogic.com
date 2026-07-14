# roughlogic.com Specification v696 -- CCTV Retention Days from Disk Capacity (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A,
> low-voltage / security), no new module, group, or dependency. Inherits spec.md through spec-v695.md.
>
> **The gap, and the evidence for it.** Spec-v28 (`cctv-storage`) runs NVR sizing forward: given camera count, bitrate,
> recording schedule, and a retention target, it returns the disk footage needs. The install question is the inverse --
> **given the disk that's actually in the recorder, how many days of footage does it hold**. From
> `total_storage_GB = cameras x bitrate x 0.45 x hours x days`, `days = disk_GB / (cameras x bitrate x 0.45 x hours)`.
> The number this settles: a **16 TB** NVR with **8 cameras** at **4 Mbps** continuous holds **46 days**; switching those
> cameras to **motion (50% duty)** doubles the recording headroom to **93 days**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`cctv-storage` sibling (all counts, GB, and Mbps are dimensionless bookkeeping in the v14 model). It reuses the sibling's
`0.45 GB/h-per-Mbps` constant and the continuous/motion recording-mode select. To keep the daily-rate geometry in one
place, the compute calls `computeCctvStorage` at `retention_days = 1` and divides the disk capacity by the returned daily
total. The v18/v21 contract: any non-finite input, a non-positive disk capacity, and the sibling's own guards (camera
count < 1, non-positive bitrate, motion duty outside (0, 100]) return `{ error }`. Citation discipline (v19/v22): the NVR
storage relation solved for days, `GOVERNANCE.electrical` matching the sibling; the note states that **the estimate
assumes usable (post-overhead) disk is entered, motion recording scales the hours, and the H.264/H.265 bitrate estimates
are scene- and vendor-specific and user-supplied -- the VMS calculator and the installed cameras govern**.

## 2. The tile

### 2.1 `cctv-retention-days` -- CCTV Retention Days from Disk Capacity

```
inputs:
  disk_capacity_gb     GB    usable NVR disk capacity (> 0)
  camera_count         -     number of cameras (>= 1)
  bitrate_mbps         -     per-camera bitrate (> 0)
  recording_mode       -     continuous (24 h) | motion
  motion_duty_percent  %     motion duty-cycle (0, 100], default 50

hours = 24 (continuous) or 24 x duty/100 (motion)
daily_total_gb = cameras x bitrate x 0.45 x hours
retention_days = disk_capacity_gb / daily_total_gb
```

**Pinned worked example (continuous).** disk = 16,000 GB, 8 cameras, 4 Mbps, 24 h:
`daily = 8 x 4 x 0.45 x 24 = 345.6 GB/day`, `days = 16000 / 345.6 = ` **46.30 days**; feeding 46.30 days back through
`cctv-storage` returns 16,000 GB, the input. **Cross-check (motion).** Same disk and cameras at motion 50% (12 h):
`daily = 172.8 GB/day`, `days = ` **92.59 days** -- half the hours, twice the retention.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `cctv-storage`, which sits past every exact-count
audit range (all end by the v4/v5 group blocks), so no audit-count bump; a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (storage relation solved for days, `GOVERNANCE.electrical` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`cctv-retention-days` ->
`computeCctvRetentionDays`); `scripts/related-tiles.mjs` (-> `cctv-storage` / `camera-lens-fov` / `poe-budget` /
`structured-cabling-channel`); `data/search/aliases.json` (5 collision-checked question aliases: "how many days will my nvr
record", "cctv retention from disk size", ...); the calc-lowvoltage `LOWVOLTAGE_RENDERERS` map entry via a hand-written
renderer with the same recording-mode `makeSelect` as the sibling (the select feeds the compute, satisfying
check-dead-inputs) and the id added to the calc-lowvoltage declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both
examples, the motion-doubles-days check, the round-trip through `computeCctvStorage`, and the error seams. The
calc-lowvoltage.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home
first paint. Home tile count 1,144 -> 1,145.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts for the home
count); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 46.3 days for a 16 TB, 8
camera continuous system).

## 5. Roadmap position

Pairs the forward NVR sizing tile (`cctv-storage`, disk from a retention target) with its inverse (retention from the disk
you have), the two halves of the security-storage question. Further Group A low-voltage growth stays evidence-driven.
