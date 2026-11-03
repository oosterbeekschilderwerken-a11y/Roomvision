import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.setTimeout(90000);
async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/studio");
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").waitFor();
}
async function pixels(page: Page) {
  const png = await page.locator("canvas").screenshot();
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [
      [0.5, 0.35],
      [0.9, 0.35],
      [0.5, 0.7],
    ].map(([x, y]) =>
      Array.from(
        ctx.getImageData(
          Math.floor(x * c.width),
          Math.floor(y * c.height),
          1,
          1,
        ).data,
      ).slice(0, 3),
    );
  }, png.toString("base64"));
}
const delta = (a: number[], b: number[]) =>
  Math.max(...a.map((v, i) => Math.abs(v - b[i])));
test("original comparison is exact, strength is per surface, undo and redo restore render state", async ({
  page,
}) => {
  await open(page);
  const original = await pixels(page);
  await page.locator("#surface-select").selectOption("1");
  await page.getByRole("button", { name: "Rood", exact: true }).click();
  await page.locator("#color-strength").fill("40");
  await page.locator("#surface-select").selectOption("2");
  await page.getByRole("button", { name: "Blauw", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const colored = await pixels(page);
  expect(delta(colored[0], original[0])).toBeGreaterThan(20);
  expect(delta(colored[1], original[1])).toBeGreaterThan(20);
  expect(delta(colored[2], original[2])).toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "Toon origineel", exact: true })
    .click();
  const compared = await pixels(page);
  for (let i = 0; i < 3; i++)
    expect(delta(compared[i], original[i])).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Toon kleuren", exact: true }).click();
  expect(delta((await pixels(page))[0], colored[0])).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: /Ongedaan maken/ }).click();
  expect(delta((await pixels(page))[1], original[1])).toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "Opnieuw uitvoeren", exact: true })
    .click();
  expect(delta((await pixels(page))[1], colored[1])).toBeLessThanOrEqual(1);
  await page.locator("#surface-select").selectOption("1");
  await expect(page.locator("#color-strength")).toHaveValue("40");
  await page.locator("#color-strength").fill("0");
  await page.locator("#surface-select").selectOption("0");
  expect(delta((await pixels(page))[0], original[0])).toBeLessThanOrEqual(1);
  expect(delta((await pixels(page))[1], colored[1])).toBeLessThanOrEqual(1);
});
test("complete project download reopens after reload with independent colors and strengths; corrupt input leaves current work intact", async ({
  page,
}) => {
  await open(page);
  await page.locator("#surface-select").selectOption("1");
  await page.getByRole("button", { name: "Rood", exact: true }).click();
  await page.locator("#color-strength").fill("60");
  await page.locator("#surface-select").selectOption("2");
  await page.getByRole("button", { name: "Blauw", exact: true }).click();
  await page.locator("#surface-select").selectOption("0");
  const before = await pixels(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project opslaan", exact: true })
    .click();
  const download = await pending;
  const bytes = await readFile((await download.path())!);
  expect(download.suggestedFilename()).toBe("roomvision.roomvision");
  await page.reload();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.getByLabel("RoomVision-project openen").setInputFiles({
    name: "woonkamer.roomvision",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.getByText(/Project geopend/)).toBeVisible();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  const restored = await pixels(page);
  for (let i = 0; i < 3; i++)
    expect(delta(restored[i], before[i])).toBeLessThanOrEqual(1);
  await page.locator("#surface-select").selectOption("1");
  await expect(page.locator("#custom-color")).toHaveValue("#ce3434");
  await expect(page.locator("#color-strength")).toHaveValue("60");
  await page.locator("#surface-select").selectOption("2");
  await expect(page.locator("#custom-color")).toHaveValue("#3265c4");
  await page.getByLabel("RoomVision-project openen").setInputFiles({
    name: "kapot.roomvision",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"wrong"}'),
  });
  await expect(page.locator(".upload-error")).toContainText("geen ondersteund");
  await expect(page.locator("#custom-color")).toHaveValue("#3265c4");
  await page
    .getByLabel("RoomVision-project openen")
    .setInputFiles({
      name: "geen-json.roomvision",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await expect(page.locator(".upload-error")).toContainText("ongeldige JSON");
  await expect(page.locator("#custom-color")).toHaveValue("#3265c4");
});
test("own photo onboarding exposes missing masks and begins painting without claiming automatic recognition", async ({
  page,
}) => {
  await open(page);
  await page
    .locator("#panorama-upload")
    .setInputFiles("public/room/panorama.png");
  await expect(page.getByText("panorama.png", { exact: true })).toBeVisible();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
  await page.locator("#surface-select").selectOption("1");
  await expect(page.locator(".mask-coverage")).toContainText("nog geen masker");
  await page
    .getByRole("button", { name: "Begin masker tekenen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Penseel", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Toon maskers", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("Andere oppervlakmaskers beschermen"),
  ).toBeChecked();
});
