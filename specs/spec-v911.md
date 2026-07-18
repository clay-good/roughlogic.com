# roughlogic.com Specification v911 -- Grinding Wheel Surface Speed and Max Safe RPM (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v910.md. Machinist / grinder-hand shop-safety
> field-check, mirroring the accepted `cutting-speed-rpm` surface-speed precedent and the safety-limit framing of the
> landed `max-wind-speed-for-lift` and `fall-protection-clearance` tiles (apply the published rating; the manufacturer
> governs).
>
> **The gap, and the evidence for it.** The catalog turns surface speed into spindle RPM for cutting (`cutting-speed-rpm`)
> but nothing checks a **grinding wheel** against its rated speed. Grep confirmed no grinding-wheel tile. Every abrasive
> wheel carries a rated maximum operating speed in SFPM on its blotter; a wheel run over it can burst. The number this
> settles: a 7 in wheel rated 6,500 SFPM tops out at **3,547 RPM**, so a 3,450 RPM bench grinder is within rating.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`cutting-speed-rpm` tile: the wheel diameter carries `L`, the rated and actual surface speeds carry `L*T^-1`, and the
RPM values carry `T^-1`. The v18/v21 contract: a non-finite or non-positive wheel diameter, rated speed, or grinder RPM
returns `{ error }`. Citation discipline (v19/v22): the surface-speed identity by name (SFPM = pi x D x RPM / 12;
max_rpm = rated_sfpm x 12 / (pi x D)), `GOVERNANCE.general`; the note states that the wheel blotter's rated maximum SFPM
and the machine nameplate govern, that a wheel must NEVER be mounted on a machine faster than its rating (burst hazard),
that the surface speed at a fixed machine RPM falls as the wheel wears so the full wheel is the governing case, and cites
ANSI B7.1 as the authority.

## 2. The tile

### 2.1 `grinding-wheel-rpm` -- Grinding Wheel Surface Speed and Max Safe RPM

```
inputs:
  wheel_diameter_in  wheel diameter (in)
  rated_max_sfpm     wheel rated max operating speed (SFPM, from the blotter, default 6500)
  grinder_rpm        machine spindle speed (RPM, default 3450)

max_rpm       = rated_max_sfpm x 12 / (pi x wheel_diameter_in)
actual_sfpm   = pi x wheel_diameter_in x grinder_rpm / 12
margin_rpm    = max_rpm - grinder_rpm
within_rating = grinder_rpm <= max_rpm
```

**Pinned worked example.** 7 in wheel rated 6,500 SFPM on a 3,450 RPM grinder:
`max_rpm = 6500 x 12 / (pi x 7) = ` **3,547 RPM**; `actual_sfpm = pi x 7 x 3450 / 12 = ` **6,322 SFPM**; 6,322 <= 6,500
so **WITHIN RATING** (+97 RPM margin). Cross-check: a 10 in wheel rated 9,000 SFPM on a 3,600 RPM machine runs
`pi x 10 x 3600 / 12 = ` **9,425 SFPM** -- over the 9,000 rating, **OVER RATED SPEED** (max_rpm 3,438 < 3,600).

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`, beside `knurl-blank-diameter`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (surface-speed identity, ANSI B7.1, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the over-speed cross-check, pinning max_rpm and
actual_sfpm); `test/fixtures/compute-map.js` (`grinding-wheel-rpm` -> `computeGrindingWheelRpm`, module
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `cutting-speed-rpm` / `gear-mph-rpm` / `hp-from-torque`);
`data/search/aliases.json` (5 collision-checked aliases: "grinding wheel rpm", "grinding wheel speed", "max wheel rpm",
"wheel surface speed", "abrasive wheel speed"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in
the `MACHINING_RENDERERS` map leading with the WITHIN / OVER verdict (non-exported, so no DOM-sentinel dims row), and the
id added to the calc-machining declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the max RPM, surface
speed, verdict, margin sign, and the error seams (non-positive diameter / rating / rpm, non-finite). The calc-machining.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,359 -> 1,360.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(6500 x 12 / (pi x 7) -> 3,547 RPM; a 3,450 RPM grinder is within rating).

## 5. Roadmap position

Machinist / grinder-hand shop-safety field-check beside `cutting-speed-rpm`, serving the machinist / mechanic (machining
/ mechanic). Deliberately applies the published rating; ANSI B7.1, the wheel blotter, and the machine nameplate govern.
Stays evidence-driven. Continues the setup / shop-safety sweep at 1 new spec (v911).
