import { API_URL } from "@/config";

type DecodedImage = { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void };

async function decodeWithImageBitmap(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file);
    return {
      width: bmp.width,
      height: bmp.height,
      draw: (ctx, w, h) => {
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close?.();
      },
    };
  } catch {
    return null;
  }
}

async function decodeWithImgElement(file: File): Promise<DecodedImage | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode-failed"));
      i.src = url;
    });
    try { await img.decode?.(); } catch {}
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  } catch {
    return null;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function isLikelyHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return /\.(heic|heif)$/.test(name) || /heic|heif/.test(file.type);
}

export async function compressImage(
  file: File,
  quality = 0.7,
  maxDim = 1600,
): Promise<{ blob: Blob; ext: string; type: string }> {
  if (isLikelyHeic(file)) {
    throw new Error(
      "Format HEIC/HEIF dari iPhone belum didukung. Buka Pengaturan > Kamera > Format > pilih 'Paling Kompatibel', atau ubah foto ke JPG/PNG dulu.",
    );
  }

  const decoded =
    (await decodeWithImageBitmap(file)) ?? (await decodeWithImgElement(file));

  if (!decoded || !decoded.width || !decoded.height) {
    throw new Error("Gagal baca gambar. Coba foto lain (JPG/PNG/WebP).");
  }

  let { width, height } = decoded;
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height);
    width = Math.max(1, Math.round(width * r));
    height = Math.max(1, Math.round(height * r));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung di browser ini.");
  try {
    decoded.draw(ctx, width, height);
  } catch {
    throw new Error("Gagal proses gambar. Coba foto lain.");
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    } catch {
      resolve(null);
    }
  });
  if (!blob) throw new Error("Kompres gambar gagal. Coba foto lain.");
  return { blob, ext: "jpg", type: "image/jpeg" };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(new Error("Gagal encode file"));
    r.readAsDataURL(blob);
  });
}

export interface UploadResult {
  url: string;
  type: "image" | "video" | "file";
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  let payload: Blob = file;
  let outName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!outName) outName = "file";

  if (isImage) {
    try {
      const c = await compressImage(file, 0.7);
      payload = c.blob;
      outName = outName.replace(/\.\w+$/, "") + ".jpg";
    } catch (err) {
      // Kalau kompresi gagal tapi file kecil & format umum, kirim mentah.
      const fallbackOk =
        file.size <= 5 * 1024 * 1024 &&
        /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type);
      if (!fallbackOk) throw err;
    }
  } else if (isVideo) {
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error("Video terlalu besar. Maksimum 25 MB.");
    }
  }

  const content = await blobToBase64(payload);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: outName, content }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Upload gagal");
  }
  return {
    url: data.content?.download_url as string,
    type: isImage ? "image" : isVideo ? "video" : "file",
  };
}
