export type ViewerType =
  | "note"
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "text"
  | "office"
  | "archive"
  | "other";

export function getViewerType(mimeType: string, filename: string = ""): ViewerType {
  const mime = (mimeType || "").toLowerCase();
  const ext = (filename.split(".").pop() || "").toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)
  ) {
    return "audio";
  }

  if (
    mime.startsWith("video/") ||
    ["mp4", "mov", "webm", "mkv"].includes(ext)
  ) {
    return "video";
  }

  if (
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "application/json" ||
    ["txt", "md", "json", "ts", "js", "jsx", "tsx", "py", "html", "css", "yaml", "yml"].includes(ext)
  ) {
    return "text";
  }

  if (
    mime.includes("officedocument") ||
    mime.includes("msword") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext)
  ) {
    return "office";
  }

  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("compressed") ||
    ["zip", "tar", "gz", "7z", "rar"].includes(ext)
  ) {
    return "archive";
  }

  return "other";
}

export function getMimeTypeFromExt(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
  };
  return map[ext] || "application/octet-stream";
}
