import { API_URL } from "@/config";

export async function compressImage(
  file: File,
  quality = 0.5,
  maxDim = 1280,
): Promise<{ blob: Blob; ext: string; type: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Gagal baca gambar"));
      i.src = url;
    });

    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const r = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * r);
      height = Math.round(height * r);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Kompres gagal"))),
        "image/jpeg",
        quality,
      );
    });
    return { blob, ext: "jpg", type: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
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

  if (isImage) {
    const c = await compressImage(file, 0.5);
    payload = c.blob;
    outName = outName.replace(/\.\w+$/, "") + ".jpg";
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
