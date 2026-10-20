// spec-v1974: an IRC calculator's "Your state's edition" picker reads the IRC
// rows: a drafted state prints its edition labeled not verified, and a state
// whose sources disagree prints none.
import { test, expect } from "@playwright/test";

test("an IRC calculator prints the chosen state's IRC edition, labeled not verified", async ({ page }) => {
  await page.goto("/index.html#hearth-extension-check");
  const select = page.locator("#rl-state-select");
  await expect(select).toBeAttached({ timeout: 20000 });
  await page.getByText("Details, formula, and sources").click();
  await select.selectOption("SC");
  const lines = page.locator(".v6-reference-row-state .state-edition-line");
  await expect(lines.filter({ hasText: "South Carolina enforces IRC 2021" })).toHaveCount(1);
  await expect(lines.filter({ hasText: "IRC 2024 takes effect Jan 1, 2027" })).toHaveCount(1);
  await expect(lines.filter({ hasText: /^Not verified/ }).first()).toBeVisible();
  await select.selectOption("HI");
  await expect(lines.filter({ hasText: "the sources we found disagree about which IRC edition Hawaii enforces" })).toHaveCount(1);
});

test("an IBC calculator prints the chosen state's IBC edition", async ({ page }) => {
  await page.goto("/index.html#allowable-area");
  const select = page.locator("#rl-state-select");
  await expect(select).toBeAttached({ timeout: 20000 });
  await page.getByText("Details, formula, and sources").click();
  await select.selectOption("OK");
  const lines = page.locator(".v6-reference-row-state .state-edition-line");
  await expect(lines.filter({ hasText: "Oklahoma enforces IBC 2024 (since Sep 14, 2026), with state amendments." })).toHaveCount(1);
});
