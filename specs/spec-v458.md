# roughlogic.com Specification v458 -- Structured Cabling Channel Length (TIA-568) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-04). Third and final tile of the low-voltage systems trio (v456 camera lens FOV -> v457
> ceiling speaker coverage -> v458 structured cabling channel). `fiber-loss-budget` and `poe-budget` cover optical loss and
> power; the copper channel has a hard physical-length budget -- 90 m horizontal, 100 m channel -- with a temperature
> de-rating that no tile checks.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A TIA-568 balanced-twisted-pair channel is limited to a
> `90 m` permanent link (the horizontal run) plus up to `10 m` of patch and equipment cords, for a `100 m` channel total.
> Above `20 deg C` the insertion loss rises, so the maximum permanent-link length de-rates (about `0.4%` per deg C for UTP).
> `fiber-loss-budget` and `poe-budget` do not check the physical length. This adds the channel tile to the existing
> **`calc-lowvoltage.js`** module (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v457.md.
>
> **The gap, and the evidence for it.** An `85 m` permanent link with `8 m` of cords makes a `93 m` channel, which passes at
> `20 deg C` (`85 <= 90` and `93 <= 100`). Run that same link through a `40 deg C` ceiling plenum and the de-rated maximum
> permanent link falls to `90 * (1 - 0.004 * 20) = 82.8 m`, so the `85 m` run now fails and must be shortened or re-routed.
> No tile does this; an installer had the loss and power tiles but not the length-and-temperature check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The permanent link, cords,
channel, and de-rated maximum are lengths (m); the temperature is a temperature (deg C, handled dimensionlessly). The
v18/v21 contract: any non-finite input, or a non-positive permanent link, or negative cords, returns `{ error }`; the tile
de-rates the `90 m` maximum permanent link above `20 deg C`, and reports the channel length and pass/fail against both the
de-rated permanent-link limit and the `100 m` channel limit. Citation discipline (v19/v22): `GOVERNANCE.general` over the
TIA-568 channel length by name; `editionNote` names **ANSI/TIA-568.2-D, the `90 m` permanent-link and `100 m` channel
limits, the up-to-`10 m` patch/equipment-cord allowance, and the temperature de-rating of the maximum permanent link above
`20 deg C` (about `0.4%` per deg C for UTP, `0.2%` for screened, to `40 deg C`)**, and states that **this returns the channel
length check, that patch cords longer than `10 m` further reduce the horizontal allowance, and that it is a design aid, not
a substitute for a certification test (permanent-link/channel).**

## 2. The tile

### 2.1 `structured-cabling-channel` -- Structured Cabling Channel Length (TIA-568)

```
inputs:
  permanent_link_m   m    horizontal permanent-link length
  cords_m            m    total patch + equipment cord length
  temp_c             C    installed cable temperature (default 20)
  derate_per_c       -    de-rate per deg C above 20 (default 0.004 UTP)

max_pl = 90 * (1 - max(temp_c - 20, 0) * derate_per_c)
channel = permanent_link_m + cords_m
pl_ok   = permanent_link_m <= max_pl
chan_ok = channel <= 100
```

**Pinned worked example (85 m link, 8 m cords, 20 deg C).** channel `93 m`; de-rated max PL `90 m`; `85 <= 90` and
`93 <= 100` -> **passes**. **Cross-check (a hot plenum fails it).** At `40 deg C` the max permanent link de-rates to
`90 * (1 - 0.004*20) = 82.8 m`, so the `85 m` link now **fails** and must be shortened. A non-positive link or negative
cords takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, beside `fiber-loss-budget` / `poe-budget`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ANSI/TIA-568.2-D, `editionNote` naming the 90/100 m limits,
the cord allowance, and the temperature de-rating); `test/fixtures/worked-examples.json` (the passing example + the hot-
plenum cross-check); `test/fixtures/compute-map.js` (`structured-cabling-channel` -> `computeStructuredCablingChannel` in
`../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `fiber-loss-budget` / `poe-budget` / `lv-dc-drop` /
`camera-lens-fov`); `data/search/aliases.json` ("structured cabling", "tia 568", "cat6 length", "permanent link length",
"channel length", "90 meter rule", "100 meter cabling", "ethernet cable length", "horizontal cabling"); the id appended to
the existing low-voltage renderers block in `app.js`; the `// dims:` annotation (lengths length, temp/derate
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the temperature
de-rating, and the non-positive / non-finite error seams. No new module; re-pin `calc-lowvoltage.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the de-rating, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the channel / pass output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (85 m link, 8 m cords -> 93 m channel, pass).

## 5. Roadmap position

Closes the low-voltage systems trio: v456 the camera lens, v457 the speaker grid, and v458 the cabling channel. A
patch-cord-length-adjustment of the horizontal allowance and a Cat6A-vs-Cat6 bandwidth-length companion are the deliberate
next follow-ons.
