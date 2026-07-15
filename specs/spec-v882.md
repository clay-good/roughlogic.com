# roughlogic.com Specification v882 -- Work-Zone Merging Taper Length and Device Count (MUTCD) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v881.md. Traffic-control sweep, beside the paving and
> striping tiles.
>
> **The gap, and the evidence for it.** Nothing lays out a **work-zone merging taper** -- the MUTCD taper length for a
> lane closure and the channelizing devices it takes. Grep confirmed no taper tile. The MUTCD formula is public. The number
> this settles: closing a 12 ft lane at 55 mph needs a **660 ft** taper and about **18 cones** at 40 ft spacing -- and at
> 30 mph the taper shortens to **180 ft** because the low-speed branch of the formula uses the speed squared, not the
> speed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E site
siblings: the offset width and device spacing carry `L`, the speed `L T^-1`, the taper length `L`, and the device count is
dimensionless. The v18/v21 contract: a non-finite or non-positive offset width, speed, or device spacing returns
`{ error }`. Citation discipline (v19/v22): the MUTCD merging-taper identity by name (for 40 mph or less, L = W x S^2 / 60;
for 45 mph or more, L = W x S; devices = ceil(L / spacing) + 1), `GOVERNANCE.general`; the note states that the formula is
the public-domain MUTCD relation, that W is the lateral offset (the lane width for a full-lane closure), that the low-speed
and high-speed branches are a deliberate step in the formula (a longer taper at higher speed), that the channelizing-device
spacing in a taper is roughly the speed in feet (entered here), and that shifting, shoulder, and downstream tapers use
fractions of L per the MUTCD.

## 2. The tile

### 2.1 `traffic-taper-length` -- Work-Zone Merging Taper Length and Device Count (MUTCD)

```
inputs:
  offset_width_ft   lateral offset / lane width (ft, default 12)
  speed_mph         posted / operating speed (mph)
  device_spacing_ft channelizing device spacing in the taper (ft, default 40)

taper_length_ft = speed_mph <= 40 ? offset_width_ft * speed_mph^2 / 60 : offset_width_ft * speed_mph
devices         = ceil(taper_length_ft / device_spacing_ft) + 1
```

**Pinned worked example.** Offset 12 ft, speed 55 mph, device spacing 40 ft:
55 mph is in the high-speed branch, so `L = 12 * 55 = ` **660 ft**; `devices = ceil(660/40) + 1 = ` **18**. Cross-check: at
30 mph the low-speed branch gives `L = 12 * 30^2 / 60 = 12 * 15 = ` **180 ft** and `ceil(180/40)+1 = ` **6 devices** --
the same lane, far less taper, because low speed uses the squared-speed formula.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` construction block near
`striping-paint-quantity`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (L = W S^2/60 for S<=40, W S for S>=45 [MUTCD], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned high-speed example plus the low-speed cross-check);
`test/fixtures/compute-map.js` (`traffic-taper-length` -> `computeTrafficTaperLength`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `striping-paint-quantity` / `asphalt-paving-speed` /
`ada-ramp-slope`); `data/search/aliases.json` (5 collision-checked aliases: "work zone taper length", "mutcd taper",
"merging taper cones", "lane closure taper", "traffic taper devices"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the taper length (both
speed branches) and device count and the error seams (non-positive offset, speed, spacing). The calc-construction.js gzip
cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent
from home first paint. Home tile count 1,330 -> 1,331.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(12 * 55 -> 660 ft, 18 devices).

## 5. Roadmap position

Traffic-control tile beside the paving and striping tiles, serving the traffic-control technician and paving crew
(construction / surveying). Stays evidence-driven; the MUTCD and the agency traffic-control plan govern.
