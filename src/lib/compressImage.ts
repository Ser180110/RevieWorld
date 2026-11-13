"use client";

import { PHOTO_TYPES } from "./photos";

/**
 * Shrinks a photo in the browser before upload: phone cameras make 4-12 MB
 * files, which are slow to send and to show. The result is a JPEG at most
 * `maxSide` px wide/tall. If the browser cannot decode the file, the original
 * is returned when it is already an accepted type, otherwise null.
 */
export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.82, maxBytes }: { maxSide?: number; quality?: number; maxBytes: number },
): Promise<{ blob: Blob; type: string; ext: string } | null> {
  const original = () =>
    PHOTO_TYPES[file.type] && file.size <= maxBytes ? { blob: file as Blob, type: file.type, ext: PHOTO_TYPES[file.type] } : null;

  // Small accepted files are fine as they are (and keep PNG transparency).
  if (PHOTO_TYPES[file.type] && file.size <= 300 * 1024) return original();

  try {
    const bitmap = await decode(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap.source, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size > maxBytes) return original();
    // Keep the original if re-encoding made it bigger.
    if (PHOTO_TYPES[file.type] && file.size <= blob.size) return original();
    return { blob, type: "image/jpeg", ext: "jpg" };
  } catch {
    return original();
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the EXIF rotation of phone photos.
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // Fall back to <img> below.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    // The image stays drawable after revoking once it is decoded.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
