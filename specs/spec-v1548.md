# roughlogic.com Specification v1548 -- Train Air Brake Reduction and Equalizing Pressure (`calc-rail.js`, Group J Trucking and Logistics, rail logistics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group J, Trucking and Logistics -- the existing category, hub `/groups/trucking/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Train air brakes work backwards from what people expect: reducing brake pipe pressure APPLIES the brakes, and how much you reduce sets how hard. The relationship between a reduction and the resulting brake cylinder pressure, and the point at which further reduction does nothing, is what an engineer manages on a hill.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive brake pipe pressure or reduction, or a reduction exceeding the brake pipe pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the service reduction and full-service relationship with 49 CFR 232 and the railroad air brake rules named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`train air brake reduction`, `brake cylinder pressure reduction`, `full service brake application`, `minimum reduction train brake`, `brake pipe recharge`.

## 2. The tile

### 2.1 `train-brake-reduction` -- Train Air Brake Reduction and Equalizing Pressure

```
brake pipe        charged to a regulated pressure (commonly 90 psi freight)
service reduction a drop in brake pipe pressure applies the brakes
cylinder pressure roughly 2.5 x the brake pipe reduction, up to full service
full service      about a 26 psi reduction; further reduction adds nothing
emergency         a rapid full venting; higher cylinder pressure than full service
recharge          releasing requires restoring brake pipe pressure, which takes TIME
```

The multiplication is roughly two and a half: a 10 psi brake pipe reduction produces about 25 psi in the brake
cylinders. That continues until the auxiliary reservoir and the brake cylinder equalize, which happens at around a
26 psi reduction, and beyond that point additional reduction produces no additional braking. An engineer who
keeps reducing past full service has spent the air and gained nothing, which is the situation that precedes
losing a train on a grade.

The part that has no formula and matters most is recharge time. Releasing the brakes requires pumping the brake
pipe back up from the head end, and on a long train that takes minutes -- during which the rear of the train may
still be applying while the head end is releasing. That is why cycle braking on a descending grade is dangerous
and why dynamic brake, not air, is the primary means of controlling a train downhill. The tile reports the
approximate cylinder pressure and the full-service point so the remaining air is visible as a quantity rather
than a feeling.

**Inputs:** brake pipe charged pressure, the service reduction made, the cylinder-to-reduction ratio, the full-service reduction point, and the train length and number of cars for a propagation estimate

**Outputs:** the resulting brake cylinder pressure, the remaining reduction available before full service, whether the application is at or beyond full service, the equalizing reservoir pressure, and an indicative propagation time along the train length

## 3. Worked example

A freight train with the brake pipe charged to 90 psi:

```
minimum reduction  6 psi   -> cylinder about 15 psi
10 psi reduction          -> cylinder about 25 psi, brake pipe now 80 psi
20 psi reduction          -> cylinder about 50 psi, brake pipe now 70 psi
26 psi reduction          -> FULL SERVICE, cylinder about 64 psi, brake pipe 64 psi
30 psi reduction          -> still about 64 psi in the cylinders; the extra 4 psi bought NOTHING
```

That last line is the one worth carrying. Past full service the brake pipe and the cylinders have equalized and
further reduction is spent air with no braking to show for it -- and the air spent has to be pumped back before
the brakes will release.

On a 100-car train the reduction takes time to propagate to the rear, so the head end is braking before the tail
is, which is what produces slack run-in. The same delay on release means the rear is still applied while the head
end pulls, and cycling the air on a grade can leave the train with insufficient pressure to release at all.

## 4. Scope and non-goals

An indicative relationship between brake pipe reduction and brake cylinder pressure for a conventional freight
air brake system. The 2.5 ratio and the 26 psi full-service point are typical values; actual values depend on the
control valve type, the brake cylinder and reservoir volumes, the piston travel, and the brake rigging ratio, and
the equipment's own data governs. It does not compute stopping distance, which depends on speed, grade, tonnage,
braking ratio, the percentage of operative brakes, rail condition, and dynamic brake contribution, and which no
simple relation predicts. It does not model propagation, gradient along the brake pipe on a long train, or
in-train forces and slack action. It does not address emergency applications, penalty applications, retainers,
handbrake requirements, or the air brake tests required before a train departs. Train handling is a certified
craft: the railroad's air brake and train handling rules, the locomotive engineer's certification, 49 CFR 232,
and the operating rules govern.
