import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.setTimeout(90000);
async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/studio");
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await expect(page.locator("#surface-select")).toBeVisible();
  await expect(page.locator(".viewer-message.error")).toHaveCount(0);
}
async function clickAt(page: Page, x: number, y: number) {
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}
async function samples(page: Page) {
  const png = await page.locator("canvas").screenshot();
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [
      [0.5, 0.35],
      [0.9, 0.35],
      [0.5, 0.7],
      [0.34, 0.45],
    ].map(([x, y]) =>
      Array.from(
        ctx.getImageData(
          Math.floor(x * canvas.width),
          Math.floor(y * canvas.height),
          1,
          1,
        ).data,
      ).slice(0, 3),
    );
  }, png.toString("base64"));
}
const diff = (a: number[], b: number[]) =>
  Math.max(...a.map((v, i) => Math.abs(v - b[i])));
test("raycast two walls: independent red and blue pixels, protected furniture/window, full rotation, undo and restore", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await open(page);
  const before = await samples(page);
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await expect(
    page.getByRole("heading", { name: "Muur 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rood", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const red = await samples(page);
  expect(red[0][0]).toBeGreaterThan(red[0][2] * 2);
  expect(diff(before[0], red[0])).toBeGreaterThan(30);
  expect(diff(before[1], red[1])).toBeLessThanOrEqual(1);
  expect(diff(before[2], red[2])).toBeLessThanOrEqual(1);
  expect(diff(before[3], red[3])).toBeLessThanOrEqual(1);
  await clickAt(page, 0.9, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("2");
  await page.getByRole("button", { name: "Blauw", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const both = await samples(page);
  expect(both[1][2]).toBeGreaterThan(both[1][0] * 2);
  expect(diff(red[0], both[0])).toBeLessThanOrEqual(1);
  expect(diff(before[2], both[2])).toBeLessThanOrEqual(1);
  expect(diff(before[3], both[3])).toBeLessThanOrEqual(1);
  // A click on the cabinet does not select the wall behind it.
  await clickAt(page, 0.5, 0.7);
  await expect(page.locator("#surface-select")).toHaveValue("0");
  const region = page.getByRole("region", { name: /Interactieve/ });
  await region.focus();
  for (let i = 0; i < 36; i++) await page.keyboard.press("ArrowRight");
  expect(diff((await samples(page))[0], both[0])).toBeGreaterThan(20);
  for (let i = 0; i < 36; i++) await page.keyboard.press("ArrowRight");
  const rotated = await samples(page);
  expect(diff(rotated[0], both[0])).toBeLessThanOrEqual(2);
  expect(diff(rotated[1], both[1])).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  const undone = await samples(page);
  expect(diff(undone[1], before[1])).toBeLessThanOrEqual(2);
  expect(diff(undone[0], red[0])).toBeLessThanOrEqual(2);
  await page.locator("#surface-select").selectOption("1");
  await page
    .getByRole("button", { name: "Kleur herstellen", exact: true })
    .click();
  await page.locator("#surface-select").selectOption("0");
  expect(diff((await samples(page))[0], before[0])).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
test("pixel mask correction, undo, export/import and HEX validation", async ({
  page,
}) => {
  await open(page);
  await clickAt(page, 0.5, 0.35);
  await page.getByRole("button", { name: "Rood", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const before = await samples(page);
  await page.getByText("Maskers corrigeren", { exact: true }).click();
  await page.getByRole("button", { name: "Gum", exact: true }).click();
  // Radius 60 includes our sample despite a one-pixel ray/raster rounding difference.
  await page.locator("#brush-size").fill("60");
  await clickAt(page, 0.5, 0.35);
  await page.getByRole("button", { name: "Rondkijken", exact: true }).click();
  const erased = await samples(page);
  expect(diff(erased[0], before[0])).toBeGreaterThan(20);
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("0");
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  expect(diff((await samples(page))[0], before[0])).toBeLessThanOrEqual(1);
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await page.locator("#hex-color").fill("#ZZZZZZ");
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
  await expect(page.locator(".color-panel [role=alert]")).toContainText("HEX");
  await page.locator("#hex-color").fill("#3265C4");
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
  await expect(page.locator("#custom-color")).toHaveValue("#3265c4");
  await page.locator("#custom-color").fill("#889b7c");
  await expect(page.locator("#hex-color")).toHaveValue("#889b7c");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporteer masker" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("roomvision-surface-ids.png");
  const path = (await download.path())!;
  await page.getByLabel("ID-masker importeren").setInputFiles({
    name: "corrected-mask.png",
    mimeType: "image/png",
    buffer: await readFile(path),
  });
  await expect(page.getByText(/ID-masker geïmporteerd/)).toBeVisible();
  await page.getByRole("button", { name: "Gum", exact: true }).click();
  await clickAt(page, 0.5, 0.35);
  await page.getByRole("button", { name: "Rondkijken", exact: true }).click();
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("0");
  await page
    .getByLabel("ID-masker importeren")
    .setInputFiles({
      name: "restored-mask.png",
      mimeType: "image/png",
      buffer: await readFile(path),
    });
  await expect(page.getByText(/ID-masker geïmporteerd/)).toBeVisible();
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("1");
});
test("mobile tap selects a wall, applies its color and supports undo", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto("/studio");
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").waitFor();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.touchscreen.tap(
    box.x + box.width * 0.5,
    box.y + box.height * 0.35,
  );
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await page.getByRole("button", { name: "Rood", exact: true }).tap();
  await expect(page.locator("#custom-color")).toHaveValue("#ce3434");
  await page.getByRole("button", { name: /Ongedaan maken/ }).tap();
  await expect(
    page.getByText("Oorspronkelijke foto", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("own panorama starts without demo masks; a painted stroke becomes a selectable surface and one undo removes the stroke", async ({
  page,
}) => {
  await open(page);
  await page
    .locator("#panorama-upload")
    .setInputFiles("public/room/panorama.png");
  await expect(page.getByText("panorama.png", { exact: true })).toBeVisible();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("0");
  await page.locator("#surface-select").selectOption("1");
  await page.getByText("Maskers corrigeren", { exact: true }).click();
  await page.locator("#brush-size").fill("60");
  await page.getByRole("button", { name: "Penseel", exact: true }).click();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.35, {
    steps: 8,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Rondkijken", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await page.getByRole("button", { name: "Rood", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const rendered = await samples(page);
  expect(rendered[0][0]).toBeGreaterThan(rendered[0][2] * 2);
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  await clickAt(page, 0.5, 0.35);
  await expect(page.locator("#surface-select")).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: /Ongedaan maken/ }),
  ).toBeDisabled();
});
