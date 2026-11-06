import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.setTimeout(90000);
async function upload(
  page: Page,
  kind: "photo" | "panorama" = "photo",
  uniform = false,
) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/studio");
  await page.locator("#surface-select").waitFor();
  const png = await page.evaluate(
    ({ kind, uniform }) => {
      const c = document.createElement("canvas");
      c.width = kind === "photo" ? 1200 : 1600;
      c.height = 800;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = uniform ? "#d0c5b0" : "#293747";
      ctx.fillRect(0, 0, c.width, c.height);
      if (!uniform) {
        ctx.fillStyle = "#d0c5b0";
        ctx.fillRect(c.width * 0.06, 80, c.width * 0.4, 560);
        ctx.fillStyle = "#b6b8ba";
        ctx.fillRect(c.width * 0.54, 80, c.width * 0.4, 560);
        ctx.fillStyle = "#607c65";
        ctx.fillRect(c.width * 0.35, 500, c.width * 0.13, 140);
        ctx.fillStyle = "#99cee9";
        ctx.fillRect(c.width * 0.15, 200, c.width * 0.12, 130);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { kind, uniform },
  );
  await page
    .locator(kind === "photo" ? "#photo-upload" : "#panorama-upload")
    .setInputFiles({
      name: "eigen-kamer.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(
    page.getByText("eigen-kamer.png", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(kind === "photo" ? "Foto laden…" : "Panorama laden…"),
  ).toHaveCount(0);
}
async function click(page: Page, x: number, y: number) {
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}
async function color(page: Page, hex: string) {
  await page.locator("#hex-color").fill(hex);
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
}
async function pixels(page: Page) {
  return page.locator("canvas").evaluate(
    (c: HTMLCanvasElement) =>
      new Promise<number[][]>((resolve) =>
        requestAnimationFrame(() => {
          const gl = c.getContext("webgl2")!;
          resolve(
            [
              [0.27, 0.5],
              [0.75, 0.5],
              [0.41, 0.7],
              [0.22, 0.35],
              [0.12, 0.06],
            ].map(([x, y]) => {
              const p = new Uint8Array(4);
              gl.readPixels(
                Math.floor(x * c.width),
                Math.floor((1 - y) * c.height),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                p,
              );
              return [...p].slice(0, 3);
            }),
          );
        }),
      ),
  );
}
const delta = (a: number[], b: number[]) =>
  Math.max(...a.map((v, i) => Math.abs(v - b[i])));
test("own upload works by clicking without preloaded masks; two walls color independently and phase 3 variants, PNG and project restore work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await upload(page);
  const before = await pixels(page);
  await expect(
    page.getByRole("button", { name: "Klikselectie", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await click(page, 0.27, 0.5);
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await expect(
    page.getByRole("button", {
      name: "Kleur kiezen voor Muur 1 →",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kleur kiezen voor Muur 1 →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Muur 1", exact: true }),
  ).toBeInViewport();
  await color(page, "#ce3434");
  await click(page, 0.75, 0.5);
  await expect(page.locator("#surface-select")).toHaveValue("2");
  await color(page, "#3265c4");
  await page.locator("#surface-select").selectOption("0");
  const painted = await pixels(page);
  expect(painted[0][0]).toBeGreaterThan(painted[0][2] * 2);
  expect(painted[1][2]).toBeGreaterThan(painted[1][0] * 2);
  expect(delta(painted[2], before[2])).toBeLessThanOrEqual(1);
  expect(delta(painted[3], before[3])).toBeLessThanOrEqual(1);
  await page.locator("#variant-name").fill("Rood en blauw");
  await page
    .getByRole("button", { name: "Variant bewaren", exact: true })
    .click();
  await page.locator("#surface-select").selectOption("1");
  await color(page, "#eee9dd");
  await page.locator("#variant-name").fill("Warm wit");
  await page
    .getByRole("button", { name: "Variant bewaren", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toon Rood en blauw", exact: true })
    .click();
  expect(delta((await pixels(page))[0], painted[0])).toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "Toon Warm wit", exact: true })
    .click();
  const warm = await pixels(page);
  expect(delta(warm[0], painted[0])).toBeGreaterThan(30);
  const pngPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Weergave downloaden (PNG)", exact: true })
    .click();
  const png = await pngPromise,
    bytes = await readFile((await png.path())!);
  expect(png.suggestedFilename()).toBe("roomvision-kleurontwerp.png");
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const exported = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [
      [0.27, 0.5],
      [0.75, 0.5],
      [0.41, 0.7],
      [0.22, 0.35],
      [0.12, 0.06],
    ].map(([x, y]) =>
      [
        ...ctx.getImageData(
          Math.floor(x * c.width),
          Math.floor(y * c.height),
          1,
          1,
        ).data,
      ].slice(0, 3),
    );
  }, bytes.toString("base64"));
  for (let i = 0; i < 5; i++)
    expect(delta(exported[i], warm[i])).toBeLessThanOrEqual(1);
  const projectPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project opslaan", exact: true })
    .click();
  const project = await projectPromise,
    projectBytes = await readFile((await project.path())!);
  expect(JSON.parse(projectBytes.toString()).variants).toHaveLength(2);
  await page.reload();
  await page.getByLabel("RoomVision-project openen").setInputFiles({
    name: "varianten.roomvision",
    mimeType: "application/json",
    buffer: projectBytes,
  });
  await expect(page.getByText(/Project geopend/)).toBeVisible();
  await expect(page.getByText("Foto laden…")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toon Rood en blauw", exact: true })
    .click();
  expect(delta((await pixels(page))[0], painted[0])).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
for (const kind of ["photo", "panorama"] as const)
  test(`${kind}: ambiguous upload can be outlined in the real viewer and colored, including across the panorama seam`, async ({
    page,
  }) => {
    await upload(page, kind, true);
    await click(page, 0.5, 0.4);
    await expect(page.locator(".upload-error")).toContainText("te groot");
    await page
      .getByRole("button", { name: "Muur tekenen", exact: true })
      .click();
    await click(page, 0.25, 0.25);
    await click(page, 0.7, 0.25);
    await expect(
      page.getByRole("button", { name: "Muur vastleggen", exact: true }),
    ).toBeDisabled();
    await click(page, 0.7, 0.6);
    await click(page, 0.25, 0.6);
    await expect(page.getByText(/4 hoekpunten/)).toBeVisible();
    await page
      .getByRole("button", { name: "Muur vastleggen", exact: true })
      .click();
    await color(page, "#3265c4");
    await page.locator("#surface-select").selectOption("0");
    const samples = await pixels(page);
    expect(samples[0][2]).toBeGreaterThan(samples[0][0] * 2);
    const projectPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project opslaan", exact: true })
      .click();
    const file = await projectPromise;
    const saved = JSON.parse((await readFile((await file.path())!)).toString());
    const ids = Buffer.from(saved.mask.data, "base64");
    if (kind === "panorama") {
      const center = Math.floor(saved.mask.height * 0.5) * saved.mask.width;
      expect(ids[center]).toBe(1);
      expect(ids[center + saved.mask.width - 1]).toBe(1);
    }
    expect(saved.projection).toBe(kind);
    if (kind === "panorama") {
      const output = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Weergave downloaden (PNG)", exact: true })
        .click();
      const png = await output,
        bytes = await readFile((await png.path())!);
      const sample = await page.evaluate(async (encoded) => {
        const image = new Image();
        image.src = "data:image/png;base64," + encoded;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return [
          ...ctx.getImageData(
            Math.floor(canvas.width * 0.5),
            Math.floor(canvas.height * 0.4),
            1,
            1,
          ).data,
        ];
      }, bytes.toString("base64"));
      expect(sample[2]).toBeGreaterThan(sample[0] * 2);
    }

    await page.getByRole("button", { name: /Ongedaan maken/ }).click();
    await page.getByRole("button", { name: /Ongedaan maken/ }).click();
    await page.locator("#surface-select").selectOption("1");
    await expect(page.locator(".mask-coverage")).toContainText(
      "nog geen masker",
    );
  });
test("mobile own photo tap directly selects a region and applies color without manual mask setup", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await upload(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.touchscreen.tap(
    box.x + box.width * 0.27,
    box.y + box.height * 0.5,
  );
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await expect(
    page.getByRole("button", {
      name: "Kleur kiezen voor Muur 1 →",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kleur kiezen voor Muur 1 →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Muur 1", exact: true }),
  ).toBeInViewport();
  await color(page, "#ce3434");
  await expect(
    page.getByRole("button", { name: /Ongedaan maken/ }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
