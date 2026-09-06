import fs from "fs";
import path from "path";
import { Readable } from "stream";
import crypto from "crypto";
import {
  IStorageProvider,
  StorageDownloadResult,
  StorageStreamResult,
  StorageUploadResult,
} from "./types";
import { getMimeTypeFromExt } from "../utils/mime";

export class LocalStorageProvider implements IStorageProvider {
  readonly name = "local" as const;
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(
      process.cwd(),
      process.env.LOCAL_STORAGE_DIR || "./vault-storage"
    );
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(storageFileId: string): string {
    // Sanitize storageFileId to prevent path traversal
    const safeId = path.basename(storageFileId).replace(/[\x00-\x1f\x7f/\\]/g, "");
    const resolvedPath = path.resolve(this.baseDir, safeId);

    // Strict path traversal defense: must reside directly under baseDir
    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new Error("Security Error: Invalid storage file path");
    }

    return resolvedPath;
  }

  async upload(
    buffer: Buffer,
    metadata: {
      name: string;
      mimeType: string;
      storageFolderId?: string;
    }
  ): Promise<StorageUploadResult> {
    const rawExt = path.extname(metadata.name) || "";
    // Only allow safe alphanumeric characters in extension
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 10);
    const uniqueId = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${cleanExt}`;
    const filePath = this.getFilePath(uniqueId);

    await fs.promises.writeFile(filePath, buffer);

    return {
      storageFileId: uniqueId,
      size: buffer.length,
      provider: "local",
    };
  }

  async download(storageFileId: string): Promise<StorageDownloadResult> {
    const filePath = this.getFilePath(storageFileId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${storageFileId}`);
    }

    const stat = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    const mimeType = getMimeTypeFromExt(storageFileId);

    return {
      stream,
      mimeType,
      size: stat.size,
    };
  }

  async getStream(
    storageFileId: string,
    range?: { start: number; end: number }
  ): Promise<StorageStreamResult> {
    const filePath = this.getFilePath(storageFileId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${storageFileId}`);
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const mimeType = getMimeTypeFromExt(storageFileId);

    if (range) {
      const start = Math.max(0, range.start);
      const end = Math.min(Math.max(start, range.end), fileSize - 1);
      const contentLength = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      return {
        stream,
        contentLength,
        contentType: mimeType,
        contentRange: `bytes ${start}-${end}/${fileSize}`,
        statusCode: 206,
      };
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      contentLength: fileSize,
      contentType: mimeType,
      statusCode: 200,
    };
  }

  async delete(storageFileId: string): Promise<void> {
    const filePath = this.getFilePath(storageFileId);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async createFolder(name: string): Promise<string> {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
    const folderId = `folder_${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeName}`;
    return folderId;
  }
}
