import type { ImageKind } from "./image-kind.ts";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 8192;
export function validateFile(type: string, size: number): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(type))
    return "Kies een JPG-, PNG- of WebP-foto. Dit bestandstype wordt niet ondersteund.";
  if (size > MAX_FILE_BYTES)
    return "Deze foto is te groot. Kies een bestand van maximaal 25 MB.";
  return null;
}
export function validateDimensions(
  width: number,
  height: number,
  kind: ImageKind = "panorama",
): string | null {
  if (kind === "photo") {
    if (width < 256 || height < 256)
      return "Deze foto is te klein. Gebruik minimaal 256 × 256 pixels.";
    if (
      width > MAX_IMAGE_EDGE ||
      height > MAX_IMAGE_EDGE ||
      width * height > 8192 * 4096
    )
      return "Deze foto heeft te veel pixels. Gebruik maximaal 8192 pixels per zijde en 33 megapixels.";
    return null;
  }
  if (width < 1024 || height < 512)
    return "Deze foto is te klein. Gebruik minimaal 1024 × 512 pixels.";
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE)
    return "Deze foto heeft te veel pixels. Verklein de foto tot maximaal 8192 × 4096 pixels.";
  if (Math.abs(width / height - 2) > 0.02)
    return "Deze foto heeft niet de juiste verhouding. Gebruik een 2:1-equirectangulair panorama, bijvoorbeeld 4096 × 2048 pixels.";
  return null;
}
