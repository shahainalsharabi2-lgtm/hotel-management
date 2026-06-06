/** صيغ أيقونة الدولة المقبولة عند الرفع — تُحفظ في قاعدة البيانات كـ data URL. */
export const FLAG_UPLOAD_EXTENSIONS = [
  'svg',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
  'avif',
] as const;

export const FLAG_UPLOAD_ACCEPT = FLAG_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** حد الرفع قبل الضغط */
export const MAX_FLAG_UPLOAD_BYTES = 512_000;

const EXT_PATTERN = new RegExp(`\\.(${FLAG_UPLOAD_EXTENSIONS.join('|')})$`, 'i');

export function isAllowedFlagUploadFile(file: File): boolean {
  const mime = (file.type ?? '').trim().toLowerCase();
  if (mime.startsWith('image/')) {
    return true;
  }
  return EXT_PATTERN.test(file.name);
}

export function readFlagUploadAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function isStoredFlagDataUrl(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  return trimmed.startsWith('data:') && trimmed.includes('base64,');
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = dataUrl;
  });
}

function rasterizeToDataUrl(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: 'image/jpeg' | 'image/webp',
  quality: number,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  try {
    if (mime === 'image/webp') {
      const webp = canvas.toDataURL('image/webp', quality);
      if (webp.startsWith('data:image/webp')) {
        return webp;
      }
    }
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

/** تصغير صورة العلم لتُحفظ داخل Description في SQL (حد العمود 1024 حرفاً) */
export async function compressFlagDataUrlForDb(dataUrl: string, maxLength: number): Promise<string> {
  const trimmed = (dataUrl ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const img = await loadImageElement(trimmed);
  const sourceW = img.naturalWidth || img.width || 48;
  const sourceH = img.naturalHeight || img.height || 32;
  const aspect = sourceH / Math.max(sourceW, 1);

  const widths = [72, 56, 48, 40, 32, 28, 24, 20, 16];
  const qualities = [0.82, 0.68, 0.55, 0.42, 0.32, 0.24, 0.18, 0.12];

  for (const width of widths) {
    const height = Math.max(1, Math.round(width * aspect));
    for (const quality of qualities) {
      for (const mime of ['image/webp', 'image/jpeg'] as const) {
        const encoded = rasterizeToDataUrl(img, width, height, mime, quality);
        if (encoded && encoded.length <= maxLength) {
          return encoded;
        }
      }
    }
  }

  throw new Error('compress failed');
}

export async function prepareFlagDataUrlForDbStorage(dataUrl: string, maxLength: number): Promise<string> {
  const trimmed = (dataUrl ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  try {
    return await compressFlagDataUrlForDb(trimmed, maxLength);
  } catch {
    return '';
  }
}
