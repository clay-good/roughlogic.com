# roughlogic.com Specification v483 -- Vibration Isolation Efficiency (ASHRAE) (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C); no
> new module, group, or dependency. Inherits spec.md through spec-v482.md.
>
> **The gap, and the evidence for it.** Every piece of rotating mechanical equipment a trade sets -- a rooftop unit, an
> air handler, a pump, a chiller, a generator -- rides on vibration isolators, and the one number that says whether they
> work is the isolation efficiency. The catalog sizes the equipment and its airflow but has nothing for the mount. The
> physics is the textbook single-degree-of-freedom isolator (ASHRAE Handbook -- Fundamentals, Sound and Vibration; Den
> Hartog): the isolated system's natural frequency comes straight from the isolator's static deflection under the load,
> `fn = 3.13 / sqrt(deflection_in)` Hz (which is just `fn = (1/2pi) sqrt(g / deflection)` with g = 386.4 in/s^2), the
> disturbing frequency is the equipment's running speed `f = rpm / 60`, and the fraction of the shaking force that still
> reaches the structure is the transmissibility `T = 1 / |(f/fn)^2 - 1|`, so the isolation efficiency is `1 - T`. The
> catch the tile exists to flag: isolation only happens when the disturbing frequency is more than `sqrt(2)` times the
> natural frequency -- a too-soft isolator under a slow-running unit lands near resonance and *amplifies* the vibration
> instead of cutting it, the single most expensive isolator-selection mistake in the field.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The static deflection is a
length (`L`); the frequencies are `T^-1`; the running speed (rpm), the frequency ratio, the transmissibility, and the
efficiency percent are `dimensionless`. The v18/v21 contract: any non-finite input or a non-positive running speed or
static deflection returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the isolator relations
by name; `editionNote` names the **ASHRAE Handbook -- Fundamentals, Sound and Vibration chapter (the single-degree-of-
freedom vibration isolator)**, prints `fn = 3.13 / sqrt(deflection_in)` Hz (equivalently `187.8 / sqrt(deflection_in)`
cpm), `f = rpm / 60`, `T = 1 / |(f/fn)^2 - 1|`, and `efficiency = (1 - T) x 100%`, and states that **the deflection is
the isolator's rated static deflection under the actual equipment load (from the isolator catalog), the disturbing
frequency is taken as the lowest forcing frequency (the running speed; higher harmonics isolate better), the relations
are the undamped idealization (damping trims high-frequency isolation slightly but tames the resonant peak), isolation
requires the frequency ratio to exceed sqrt(2) (below it the mount amplifies, with true resonance at a ratio of 1), and
the equipment's actual unbalance, the structural (floor) stiffness, seismic restraint, and the isolator selection itself
are the mechanical engineer's** -- a design aid, not a stamped vibration-isolation design.

## 2. The tile

### 2.1 `vibration-isolation` -- The Isolation Efficiency a Static Deflection Buys

```
inputs:
  equipment_rpm         rpm   the running speed of the isolated equipment (the disturbing frequency source)
  static_deflection_in  in    the isolator's rated static deflection under the equipment load (from the catalog)

fn  = 3.13 / sqrt(static_deflection_in)          [Hz]   natural frequency of the isolated system
f   = equipment_rpm / 60                          [Hz]   disturbing frequency
r   = f / fn                                              frequency ratio
T   = 1 / |r^2 - 1|                                       transmissibility (undamped)
isolating = r > sqrt(2)                                   below this the mount amplifies (resonance at r = 1)
efficiency = (1 - T) x 100%                        [%]    only meaningful when isolating
```

**Pinned worked example (a 900 rpm fan on 1 in isolators).** A supply fan running at 900 rpm (`f = 15 Hz`) on isolators
rated for 1 in of static deflection: `fn = 3.13 / sqrt(1) = ` **3.13 Hz**, `r = 15 / 3.13 = ` **4.79**, so
`T = 1 / (4.79^2 - 1) = 1 / 21.96 = ` **0.0455** and the isolation efficiency is `(1 - 0.0455) x 100 = ` **95.4%** -- a
standard, well-isolated fan. **Cross-check (the amplification trap).** Put a slow 200 rpm unit (`f = 3.33 Hz`) on the
same 1 in isolators: `r = 3.33 / 3.13 = ` **1.06**, below the `sqrt(2) = 1.414` isolation threshold, so instead of
isolating, `T = 1 / |1.06^2 - 1| = ` **7.45** -- the mount *amplifies* the shaking force seven-fold, sitting right on
the resonant hump. The fix is a *stiffer* isolator (less deflection raises fn) or matching the deflection to the speed;
the tile returns the amplification and the not-isolating flag so the selection is caught before the equipment is set.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 900 rpm isolation example + the
200 rpm amplification cross-check); `test/fixtures/compute-map.js` (`vibration-isolation` ->
`computeVibrationIsolation` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `fan-affinity-laws` /
`grille-face-velocity` / `pump-specific-speed`); `data/search/aliases.json` ("vibration isolation", "isolator
selection", "transmissibility", "isolation efficiency", "spring isolator", "vibration mount", "natural frequency",
"resonance"); the id appended to the hvac renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the sqrt(2) isolation threshold, the
resonance amplification, and the error seams (non-finite, rpm / deflection <= 0). Hand-writes its renderer (two
`makeNumber` fields, mirroring the calc-hvac.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the fn / ratio / transmissibility / efficiency stack wraps on a phone); render-no-nan + a11y on
the new tile, output read to the value (the 900 rpm example -> 95.4% efficiency).

## 5. Roadmap position

Adds the equipment-mount number beside the equipment: the fan (`fan-affinity-laws`), the pump (`pump-specific-speed`),
and the airflow (`grille-face-velocity`) now have the isolation-efficiency check the mechanical set carries. A
damped-transmissibility mode (entering a damping ratio), a multi-mount load-distribution helper, and a seismic-restraint
companion are deliberate future follow-ons. Further Group C growth stays evidence-driven.
