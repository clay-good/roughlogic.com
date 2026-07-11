# roughlogic

Field math for the trades. Free, fast, no ads, no accounts, works offline.

[roughlogic.com](https://roughlogic.com) gives electricians, plumbers, HVAC techs, carpenters, restoration techs, firefighters, and dozens of other trades more than 1,000 small calculators: voltage drop, friction loss, conduit fill, duct sizing, refrigerant superheat, stair geometry, pump pressure, and much more. Everything runs in your browser. Every answer is computed from published formulas and cites its source.

<p align="center">
  <img src="docs/img/home-mobile.png" width="240" alt="roughlogic home view on a phone: a headline, a one-paragraph description, a single search bar, and a browse-by-trade index">
  &nbsp;
  <img src="docs/img/calculator-mobile.png" width="240" alt="The Ohm's Law calculator on a phone in the light theme, with labeled numeric inputs and live computed outputs, each with a Copy button">
  &nbsp;
  <img src="docs/img/calculator-dark.png" width="240" alt="The same Ohm's Law calculator in the dark theme">
</p>

## How to use it

1. Open [roughlogic.com](https://roughlogic.com).
2. Type what you need in the search bar (a tool name or a plain question) and pick a result. Or browse by trade from the home page.
3. Type in your numbers. The answer updates live; there is no submit button. Tap Copy to grab a value.

Each calculator has a "Test with example" button that fills in a known reference case, a citation for where the formula comes from, and a note on what the tool is not for. Your inputs are saved in the URL, so you can bookmark or share a calculator with its numbers preloaded.

Once the page has loaded, it works with no signal at all. No account, no email, no tracking, ever.

## Use it from an AI agent

The whole catalog is also available to AI agents (Claude Code, Claude Desktop, Cursor, and the like) through a local MCP server that runs entirely on your machine. See [mcp/README.md](mcp/README.md) for setup.

## License

MIT. See [LICENSE](LICENSE).
