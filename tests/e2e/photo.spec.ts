import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.setTimeout(90000);
async function makeFiles(page: Page, width = 1200, height = 800) {
  return page.evaluate(
    ({ width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      function scene(ids: boolean) {
        ctx.fillStyle = ids ? "rgb(0,0,0)" : "#b3a78d";
        ctx.fillRect(0, 0, width, height);
        for (const [id, coords] of [
          [
            1,
            [
              [0.06, 0.08],
              [0.48, 0.16],
              [0.48, 0.88],
              [0.06, 0.88],
            ],
          ],
          [
            2,
            [
              [0.52, 0.16],
              [0.94, 0.08],
              [0.94, 0.88],
              [0.52, 0.88],
            ],
          ],
        ] as [number, number[][]][]) {
          ctx.beginPath();
          coords.forEach(([x, y], i) =>
            i
              ? ctx.lineTo(x * width, y * height)
              : ctx.moveTo(x * width, y * height),
          );
          ctx.closePath();
          ctx.fillStyle = ids ? `rgb(${id},0,0)` : "#c8c0b2";
          ctx.fill();
        }
        ctx.fillStyle = ids ? "rgb(0,0,0)" : "#657c68";
        ctx.fillRect(width * 0.4, height * 0.66, width * 0.2, height * 0.22);
        return c.toDataURL("image/png").split(",")[1];
      }
      return { photo: scene(false), mask: scene(true) };
    },
    { width, height },
  );
}
async function upload(page: Page, w = 1200, h = 800) {
  await page.goto("/studio");
  await expect(page.locator("#surface-select")).toBeVisible();
  const data = await makeFiles(page, w, h);
  await page.locator("#photo-upload").setInputFiles({
    name: "kamerfoto.png",
    mimeType: "image/png",
    buffer: Buffer.from(data.photo, "base64"),
  });
  await expect(page.getByText("kamerfoto.png", { exact: true })).toBeVisible();
  await expect(page.getByText("Foto laden…")).toHaveCount(0);
  return data;
}
async function gpu(page: Page, positions: number[][]) {
  return page.locator("canvas").evaluate(
    (c: HTMLCanvasElement, positions) =>
      new Promise<number[][]>((resolve, reject) =>
        requestAnimationFrame(() => {
          const gl = c.getContext("webgl2");
          if (!gl) {
            reject(new Error("WebGL missing"));
            return;
          }
          resolve(
            positions.map(([x, y]) => {
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
    positions,
  );
}
const delta = (a: number[], b: number[]) =>
  Math.max(...a.map((v, i) => Math.abs(v - b[i])));
test("ordinary landscape photo colors two pixel masks independently, preserves furniture, supports RAL and restores as a photo project", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const data = await upload(page);
  await expect(
    page.getByRole("region", { name: /Interactieve fotoviewer/ }),
  ).toBeVisible();
  await expect(page.locator(".color-palette")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rood", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Maskers corrigeren", { exact: true }).click();
  await page.getByLabel("ID-masker importeren").setInputFiles({
    name: "foto-masker.png",
    mimeType: "image/png",
    buffer: Buffer.from(data.mask, "base64"),
  });
  await expect(page.getByText(/ID-masker geïmporteerd/)).toBeVisible();
  const positions = [
      [0.25, 0.4],
      [0.75, 0.4],
      [0.5, 0.75],
    ],
    before = await gpu(page, positions);
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.4);
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await page.locator("#hex-color").fill("#ce3434");
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.4);
  await expect(page.locator("#surface-select")).toHaveValue("2");
  await page.locator("#paint-brand").selectOption("Sigma");
  await page.locator("#ral-search").fill("5005");
  await page
    .getByRole("button", { name: "RAL 5005 Signaalblauw", exact: true })
    .click();
  await page.locator("#surface-select").selectOption("0");
  const painted = await gpu(page, positions);
  expect(painted[0][0]).toBeGreaterThan(painted[0][2] * 2);
  expect(painted[1][2]).toBeGreaterThan(painted[1][0]);
  expect(delta(painted[2], before[2])).toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "Toon origineel", exact: true })
    .click();
  const original = await gpu(page, positions);
  for (let i = 0; i < 3; i++)
    expect(delta(original[i], before[i])).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Toon kleuren", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project opslaan", exact: true })
    .click();
  const file = await pending,
    bytes = await readFile((await file.path())!);
  expect(JSON.parse(bytes.toString()).projection).toBe("photo");
  await page.reload();
  await page.getByLabel("RoomVision-project openen").setInputFiles({
    name: "foto.roomvision",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.getByText(/Project geopend/)).toBeVisible();
  await expect(page.getByText("Foto laden…")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /Interactieve fotoviewer/ }),
  ).toBeVisible();
  const restored = await gpu(page, positions);
  for (let i = 0; i < 3; i++)
    expect(delta(restored[i], painted[i])).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Inzoomen", exact: true }).click();
  await expect(page.getByText("115%", { exact: true })).toBeVisible();
  const zoomed = await gpu(page, [[0.58, 0.75]]);
  await page.getByRole("region", { name: /Interactieve fotoviewer/ }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  expect(await gpu(page, [[0.58, 0.75]])).not.toEqual(zoomed);
  await page
    .getByRole("button", { name: "Weergave herstellen", exact: true })
    .click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Open de testkamer", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: /Interactieve 360/ }),
  ).toBeVisible();
  await expect(page.getByText("Panorama laden…")).toHaveCount(0);
});
test("mobile portrait photo fits without distortion and supports hand painting, tap selection, zoom and undo", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await upload(page, 800, 1200);
  await expect(
    page.getByRole("region", { name: /Interactieve fotoviewer/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#surface-select").selectOption("1");
  await page
    .getByRole("button", { name: "Begin masker tekenen", exact: true })
    .tap();
  await page.locator("#brush-size").fill("60");
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.getByRole("button", { name: "Rondkijken", exact: true }).tap();
  await page.getByLabel("Toon maskers", { exact: true }).uncheck();
  await page.locator("#surface-select").selectOption("0");
  await canvas.scrollIntoViewIfNeeded();
  const current = (await canvas.boundingBox())!;
  await page.touchscreen.tap(
    current.x + current.width * 0.4,
    current.y + current.height * 0.4,
  );
  await expect(page.locator("#surface-select")).toHaveValue("1");
  await page.locator("#hex-color").fill("#ce3434");
  await page.getByRole("button", { name: "Toepassen", exact: true }).click();
  await page.getByRole("button", { name: /Ongedaan maken/ }).tap();
  await expect(
    page.getByText("Oorspronkelijke foto", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inzoomen", exact: true }).tap();
  await expect(page.getByText("115%", { exact: true })).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const pinchBox = (await canvas.boundingBox())!;
  const x = pinchBox.x + pinchBox.width / 2,
    y = pinchBox.y + pinchBox.height / 2;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 30, y, id: 0 },
      { x: x + 30, y, id: 1 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 60, y, id: 0 },
      { x: x + 60, y, id: 1 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      parseInt(
        (await page
          .locator(".viewer-tools > span:not(.tool-divider)")
          .textContent())!,
      ),
    )
    .toBeGreaterThan(115);
  await context.close();
});
