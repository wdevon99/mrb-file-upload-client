export async function initMultipartUpload({ fileName, contentType, fileSize, apiKey }: { fileName: string; contentType: string; fileSize: number; apiKey: string; }) {
  const res = await fetch("/api/proxy-init-multipart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ fileName, contentType, fileSize }),
  });
  if (!res.ok) throw new Error("Failed to init multipart upload");
  return res.json();
}

export async function uploadPart(url: string, part: Blob) {
  const res = await fetch(url, {
    method: "PUT",
    body: part,
  });
  if (!res.ok) throw new Error("Failed to upload part");
  const eTag = res.headers.get("ETag") || undefined;
  return eTag;
}

export async function completeMultipartUpload({ uuid, parts, apiKey }: { uuid: string; parts: { partNumber: number; eTag: string }[]; apiKey: string; }) {
  const res = await fetch("/api/proxy-complete-multipart", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ uuid, parts }),
  });
  if (!res.ok) throw new Error("Failed to complete multipart upload");
  return res.json();
} 