# roughlogic.com Specification v996 -- Guy-Wire / Down-Guy Tension and Mast Download (calc-rigging.js, Group Z, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v995.md. Beside `reeving-parts-of-line`,
> `tagline-force`, and `block-redirect-load`.
>
> **The gap, and the evidence for it.** The catalog has sling-leg tension (a vertical lifted load) and highline sag
> (`spanline-sag-tension`), but nothing for a straight guy resisting a horizontal load on a mast -- the lineman /
> tower / sign-installer statics. Grep confirmed no guy-wire tile. The number this settles, and the one that surprises:
> a 500 lb horizontal load on a 45-degree guy needs **707 lb** of guy tension and stacks **500 lb** of download on the
> mast.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, lb and degrees from lb and feet), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive load,
attachment height, or anchor lead returns `{ error }`. Citation discipline (v19/v22): guy-wire / down-guy statics by
name (engineering statics; NESC / RUS Bulletin 1724E for utility work), `GOVERNANCE.general`; the note stresses that the
guy tension always exceeds the load and climbs as the guy steepens, that the guy adds a mast download (and equal anchor
uplift), and that this is single-guy statics -- the pole class, anchor capacity, guy grade, and the engineer or NESC /
RUS govern.

## 2. The tile

### 2.1 `guy-wire-tension` -- Guy-Wire / Down-Guy Tension and Mast Download

```
inputs:
  horizontal_load_lb    horizontal load at the top (lb), default 500
  attachment_height_ft  guy attachment height on the mast (ft), default 20
  anchor_lead_ft        horizontal anchor lead distance (ft), default 20

theta            = atan(attachment_height_ft / anchor_lead_ft)   [guy angle above horizontal]
guy_tension_lb   = horizontal_load_lb / cos(theta)
mast_download_lb = horizontal_load_lb x tan(theta)   [= anchor_uplift_lb]
```

**Pinned worked example.** 500 lb horizontal load, guy attached 20 ft up, anchored 20 ft out: `theta = atan(20/20) = `
**45 deg**; `tension = 500 / cos45 = ` **707 lb**; `download = 500 x tan45 = ` **500 lb**. Cross-check: a steep guy,
800 lb load, 30 ft up, 15 ft lead: `theta = atan(30/15) = ` **63.4 deg**; `tension = ` **1,789 lb**; `download = ` **1,600
lb** -- steepening the guy drives both up sharply.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`, beside `reeving-parts-of-line`); a `tile-meta.js` `_TILES`
entry (`Z`); a `citations.js` entry (guy-wire statics / NESC / RUS, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 45-degree base plus the steep-guy cross-check, pinning the angle, tension, and
download); `test/fixtures/compute-map.js` (`guy-wire-tension` -> `computeGuyWireTension`, module
`../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `tagline-force` / `sling-angle` / `block-redirect-load`);
`data/search/aliases.json` (5 collision-checked aliases: "guy wire", "guy tension", "down guy", "mast guy", "guy
anchor"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `RIGGING_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-rigging declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the tension-exceeds-load and steeper-guy directions, and the error
seams. The calc-rigging.js gzip cap and the Group Z group shell are watched at build (cap raised for this tile). Home
tile count 1,444 -> 1,445.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500 lb / 20 ft / 20 ft -> 707 lb, 500 lb).

## 5. Roadmap position

Guyed-mast rigging beside `reeving-parts-of-line`, serving the lineman / tower / sign installer (rigging). Deliberately
the single-guy statics screen; a real installation balances multiple guys, the mast's own wind and weight, and guy
pretension, and the pole class, anchor capacity, guy grade, and the engineer or NESC / RUS govern. Stays
evidence-driven. Continues the rigging sweep at 1 new spec (v996).
