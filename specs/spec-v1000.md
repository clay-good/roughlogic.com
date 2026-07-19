# roughlogic.com Specification v1000 -- Desired Dough Temperature (Mixing Water) (calc-kitchen.js, Group O, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`** (Group O),
> no new module, group, or dependency. Inherits spec.md through spec-v999.md. Beside `bakers-percentage` and
> `recipe-scale`.
>
> **The gap, and the evidence for it.** `bakers-percentage` handles dough FORMULATION by weight, but nothing computes
> the mixing-WATER temperature to hit a target dough temperature -- the calculation a baker runs before every mix. Grep
> confirmed no DDT tile. The number this settles: a 75 F target dough with 68 F flour and a 72 F room needs **61 F**
> water.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, F from F), bounds-fuzzer, worked-example registry, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive desired dough temperature, or a
negative friction factor returns `{ error }`. Citation discipline (v19/v22): the DDT mixing-water calculation by name
(Hamelman, Bread; Bread Bakers Guild / SFBI), `GOVERNANCE.general` (matching the other formulation tiles); the note
explains the 3-factor vs 4-factor forms, the friction factor (~0-5 F hand, ~24-30 F spiral, measured per mixer), and
the below-freezing ice case, and stresses that the measured friction factor and the finished-dough reading govern.

## 2. The tile

### 2.1 `dough-water-temperature` -- Desired Dough Temperature (Mixing Water)

```
inputs:
  desired_dough_temp_f  target finished dough temp DDT (F), default 75
  flour_temp_f          flour temperature (F), default 68
  room_temp_f           room temperature (F), default 72
  friction_factor_f     mixer friction factor (F), default 24
  preferment_temp_f     preferment temperature (F, 0 = none), default 0

factor_count = preferment_temp_f > 0 ? 4 : 3
water_temp_f = desired_dough_temp_f x factor_count - (flour_temp_f + room_temp_f + friction_factor_f + [preferment if used])
```

**Pinned worked example.** 3-factor: DDT 75, flour 68, room 72, friction 24: `water = 75 x 3 - (68 + 72 + 24) = 225 -
164 = ` **61 F**. Cross-check 4-factor (with a preferment): DDT 78, flour 65, room 70, preferment 74, friction 26:
`water = 78 x 4 - (65 + 70 + 74 + 26) = 312 - 235 = ` **77 F**.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen"]`, beside `bakers-percentage`); a `tile-meta.js` `_TILES` entry
(`O`); a `citations.js` entry (Hamelman / BBGA DDT method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 3-factor base plus the 4-factor cross-check, pinning the water temp and
factor count); `test/fixtures/compute-map.js` (`dough-water-temperature` -> `computeDoughWaterTemperature`, module
`../../calc-kitchen.js`); `scripts/related-tiles.mjs` (-> `bakers-percentage` / `recipe-scale` /
`sous-vide-pasteurization`); `data/search/aliases.json` (5 collision-checked aliases: "dough temperature", "dough water
temp", "desired dough temperature", "ddt baking", "mixing water temp"), then `node scripts/build-alias-shards.mjs`; the
tile is rendered by the `_r` factory in the `KITCHEN_RENDERERS` map, and the id added to the calc-kitchen declare list
in `app.js`; the `// dims:` annotation directly above the compute; the Group O citation-coverage audit count bumped;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
friction / room directions, the below-freezing ice flag, and the error seams. The calc-kitchen.js gzip cap and the
Group O group shell are watched at build (cap raised for the culinary discovery batch). Home tile count 1,448 -> 1,449.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group O count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(75 x 3 - 164 -> 61 F).

## 5. Roadmap position

Baking beside `bakers-percentage`, serving the baker (kitchen). Deliberately the working setpoint; the measured
friction factor for the specific mixer and batch, and the baker's finished-dough temperature reading, govern. Stays
evidence-driven. Continues the culinary sweep at 1 new spec (v1000).
