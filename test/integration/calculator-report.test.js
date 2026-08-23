import { test, expect } from "@playwright/test";

test("calculator report is mobile-friendly and sends reproducible context", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_host, options) => {
        queueMicrotask(() => options.callback("browser-test-token"));
        return "widget-1";
      },
      remove: () => {},
      reset: () => {},
    };
  });

  let submitted = null;
  await page.route("**/api/reports/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ sitekey: "browser-test-sitekey" }),
  }));
  await page.route("**/api/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/index.html#ohms-law?voltage=120&current=10");
  const report = page.getByRole("button", { name: "Report a problem" });
  await expect(report).toBeVisible();
  await expect(report).toHaveCSS("min-height", "48px");

  await report.click();
  const dialog = page.getByRole("dialog", { name: "Report a problem" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("URL, inputs, and results");
  await expect(dialog).toContainText("Do not include names, addresses");

  const note = dialog.getByLabel("What did you expect instead? (optional)");
  await expect(note).toHaveAttribute("maxlength", "160");
  await note.fill("I expected 1,200 W.");
  await expect(dialog).toContainText("141 characters remaining");

  const send = dialog.getByRole("button", { name: "Send report" });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(dialog).toContainText("Thanks. Report saved.");

  expect(submitted).toBeTruthy();
  expect(submitted.calculator_id).toBe("ohms-law");
  expect(submitted.page_url).toContain("#ohms-law");
  expect(submitted.note).toBe("I expected 1,200 W.");
  expect(submitted.turnstile_token).toBe("browser-test-token");
  expect(Array.isArray(submitted.inputs)).toBeTruthy();
  expect(submitted.inputs.length).toBeGreaterThan(0);
  expect(submitted.outputs).toHaveProperty("values");

  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
});
