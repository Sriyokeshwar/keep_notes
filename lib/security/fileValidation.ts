import path from "path";
import { Item } from "../db/models/Item";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_USER_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB

// Prohibited executable and dangerous extensions
const DISALLOWED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs", ".vbe",
  ".js", ".jse", ".wsf", ".wsh", ".msc", ".msi", ".msp", ".com",
  ".scr", ".hta", ".cpl", ".jar", ".dll", ".sys", ".drv"
]);

/**
 * Validates actual magic bytes / file signatures to prevent MIME spoofing.
 */
export function validateFileSignature(
  buffer: Buffer,
  declaredMime: string,
  extension: string
): { isValid: boolean; detectedType?: string; error?: string } {
  const ext = extension.toLowerCase();
  const mime = declaredMime.toLowerCase();

  if (buffer.length === 0) {
    return { isValid: false, error: "Empty file is not allowed" };
  }

  // 1. Disallow executables based on extension
  if (DISALLOWED_EXTENSIONS.has(ext)) {
    return { isValid: false, error: `File extension ${ext} is strictly prohibited` };
  }

  // Check for Windows PE executable header (MZ)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, error: "Executable binaries (PE/MZ) are strictly prohibited" };
  }

  // Check for ELF executable header (\x7fELF)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return { isValid: false, error: "Linux ELF executable binaries are strictly prohibited" };
  }

  // 2. Magic byte signatures for common types
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (ext === ".png" || mime === "image/png") {
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (!isPng) return { isValid: false, error: "File signature does not match PNG format" };
    return { isValid: true, detectedType: "image/png" };
  }

  // JPEG: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg" || mime === "image/jpeg") {
    const isJpg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    if (!isJpg) return { isValid: false, error: "File signature does not match JPEG format" };
    return { isValid: true, detectedType: "image/jpeg" };
  }

  // GIF: 47 49 46 38 (GIF8)
  if (ext === ".gif" || mime === "image/gif") {
    const isGif =
      buffer.length >= 4 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38;
    if (!isGif) return { isValid: false, error: "File signature does not match GIF format" };
    return { isValid: true, detectedType: "image/gif" };
  }

  // PDF: 25 50 44 46 (%PDF)
  if (ext === ".pdf" || mime === "application/pdf") {
    const isPdf =
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;
    if (!isPdf) return { isValid: false, error: "File signature does not match PDF format" };
    return { isValid: true, detectedType: "application/pdf" };
  }

  // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (ext === ".webp" || mime === "image/webp") {
    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (!isWebp) return { isValid: false, error: "File signature does not match WebP format" };
    return { isValid: true, detectedType: "image/webp" };
  }

  // ZIP / DOCX / XLSX / PPTX: 50 4B 03 04 (PK..)
  if (
    [".zip", ".docx", ".xlsx", ".pptx"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("officedocument")
  ) {
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
    if (!isZip) return { isValid: false, error: "File signature does not match archive/office format" };
    return { isValid: true, detectedType: mime };
  }

  // Audio MP3: ID3 (49 44 33) or MPEG sync (FF FB / FF F3 / FF F2)
  if (ext === ".mp3" || mime === "audio/mpeg") {
    const isId3 =
      buffer.length >= 3 &&
      buffer[0] === 0x49 &&
      buffer[1] === 0x44 &&
      buffer[2] === 0x33;
    const isMpegSync =
      buffer.length >= 2 &&
      buffer[0] === 0xff &&
      (buffer[1] & 0xe0) === 0xe0;
    if (!isId3 && !isMpegSync) {
      return { isValid: false, error: "File signature does not match MP3 audio format" };
    }
    return { isValid: true, detectedType: "audio/mpeg" };
  }

  // Audio/Video MP4 / MOV: check for ftyp box in first 32 bytes
  if ([".mp4", ".mov", ".m4a"].includes(ext) || mime.startsWith("video/mp4") || mime.startsWith("audio/mp4")) {
    const headerString = buffer.slice(0, 32).toString("binary");
    if (!headerString.includes("ftyp") && !headerString.includes("moov")) {
      return { isValid: false, error: "File signature does not match MP4/MOV media format" };
    }
    return { isValid: true, detectedType: mime };
  }

  return { isValid: true, detectedType: mime };
}

/**
 * Sanitizes SVG files to prevent Stored XSS via embedded scripts or event handlers.
 */
export function sanitizeSvg(svgBuffer: Buffer): Buffer {
  let svg = svgBuffer.toString("utf-8");

  // Remove script tags and content
  svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove inline event handlers like onload, onerror, onclick, etc.
  svg = svg.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  svg = svg.replace(/\s+on[a-z]+\s*=\s*[^"'\s>]+/gi, "");

  // Remove javascript: and vbscript: URIs
  svg = svg.replace(/href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'href="#"');
  svg = svg.replace(/xlink:href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'xlink:href="#"');

  return Buffer.from(svg, "utf-8");
}

/**
 * Sanitizes uploaded filenames to prevent path traversal and control character injection.
 */
export function sanitizeFilename(filename: string): string {
  // Extract base filename without path
  let safe = path.basename(filename);

  // Remove null bytes and control characters
  safe = safe.replace(/[\x00-\x1f\x7f]/g, "");

  // Replace backslashes and slashes
  safe = safe.replace(/[/\\]/g, "_");

  // Remove directory traversal tokens
  safe = safe.replace(/\.\.+/g, ".");

  // Trim whitespace and limit length
  safe = safe.trim().slice(0, 150);

  return safe || "Untitled_File";
}

/**
 * Checks if adding the new file size exceeds the user's storage quota.
 */
export async function checkUserStorageQuota(
  userId: string,
  newFileSizeBytes: number
): Promise<{ allowed: boolean; usedBytes: number; quotaBytes: number }> {
  const items = await Item.aggregate([
    { $match: { ownerId: userId, isTrash: false } },
    { $group: { _id: null, totalSize: { $sum: "$size" } } },
  ]);

  const usedBytes = items[0]?.totalSize || 0;
  const quotaBytes = MAX_USER_STORAGE_BYTES;

  if (usedBytes + newFileSizeBytes > quotaBytes) {
    return { allowed: false, usedBytes, quotaBytes };
  }

  return { allowed: true, usedBytes, quotaBytes };
}
