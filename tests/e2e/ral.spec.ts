import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.setTimeout(90000);
test("independent RAL references and brand preferences persist through undo, redo, projects and custom HEX edits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/studio");
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").selectOption("1");
  await page.locator("#paint-brand").selectOption("Sikkens");
  await page.locator("#ral-search").fill("RAL 9010");
  await page
    .getByRole("button", { name: "RAL 9010 Zuiver wit", exact: true })
    .click();
  await expect(page.locator(".selected-paint")).toContainText("Sikkens");
  await expect(page.locator("#custom-color")).toHaveValue("#f7f9ef");
  await page.locator("#surface-select").selectOption("2");
  await page.locator("#paint-brand").selectOption("Sigma");
  await page.locator("#ral-search").fill("7016");
  await page
    .getByRole("button", { name: "RAL 7016 Antracietgrijs", exact: true })
    .click();
  await expect(page.locator("#custom-color")).toHaveValue("#373f43");
  await page.locator("#paint-brand").selectOption("Flexa");
  await expect(page.locator(".selected-paint")).toContainText("Flexa");
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  await expect(page.locator("#paint-brand")).toHaveValue("Sigma");
  await page
    .getByRole("button", { name: "Opnieuw uitvoeren", exact: true })
    .click();
  await expect(page.locator("#paint-brand")).toHaveValue("Flexa");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project opslaan", exact: true })
    .click();
  const file = await pending;
  const bytes = await readFile((await file.path())!);
  const saved = JSON.parse(bytes.toString());
  expect(saved.version).toBe(2);
  expect(saved.paintRefs["1"]).toEqual({
    system: "RAL Classic",
    code: "9010",
    brand: "Sikkens",
  });
  expect(saved.paintRefs["2"]).toEqual({
    system: "RAL Classic",
    code: "7016",
    brand: "Flexa",
  });
  await page.reload();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page
    .getByLabel("RoomVision-project openen")
    .setInputFiles({
      name: "ral.roomvision",
      mimeType: "application/json",
      buffer: bytes,
    });
  await expect(page.getByText(/Project geopend/)).toBeVisible();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").selectOption("1");
  await expect(page.locator(".selected-paint")).toContainText("RAL 9010");
  await expect(page.locator("#paint-brand")).toHaveValue("Sikkens");
  await page.locator("#surface-select").selectOption("2");
  await expect(page.locator(".selected-paint")).toContainText("RAL 7016");
  await expect(page.locator("#paint-brand")).toHaveValue("Flexa");
  await page.locator("#hex-color").fill("#112233");
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
  await expect(page.locator(".selected-paint")).toHaveCount(0);
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  await expect(page.locator(".selected-paint")).toContainText("RAL 7016");
  await page
    .getByRole("button", { name: "Kleur herstellen", exact: true })
    .click();
  await expect(page.locator(".selected-paint")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("mobile RAL search supports accents, family filtering, empty results and source disclosure", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/studio");
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").selectOption("1");
  await page.locator("#paint-brand").selectOption("Flexa");
  await page.locator("#ral-search").fill("creme wit");
  await page
    .getByRole("button", { name: "RAL 9001 Crèmewit", exact: true })
    .tap();
  await expect(page.locator(".selected-paint")).toContainText("Flexa");
  await page.locator("#ral-family").selectOption("7");
  await expect(page.getByText(/Geen kleur gevonden/)).toBeVisible();
  await page.locator("#ral-search").fill("");
  await expect(
    page.getByRole("button", { name: "RAL 7016 Antracietgrijs", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Kleurbronnen en beperkingen" }).click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", {
      name: "Kleurbronnen en verfmerken",
      exact: true,
    }),
  ).toBeVisible();
  await expect(popup.getByText(/Eigen merkcollecties/)).toBeVisible();
  await context.close();
});
