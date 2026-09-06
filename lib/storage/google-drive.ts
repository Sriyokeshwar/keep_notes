import { google } from "googleapis";
import { Readable } from "stream";
import {
  IStorageProvider,
  StorageDownloadResult,
  StorageStreamResult,
  StorageUploadResult,
} from "./types";

export class GoogleDriveStorageProvider implements IStorageProvider {
  readonly name = "google_drive" as const;
  private authClient: ReturnType<typeof google.auth.fromJSON> | null = null;
  private drive: ReturnType<typeof google.drive> | null = null;
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
    this.initDrive();
  }

  private initDrive() {
    if (this.accessToken) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: this.accessToken });
      this.drive = google.drive({ version: "v3", auth: oauth2Client });
    } else if (
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    ) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      this.drive = google.drive({ version: "v3", auth: oauth2Client });
    }
  }

  private ensureDrive() {
    if (!this.drive) {
      throw new Error(
        "Google Drive is not configured. Please provide Google OAuth credentials in .env.local or sign in with Google."
      );
    }
    return this.drive;
  }

  async upload(
    buffer: Buffer,
    metadata: {
      name: string;
      mimeType: string;
      storageFolderId?: string;
    }
  ): Promise<StorageUploadResult> {
    const drive = this.ensureDrive();
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata: { name: string; parents?: string[] } = {
      name: metadata.name,
    };
    if (metadata.storageFolderId) {
      fileMetadata.parents = [metadata.storageFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: metadata.mimeType,
        body: stream,
      },
      fields: "id, size, webViewLink",
    });

    if (!response.data.id) {
      throw new Error("Failed to create file on Google Drive: No ID returned");
    }

    return {
      storageFileId: response.data.id,
      size: Number(response.data.size) || buffer.length,
      webViewLink: response.data.webViewLink || undefined,
      provider: "google_drive",
    };
  }

  async download(storageFileId: string): Promise<StorageDownloadResult> {
    const drive = this.ensureDrive();

    const meta = await drive.files.get({
      fileId: storageFileId,
      fields: "mimeType, size",
    });

    const response = await drive.files.get(
      { fileId: storageFileId, alt: "media" },
      { responseType: "stream" }
    );

    return {
      stream: response.data as unknown as Readable,
      mimeType: meta.data.mimeType || "application/octet-stream",
      size: Number(meta.data.size) || 0,
    };
  }

  async getStream(
    storageFileId: string,
    range?: { start: number; end: number }
  ): Promise<StorageStreamResult> {
    const drive = this.ensureDrive();

    const meta = await drive.files.get({
      fileId: storageFileId,
      fields: "mimeType, size",
    });

    const fileSize = Number(meta.data.size) || 0;
    const contentType = meta.data.mimeType || "application/octet-stream";

    const headers: Record<string, string> = {};
    if (range) {
      const start = range.start;
      const end = range.end ? Math.min(range.end, fileSize - 1) : fileSize - 1;
      headers["Range"] = `bytes=${start}-${end}`;

      const response = await drive.files.get(
        { fileId: storageFileId, alt: "media" },
        { responseType: "stream", headers }
      );

      return {
        stream: response.data as unknown as Readable,
        contentLength: end - start + 1,
        contentType,
        contentRange: `bytes ${start}-${end}/${fileSize}`,
        statusCode: 206,
      };
    }

    const response = await drive.files.get(
      { fileId: storageFileId, alt: "media" },
      { responseType: "stream" }
    );

    return {
      stream: response.data as unknown as Readable,
      contentLength: fileSize,
      contentType,
      statusCode: 200,
    };
  }

  async delete(storageFileId: string): Promise<void> {
    const drive = this.ensureDrive();
    await drive.files.delete({ fileId: storageFileId });
  }

  async createFolder(
    name: string,
    parentStorageFolderId?: string
  ): Promise<string> {
    const drive = this.ensureDrive();
    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentStorageFolderId) {
      fileMetadata.parents = [parentStorageFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    if (!response.data.id) {
      throw new Error("Failed to create folder on Google Drive");
    }

    return response.data.id;
  }
}
