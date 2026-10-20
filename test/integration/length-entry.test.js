// spec-v1970: a feet box takes what the tape says. Typing 8'6" into
// voltage-drop's one-way length on a phone-width screen shows "= 8.5 ft" under
// the box and gives the same answer as typing 8.5.
import { test, expect } from "@playwright/test";

test("length entry: 8'6\" in a feet box reads 8.5 ft and answers like 8.5", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/index.html#voltage-drop?v=1&vd-phase=single&vd-mat=copper&vd-awg=12&vd-len=150&vd-cur=20&vd-src=240");
  const box = page.locator("#vd-len");
  await expect(box).toBeVisible({ timeout: 10000 });
  await box.fill("8.5");
  await page.waitForTimeout(300);
  const decimal = await page.locator(".output-region").innerText();
  await box.fill("8'6\"");
  await page.waitForTimeout(300);
  await expect(page.locator(".field:has(#vd-len) .length-hint")).toHaveText("= 8.5 ft");
  expect(await page.locator(".output-region").innerText()).toBe(decimal);
  await box.fill("8'15\"");
  await page.waitForTimeout(300);
  await expect(box).toHaveAttribute("aria-invalid", "true");
});
