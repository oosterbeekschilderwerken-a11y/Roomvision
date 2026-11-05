export type ImageKind = "panorama" | "photo";
export const MAX_MASK_PIXELS = 2048 * 1024;
export function maskDimensions(width: number, height: number, kind: ImageKind) {
  const scale =
    kind === "panorama"
      ? Math.min(1, 2048 / width, 1024 / height)
      : Math.min(
          1,
          2048 / width,
          2048 / height,
          Math.sqrt(MAX_MASK_PIXELS / (width * height)),
        );
  return {
    width: Math.max(
      1,
      kind === "panorama"
        ? Math.round(width * scale)
        : Math.floor(width * scale),
    ),
    height: Math.max(
      1,
      kind === "panorama"
        ? Math.round(height * scale)
        : Math.floor(height * scale),
    ),
  };
}
