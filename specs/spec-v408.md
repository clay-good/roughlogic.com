# roughlogic.com Specification v408 -- Manual D Friction Rate (Available Static Pressure) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.143.0; proposed 2026-07-03). First tile of an HVAC duct-design trio (v408 Manual D friction rate -> v409 coil face
> velocity -> v410 VAV box airflow). `duct-sizing` and `duct-friction-static` both need a friction rate as an input; this
> tile derives it the ACCA Manual D way -- the available static pressure spread over the total effective length -- so the
> sizing tiles finally have their missing upstream number.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Residential duct sizing starts from a design friction
> rate, and ACCA Manual D computes it, not guesses it: the available static pressure `ASP` is the blower's rated external
> static pressure minus the pressure drops of the coil, filter, registers, grilles, and accessories, and the friction rate
> is `FR = ASP * 100 / TEL`, where `TEL` is the total effective length (the longest supply-plus-return run plus the
> equivalent lengths of its fittings). `duct-sizing` takes `FR` as given; nothing derives it. This adds the friction-rate
> tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v407.md.
>
> **The gap, and the evidence for it.** A blower rated for `0.60 in wg` external static, feeding a coil (`0.24`), filter
> (`0.10`), and registers/grilles (`0.08`) drops, has an available static pressure of `0.60 - 0.42 = 0.18 in wg`. Over a
> total effective length of `180 ft`, the design friction rate is `FR = 0.18 * 100 / 180 = 0.10 in wg per 100 ft` -- the
> healthy target Manual D aims for, and exactly the number `duct-sizing` needs. Under-count the component drops and the
> friction rate comes out too high, so the ducts get sized too small and the system starves. No tile does this derivation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The blower external static and
the component drops are pressures (in wg); the total effective length is a length (ft); the available static pressure is a
pressure (in wg) and the friction rate is a pressure per length (in wg per 100 ft). The v18/v21 contract: any non-finite
input, or a non-positive external static or total effective length, returns `{ error }`; a component-drop sum that exceeds
the blower static (a negative available static) is flagged as an unworkable system rather than returning a nonsense friction
rate, and the tile reports the available static and the friction rate. Citation discipline (v19/v22): `GOVERNANCE.general`
over the Manual D friction rate by name; `editionNote` names **ACCA Manual D, the available static pressure
`ASP = blower ESP - sum(component drops)` (coil, filter, registers, grilles, dampers, accessories), the friction rate
`FR = ASP * 100 / TEL`, and `TEL` the total effective length (longest supply + return run plus fitting equivalent
lengths)**, and states that **this returns the design friction rate that feeds duct sizing, that the component drops come
from the equipment and fitting tables at the design airflow, and that it is a design aid, not a substitute for a full Manual
D duct design**.

## 2. The tile

### 2.1 `manual-d-friction-rate` -- Manual D Friction Rate (Available Static Pressure)

```
inputs:
  blower_esp_inwg   in wg   blower rated external static pressure at design CFM
  component_drop_inwg in wg total component pressure drops (coil + filter + registers + ...)
  tel_ft            ft      total effective length (supply + return run + fitting equivalents)

asp = blower_esp_inwg - component_drop_inwg
fr  = asp * 100 / tel_ft            in wg per 100 ft
```

**Pinned worked example (0.60 ESP, 0.42 drops, 180 ft TEL).** `ASP = 0.60 - 0.42 = 0.18 in wg`;
`FR = 0.18 * 100 / 180 = 0.10 in wg/100 ft` -- a healthy Manual D target. **Cross-check (a longer run softens it).** Stretch
the total effective length to `300 ft` and `FR = 0.18 * 100 / 300 = 0.06 in wg/100 ft`, so the ducts must be larger to hold
the lower rate. A component-drop sum above the blower static flags an unworkable system; the non-positive-length and
non-finite seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `duct-sizing` / `duct-friction-static`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ACCA Manual D, `editionNote` naming the ASP and friction-rate
relations and the TEL definition); `test/fixtures/worked-examples.json` (the 0.10 example + the longer-run cross-check);
`test/fixtures/compute-map.js` (`manual-d-friction-rate` -> `computeManualDFrictionRate` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `duct-sizing` / `duct-friction-static` / `duct-static-pressure-total` / `equivalent-length`);
`data/search/aliases.json` ("manual d friction rate", "available static pressure", "friction rate duct", "ASP hvac",
"total effective length", "acca manual d", "duct design friction rate", "blower external static", "friction rate 0.1"); the
id appended to the existing HVAC renderers block in `app.js`; the `// dims:` annotation (pressures pressure, TEL length,
friction rate pressure/length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the negative-available-static flag, and the non-positive / non-finite error seams. No new module; re-pin `calc-hvac.js` on
the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the unworkable-system flag, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ASP / friction-rate pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (0.60 ESP, 0.42 drops, 180 ft -> 0.10 in wg/100 ft).

## 5. Roadmap position

Opens the HVAC duct-design trio and supplies the friction rate `duct-sizing` needs. `coil-face-velocity` (v409) and
`vav-box-airflow` (v410) size the coil and terminals that the ducted air passes through. A fitting-equivalent-length
lookup that builds the TEL is the deliberate next follow-on.
