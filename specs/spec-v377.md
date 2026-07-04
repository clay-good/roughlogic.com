# roughlogic.com Specification v377 -- Coil Bypass Factor and Apparatus Dew Point (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the psychrometric coil trio (v375 enthalpy -> v376 total load ->
> v377 bypass factor). Where v375/v376 size the load, this tile describes how completely a real coil reaches its cold
> surface: the bypass factor, the fraction of air that slips past the coil unconditioned, and its complement the contact
> factor.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A coil never brings all the air to its coldest
> surface temperature -- the apparatus dew point (ADP). Some air bypasses the fins untouched. The bypass factor
> `BF = (t_lvg - t_adp) / (t_ent - t_adp)` measures that slip on the dry-bulb line: `BF = 0` is a perfect coil (leaving air
> at the ADP), and a higher `BF` means a shallower coil (fewer rows, higher face velocity) that leaves the air warmer and
> wetter than the ADP. The contact factor is `CF = 1 - BF`. This adds the coil-effectiveness tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v376.md.
>
> **The gap, and the evidence for it.** For air entering at `80 deg F` and leaving at `55 deg F` off a coil whose apparatus
> dew point is `50 deg F`, `BF = (55 - 50) / (80 - 50) = 5/30 = 0.167` and `CF = 0.833` -- a typical 4-row DX coil, about
> 17% bypass. A shallower coil leaving `60 deg F` from `78 deg F` entering at a `52 deg F` ADP gives `BF = 8/26 = 0.308`,
> nearly a third bypassed -- the reason a 2-row coil sweats less and dehumidifies worse. No tile computes bypass or contact
> factor; the catalog has the loads (`shr-latent`, `cooling-coil-total-load`) but not the coil geometry effectiveness that
> sets the leaving state.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The three temperatures are
temperatures (deg F, dim T); the bypass and contact factors are dimensionless. The v18/v21 contract: any non-finite input,
or an entering temperature equal to the ADP (a zero denominator, physically a no-cooling case), returns `{ error }`; the
tile requires the ordering `t_adp <= t_lvg <= t_ent` for a cooling coil and flags a leaving temperature outside the
`[t_adp, t_ent]` band (which would put `BF` outside `[0, 1]`) as a data-entry problem rather than reporting a nonsense
factor. Citation discipline (v19/v22): `GOVERNANCE.general` over the coil bypass factor by name; `editionNote` names
**the coil bypass factor `BF = (t_lvg - t_adp) / (t_ent - t_adp)` on the dry-bulb line, the contact factor `CF = 1 - BF`,
and the apparatus dew point as the effective average coil-surface temperature**, and states that **this returns how
completely the coil conditions the air (0 = perfect contact, higher = more bypass), that a lower `BF` comes from more rows
/ lower face velocity, that the ADP is read from the coil selection or a psychrometric-chart construction, and that it is a
design aid, not a substitute for manufacturer coil ratings**.

## 2. The tile

### 2.1 `coil-bypass-factor` -- Coil Bypass Factor and Apparatus Dew Point

```
inputs:
  t_ent_f   F   entering-air dry-bulb temperature
  t_lvg_f   F   leaving-air dry-bulb temperature
  t_adp_f   F   apparatus dew point (effective coil-surface temperature)

bf = (t_lvg_f - t_adp_f) / (t_ent_f - t_adp_f)     [-]
cf = 1 - bf
```

**Pinned worked example (80 -> 55 deg F off a 50 deg F ADP).** `BF = (55 - 50) / (80 - 50) = 5/30 = 0.167`; `CF = 0.833` --
a typical deep DX coil. **Cross-check (a shallower coil bypasses more).** `78 -> 60 deg F` off a `52 deg F` ADP:
`BF = (60 - 52) / (78 - 52) = 8/26 = 0.308`; `CF = 0.692` -- nearly a third of the air slips by, so it dehumidifies worse.
A leaving temperature below the ADP or above entering, or an entering temperature equal to the ADP, takes the error path
rather than reporting a factor outside `[0, 1]`.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `cooling-coil-total-load` / `shr-latent`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, coil bypass / contact factor, `editionNote` naming
`BF = (t_lvg - t_adp)/(t_ent - t_adp)`, `CF = 1 - BF`, and the apparatus-dew-point definition);
`test/fixtures/worked-examples.json` (the deep-coil example + the shallow-coil cross-check + an out-of-band error case);
`test/fixtures/compute-map.js` (`coil-bypass-factor` -> `computeCoilBypassFactor` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `cooling-coil-total-load` / `moist-air-enthalpy` / `shr-latent` / `apparatus-dew-point`
substitute `wet-bulb-psychrometer`); `data/search/aliases.json` ("coil bypass factor", "bypass factor", "contact factor",
"apparatus dew point", "adp coil", "coil effectiveness", "coil surface temperature", "bf cf coil", "dx coil bypass"); the
id appended to the existing HVAC renderers block in `app.js`; the `// dims:` annotation (temperatures T, factors
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the two examples, the
out-of-band case, and the zero-denominator / non-finite error seams. No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `BF` / `CF` pair wraps on a phone); render-no-nan + a11y
sweep, output read to the value (80 -> 55 off 50 deg F -> BF 0.167, CF 0.833).

## 5. Roadmap position

Closes the psychrometric coil trio: v375 gives the enthalpy state, v376 the total load, and v377 how completely the coil
reaches its cold surface. Together they let a technician move from measured entering/leaving states to a coil load and an
effectiveness read in three chained tiles. A full psychrometric-chart ADP construction from the coil SHR line, and a
row-count-to-bypass-factor lookup, are the deliberate next follow-ons.
