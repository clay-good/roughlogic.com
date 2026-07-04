# roughlogic.com Specification v420 -- EV Charging Load (NEC 625.42 / 220.57) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an NEC electrical-installation trio (v420 EV charging load -> v421 cable
> tray fill -> v422 buck-boost transformer). EVSE is now on most services, and it has two code numbers no tile computes: the
> continuous-load branch/feeder sizing at 125% and the service-load contribution at the greater of 7200 VA or nameplate.**
> In-scope catalog expansion under the spec-v106 trades-only charter. NEC 625.42 makes electric-vehicle supply equipment a
> continuous load, so the branch circuit and its overcurrent device must be `1.25 * EVSE amps`. Separately, NEC 220.57 adds
> the EVSE to a dwelling service calculation at `max(7200 VA, nameplate)`. The catalog has service-load and branch tiles but
> nothing that applies the EV-specific rules. This adds the EV tile to the existing **`calc-electrical.js`** module
> (Group A); no new group, trade, or dependency. Inherits spec.md through spec-v419.md.
>
> **The gap, and the evidence for it.** A `48 A`, `240 V` EVSE is a continuous load, so the branch circuit and breaker must
> be `1.25 * 48 = 60 A` (a `60 A` breaker on `#6 Cu`), and it draws `240 * 48 = 11,520 VA`; its service-calc contribution is
> `max(7200, 11520) = 11,520 VA`. A smaller `30 A` unit needs a `1.25 * 30 = 37.5 -> 40 A` breaker but only `7,200 VA` in the
> service calc (the nameplate `7,200 VA` floor governs). No tile does this; an electrician adding a charger applied the
> generic branch rules and missed the `220.57` service number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The EVSE current is a current
(A, dim I); the voltage is a voltage (V); the branch ampacity is a current (A); the VA and the service-load contribution are
apparent powers (VA). The v18/v21 contract: any non-finite input, or a non-positive current or voltage, returns `{ error }`;
the branch load is the continuous `1.25 *` current, and the service-load contribution is `max(7200, V*A)`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the NEC EV charging rules by name; `editionNote` names **NEC 625.42
(EVSE is a continuous load; branch/feeder and OCPD at `>= 125%` of the maximum EVSE load), NEC 220.57 (the EVSE service-load
contribution is the greater of `7200 VA` or the nameplate), and the continuous-load `1.25` factor**, and states that **this
returns the branch-circuit ampacity and the service-load VA for a single EVSE, that an EV energy-management system (EVEMS)
can reduce the calculated feeder/service load, and that it is a design aid, not a substitute for the AHJ or a full Article
220 calculation**.

## 2. The tile

### 2.1 `ev-charging-load` -- EV Charging Load (NEC 625.42 / 220.57)

```
inputs:
  evse_amps    A    EVSE maximum load current
  volts        V    supply voltage (240 typical)

branch_amps   = 1.25 * evse_amps          (continuous, 625.42)
va            = volts * evse_amps
service_va    = max(7200, va)             (220.57)
```

**Pinned worked example (48 A, 240 V EVSE).** `branch = 1.25*48 = 60 A` (60 A breaker, #6 Cu); `VA = 240*48 = 11,520`;
`service contribution = max(7200, 11520) = 11,520 VA`. **Cross-check (a small charger hits the VA floor).** A `30 A` unit
needs a `1.25*30 = 37.5 -> 40 A` breaker but only `max(7200, 7200) = 7,200 VA` in the service calc -- the `220.57` nameplate
floor governs. A non-positive current or voltage takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, near `service-load-optional` / `continuous-load-ocpd`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, NEC 625.42 / 220.57, `editionNote` naming the
`1.25` continuous factor, the branch/OCPD rule, and the `max(7200, nameplate)` service contribution -- NEC text quoted per
the CF-01 disclosure); `test/fixtures/worked-examples.json` (the 48 A example + the 30 A floor cross-check);
`test/fixtures/compute-map.js` (`ev-charging-load` -> `computeEvChargingLoad` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `continuous-load-ocpd` / `service-load-optional` / `service-conductor-sizing` /
`voltage-drop`); `data/search/aliases.json` ("ev charging load", "evse load", "ev charger circuit", "nec 625", "nec 220.57",
"ev charger breaker", "electric vehicle load", "evse continuous load", "7200 va ev"); the id appended to the existing
electrical renderers block in `app.js`; the `// dims:` annotation (current I, voltage V, VA apparent power); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the 7200 VA floor, and the non-positive /
non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 NEC-
disclosure regex satisfied); `npm test` (+2 fixtures, the new fuzzer block, the VA floor, the error paths);
`npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
branch / VA / service set wraps on a phone); render-no-nan + a11y sweep, output read to the value
(48 A, 240 V -> 60 A branch, 11,520 VA).

## 5. Roadmap position

Opens the NEC electrical-installation trio: `cable-tray-fill` (v421) and `buck-boost-transformer-sizing` (v422) continue the
installation theme. An EVEMS load-management tile (reduced feeder/service demand for multiple chargers) and a DC-fast-charger
service-sizing companion are the deliberate next follow-ons.
