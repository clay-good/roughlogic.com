# roughlogic

**Free calculators for the trades. No ads, no accounts, works offline.**

[roughlogic.com](https://roughlogic.com) is 2,183 small, single-purpose calculators for electricians, plumbers, HVAC techs, carpenters, firefighters, surveyors, and dozens of other trades. Every answer comes from a published formula and names its source.

<p align="center">
  <img src="docs/img/home-mobile.png" width="240" alt="roughlogic home view on a phone: a headline, one line of description, a single search box, and four tappable example questions">
  &nbsp;
  <img src="docs/img/calculator-mobile.png" width="240" alt="The Ohm's Law calculator on a phone in the light theme: the answer at the top with a Copy button on each value, the labeled inputs that produced it below, and a collapsed Details, formula, and sources at the bottom">
  &nbsp;
  <img src="docs/img/calculator-dark.png" width="240" alt="The same Ohm's Law calculator in the dark theme">
</p>

## How to use it

1. Go to [roughlogic.com](https://roughlogic.com).
2. Type the job the way you'd say it: `voltage drop 120v 150 ft 12 awg 20a`.
3. The answer shows at the top and updates as you type. Tap **Copy** to grab a value.

That's it. Bookmark any calculator and your numbers come with it. After the first visit it works with no signal.

## What an answer looks like

From [Voltage Drop](https://roughlogic.com/tools/voltage-drop/):

| You enter | | You get | |
|---|---|---|---|
| Phase | single | Voltage drop | 7.45 V |
| Material | copper | Percent drop | 3.11 % |
| AWG | 10 | | |
| Length one-way (ft) | 150 | | |
| Current (A) | 20 | | |
| Source voltage (V) | 240 | | |

Every page has a **Details, formula, and sources** drop-down if you want to check the math.

## What's covered

Electrical · Plumbing & gas · HVAC · Carpentry & construction · Water damage & mold · Fire ground · Trucking · Auto, marine & aviation · Agriculture · Water & wastewater · Stage production · Kitchens · Backcountry & SAR · Rigging · Lab math · Real estate · Small-business tax · Teaching, and more.

## Private by default

Everything runs in your browser. No account, no email, no tracking. The only thing that ever leaves your device is a problem report, and only if you choose to send one.

## Use it from an AI agent

Claude, Cursor, and other agents can run every calculator through a small local server. See [mcp/README.md](mcp/README.md).

## Found a wrong answer?

Please [open an issue](https://github.com/clay-good/roughlogic.com/issues/new/choose) with your inputs and the source that disagrees. It's the most useful report you can send.

## For developers

```bash
npm ci        # install dev tooling
npm run dev   # build and serve locally
npm test      # run the unit tests
```

How it's built and how every answer is tested: [docs/how-it-works.md](docs/how-it-works.md). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
