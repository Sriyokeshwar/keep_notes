import { Readable } from "stream";

export interface StorageUploadResult {
  storageFileId: string;
  size: number;
  webViewLink?: string;
  provider: "google_drive" | "local";
}

export interface StorageDownloadResult {
  stream: Readable;
  mimeType: string;
  size: number;
}

export interface StorageStreamResult {
  stream: Readable;
  contentLength: number;
  contentType: string;
  contentRange?: string;
  statusCode: number; // 200 or 206
}

export interface IStorageProvider {
  readonly name: "google_drive" | "local";
  upload(
    buffer: Buffer,
    metadata: {
      name: string;
      mimeType: string;
      storageFolderId?: string;
    }
  ): Promise<StorageUploadResult>;

  download(storageFileId: string): Promise<StorageDownloadResult>;

  getStream(
    storageFileId: string,
    range?: { start: number; end: number }
  ): Promise<StorageStreamResult>;

  delete(storageFileId: string): Promise<void>;

  createFolder?(
    name: string,
    parentStorageFolderId?: string
  ): Promise<string>;
}
