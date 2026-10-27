import { maskFromRGBA, type Mask } from "./surfaces";
export async function readMask(
  source: string,
  width?: number,
  height?: number,
): Promise<Mask> {
  const image = new Image();
  image.src = source;
  await image.decode();
  if (image.width > 2048 || image.height > 1024)
    throw new Error("Maskers mogen maximaal 2048 × 1024 pixels bevatten.");
  if ((width && image.width !== width) || (height && image.height !== height))
    throw new Error(
      `Het masker moet exact ${width} × ${height} pixels groot zijn en bij dit panorama horen.`,
    );
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Masker kon niet worden gelezen.");
  context.drawImage(image, 0, 0);
  return maskFromRGBA(
    image.width,
    image.height,
    context.getImageData(0, 0, image.width, image.height).data,
  );
}
export function downloadMask(mask: Mask) {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.pixels.length; i++) {
    image.data[i * 4] = mask.pixels[i];
    image.data[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roomvision-surface-ids.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
