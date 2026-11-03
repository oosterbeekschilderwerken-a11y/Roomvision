import type { Mask } from "./surfaces";
const LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
// Estimate each material's well-lit luminance; do not borrow another wall's base.
// Histograms bound memory independently of panorama dimensions.
export function estimateLighting(
  mask: Mask,
  image: { width: number; height: number; data: Uint8ClampedArray },
): number[] {
  const hist = Array.from({ length: 16 }, () => new Uint32Array(256)),
    counts = new Uint32Array(16);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const id =
        mask.pixels[
          Math.min(
            mask.height - 1,
            Math.floor(((y + 0.5) * mask.height) / image.height),
          ) *
            mask.width +
            Math.min(
              mask.width - 1,
              Math.floor(((x + 0.5) * mask.width) / image.width),
            )
        ];
      if (!id || id > 8) continue;
      const p = (y * image.width + x) * 4;
      const l =
        0.2126 * LINEAR[image.data[p]] +
        0.7152 * LINEAR[image.data[p + 1]] +
        0.0722 * LINEAR[image.data[p + 2]];
      if (l < 0.005 || l > 0.98) continue;
      hist[id][Math.round(l * 255)]++;
      counts[id]++;
    }
  return Array.from({ length: 16 }, (_, id) => {
    if (!counts[id]) return 0.55;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += hist[id][i];
      if (sum >= counts[id] * 0.75) return Math.max(0.04, i / 255);
    }
    return 0.55;
  });
}
