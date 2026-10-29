/** Longest side of a stored photo: sharp on an iPhone screen, about 0.2–0.4 MB as JPEG. */
export const MAX_PHOTO_SIDE = 1280;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

export class PhotoError extends Error {}

export function fitInside(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new PhotoError('Das Bild konnte nicht gelesen werden. Bitte wähle ein JPEG-, PNG- oder HEIC-Foto.')); };
    img.src = url;
  });
}

/**
 * Downscales and re-encodes a picked or taken photo as JPEG. The browser applies the EXIF
 * orientation when decoding, and re-encoding drops all metadata (e.g. GPS location).
 */
export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  if (!file.type.startsWith('image/') && file.type !== '') throw new PhotoError('Bitte wähle ein Bild aus.');
  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) throw new PhotoError('Das Bild ist leer.');
  const { width, height } = fitInside(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('Dieses Gerät kann das Bild nicht verarbeiten.');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new PhotoError('Das Bild konnte nicht gespeichert werden.');
  return { blob, width, height };
}
