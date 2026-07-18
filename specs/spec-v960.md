# roughlogic.com Specification v960 -- Duct Static Regain at a Velocity Decrease (calc-metalair.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v959.md. Duct-design sweep, beside the accepted
> `duct-velocity-pressure` and `duct-transition-length` tiles.
>
> **The gap, and the evidence for it.** The catalog gives velocity pressure and transition length, but nothing computes
> the static REGAIN when air slows at a size increase -- the basis of the static-regain duct-design method. Grep
> confirmed no regain tile. The number this settles: dropping 2,000 to 1,500 fpm at a 0.75 recovery factor regains about
> **0.082 in w.c.**

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since VP mixes fpm and in w.c.), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive velocity,
or a recovery factor outside 0-1 returns `{ error }`; a velocity increase gives a negative regain (a static loss),
FLAGGED, not an error. Citation discipline (v19/v22): the static-regain method and the standard-air velocity-pressure
constant by name (SMACNA / ASHRAE), `GOVERNANCE.general`; the note states that VP = (V/4005)^2 for standard air (so
altitude/temperature shift the 4005), that the recovery factor R (~0.75, 0.5-0.9) depends on the fitting, and that
SMACNA/ASHRAE and the engineer of record govern the design.

## 2. The tile

### 2.1 `duct-static-regain` -- Duct Static Regain at a Velocity Decrease

```
inputs:
  upstream_velocity_fpm    upstream (higher) velocity (fpm), default 2000
  downstream_velocity_fpm  downstream (lower) velocity (fpm), default 1500
  recovery_factor          static-regain recovery factor R (0-1, ~0.75), default 0.75

vp_upstream_inwc   = (upstream_velocity_fpm / 4005)^2
vp_downstream_inwc = (downstream_velocity_fpm / 4005)^2
static_regain_inwc = recovery_factor x (vp_upstream_inwc - vp_downstream_inwc)   [negative = static loss]
```

**Pinned worked example.** 2,000 -> 1,500 fpm at R = 0.75: `VP_up = (2000/4005)^2 = ` **0.2494 in**, `VP_dn = (1500/
4005)^2 = ` **0.1403 in**, so static regain = `0.75 x (0.2494 - 0.1403) = ` **0.0818 in w.c.** recovered. Cross-check: a
velocity INCREASE (1,500 -> 2,000 fpm) returns **-0.0818 in w.c.** -- a static LOSS, not a regain (flagged).

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["sheet-metal", "hvac"]`, beside `duct-velocity-pressure`); a `tile-meta.js`
`_TILES` entry (`C`); a `citations.js` entry (static-regain / SMACNA / ASHRAE, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the regain example plus the velocity-increase loss cross-check, pinning the VPs and regain);
`test/fixtures/compute-map.js` (`duct-static-regain` -> `computeDuctStaticRegain`, module `../../calc-metalair.js`);
`scripts/related-tiles.mjs` (-> `duct-velocity-pressure` / `duct-static-pressure-total` / `duct-transition-length`);
`data/search/aliases.json` (5 collision-checked aliases: "static regain", "duct regain", "velocity pressure regain",
"static pressure recovery", "regain method"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`METALAIR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-metalair declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the VPs and regain, the velocity-increase loss flag, the recovery-factor
linearity, the equal-velocity zero, and the error seams. The calc-metalair.js gzip cap and the Group C group shell are
watched at build. Home tile count 1,408 -> 1,409.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2,000 -> 1,500 fpm / R 0.75 -> 0.082 in w.c.).

## 5. Roadmap position

Duct design beside `duct-velocity-pressure`, serving the sheet-metal / HVAC designer (sheet-metal / hvac). Deliberately
the single-transition regain; the recovery factor depends on the fitting, the 4005 constant assumes standard air, and
SMACNA/ASHRAE and the engineer of record govern the full static-regain sizing. Stays evidence-driven. Continues the
duct-design sweep at 1 new spec (v960).
