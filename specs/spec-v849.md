# roughlogic.com Specification v849 -- Cable Reel Capacity / Length on Reel (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v848.md. Electrical install-ops sweep, beside
> `pulling-tension` and `conduit-fill`.
>
> **The gap, and the evidence for it.** The catalog fills conduits and trays but nothing gives the **cable reel capacity**
> -- how many feet of a given cable fit on a reel, or how much is left on a partial reel from the buildup. Grep confirmed
> no reel / reel-capacity tile. The number this settles: a 30 in flange, 12 in drum, 18 in wide reel holds about **801 ft**
> of 1 in cable, and a fatter 1.5 in cable drops that to **356 ft** -- the figure that tells the crew whether the pull is
> on one reel or two.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
electrical siblings (`pulling-tension`, `conduit-fill`): the flange, drum, traverse, and cable diameters carry `L`, the
fill factor is dimensionless, and the length carries `L`. The v18/v21 contract: a non-finite or non-positive flange
diameter, traverse width, cable OD, or fill factor returns `{ error }`; a drum diameter at or above the flange (a
non-positive winding annulus) returns `{ error }`. Citation discipline (v19/v22): the reel-capacity identity by name
(length = fill x pi x (flange^2 - drum^2) x traverse / (48 x cable_OD^2), lengths in inches, result in feet),
`GOVERNANCE.general`; the note states that the fill factor accounts for imperfect winding (about 0.85-0.9), that the same
relation works backward to read the length left on a partial reel from the measured buildup, and that the reel dimensions
come from the reel and the cable OD from the cable.

## 2. The tile

### 2.1 `cable-reel-capacity` -- Cable Reel Capacity / Length on Reel

```
inputs:
  flange_dia_in    reel flange diameter (in)
  drum_dia_in      drum / hub diameter (in)
  traverse_width_in inside width between flanges (in)
  cable_od_in      cable outside diameter (in)
  fill_factor      winding fill factor (dimensionless, default 0.9)

length_ft = fill_factor * PI * (flange_dia_in^2 - drum_dia_in^2) * traverse_width_in / (48 * cable_od_in^2)
```

**Pinned worked example.** Flange 30 in, drum 12 in, traverse 18 in, cable OD 1 in, fill 0.9:
`length = 0.9 * PI * (900 - 144) * 18 / (48 * 1) = 0.9 * 890.6 = ` **801 ft**. Cross-check: a fatter 1.5 in cable divides
by `1.5^2 = 2.25`, giving `0.9 * PI * 756 * 18 / (48 * 2.25) = ` **356 ft** -- the cable OD enters squared, so a half-inch
fatter cable cuts the reel to less than half.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "low-voltage"]`, inside the `// Group A` electrical block near
`pulling-tension`) -- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a
`citations.js` entry (length = fill x pi (F^2 - D^2) W / (48 OD^2), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the fatter-cable cross-check); `test/fixtures/compute-map.js`
(`cable-reel-capacity` -> `computeCableReelCapacity`, module `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `pulling-tension` / `conduit-fill` / `cable-tray-fill`); `data/search/aliases.json` (5 collision-checked aliases:
"cable reel capacity", "length on a reel", "wire reel footage", "reel cable length", "cable spool capacity"); a
hand-written renderer in the `ELECTRICAL_RENDERERS` map mirroring a simple output renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the reel length and the error seams (non-positive flange, traverse, cable OD, fill; drum >= flange). The calc-electrical.js
gzip cap is watched at build (near its cap -- see the module-size ledger). Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,297 -> 1,298.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build
(watch calc-electrical.js -- near cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read
to the value (0.9 * PI * (900-144) * 18 / 48 -> 801 ft).

## 5. Roadmap position

Opens the electrical install-ops vein beside `pulling-tension` and `conduit-fill`, serving the electrician and lineman
(electrical / low-voltage). Stays evidence-driven; the reel and cable dimensions govern.
