// spec-v1971: a search that finds nothing offers "Request a calculator", the form
// carries the search text and the privacy line, and the request travels the
// report path as kind "request" with no calculator and no inputs but the query.
import { test, expect } from "@playwright/test";

test("request a calculator from the no-match search state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_host, options) => { queueMicrotask(() => options.callback("browser-test-token")); return "widget-1"; },
      remove: () => {},
      reset: () => {},
    };
  });
  let submitted = null;
  await page.route("**/api/reports/config", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ sitekey: "browser-test-sitekey" }),
  }));
  await page.route("**/api/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/index.html");
  const query = "zzqx frobnicator wavelength";
  await page.locator("#search-input").fill(query);
  const ask = page.locator(".request-trigger");
  await expect(ask).toBeVisible({ timeout: 10000 });
  await ask.click();
  const dialog = page.locator("dialog.report-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Request a calculator");
  await expect(dialog).toContainText(query);
  await expect(dialog).toContainText("Do not include names, addresses, or other personal information.");
  const send = dialog.getByRole("button", { name: "Send request" });
  await expect(send).toBeDisabled();
  await dialog.locator("#report-note").fill("The wavelength of a frobnicator.");
  await expect(send).toBeEnabled();
  await send.click();
  await expect(dialog).toContainText("Thanks. Request saved.");
  expect(submitted.kind).toBe("request");
  expect(submitted.calculator_id).toBe("-");
  expect(submitted.inputs).toEqual([{ label: "query", value: query }]);
  expect(submitted.outputs.text).toBe("");
  expect(new URL(submitted.page_url).pathname).toBe("/");
});

test("request a calculator under a result list carries the top three result ids", async ({ page }) => {
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_host, options) => { queueMicrotask(() => options.callback("browser-test-token")); return "widget-1"; },
      remove: () => {},
      reset: () => {},
    };
  });
  let submitted = null;
  await page.route("**/api/reports/config", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ sitekey: "browser-test-sitekey" }),
  }));
  await page.route("**/api/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/index.html");
  await page.locator("#search-input").fill("ohm");
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 20000 });
  const ask = page.locator(".request-trigger");
  await expect(ask).toHaveText("Not the one you need? Request a calculator");
  const shown = await page.locator(".search-result .sr-name").evaluateAll((els) => els.slice(0, 3).map((e) => e.textContent));
  await ask.click();
  const dialog = page.locator("dialog.report-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#report-note").fill("Ohm's law for three-phase loads.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog).toContainText("Thanks. Request saved.");
  expect(submitted.kind).toBe("request");
  expect(submitted.inputs).toEqual([{ label: "query", value: "ohm" }]);
  const ids = submitted.outputs.values.map((v) => v.value);
  expect(ids.length).toBe(Math.min(3, shown.length));
  expect(ids[0]).toBe("ohms-law");
});

test("the empty-box browse list offers no request row", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#search-input").click();
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".request-trigger")).toHaveCount(0);
});
