import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { connectToDatabase } from "../db/connect";
import { User } from "../db/models/User";
import {
  IStorageProvider,
  StorageDownloadResult,
  StorageStreamResult,
  StorageUploadResult,
} from "./types";

export const ROOT_FOLDER_NAME = "Personal Knowledge Vault";

/**
 * Returns the Drive folder ID that acts as this user's app-owned storage
 * root, creating it on first use. Because the app creates this folder
 * itself, it's automatically covered by the drive.file scope — no Picker
 * consent needed.
 */
export async function ensureRootFolder(
  drive: drive_v3.Drive,
  userId: string
): Promise<string> {
  await connectToDatabase();
  const user = await User.findById(userId);
  if (user?.driveRootFolderId) {
    try {
      const existing = await drive.files.get({
        fileId: user.driveRootFolderId,
        fields: "id, trashed",
      });
      if (!existing.data.trashed) {
        return user.driveRootFolderId;
      }
    } catch {
      // Folder was deleted or is inaccessible — fall through to recreate
    }
  }

  const res = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      appProperties: { app: "personal-knowledge-vault" },
    },
    fields: "id",
  });

  const folderId = res.data.id!;
  await User.findByIdAndUpdate(userId, { driveRootFolderId: folderId });
  return folderId;
}

/**
 * Builds an authenticated Google Drive client for a given user from their
 * stored OAuth credentials (supports offline refresh tokens).
 */
export async function getDriveClient(userId: string): Promise<drive_v3.Drive> {
  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  if (user.googleRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
      access_token: user.googleAccessToken,
    });
  } else if (user.googleAccessToken) {
    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
    });
  } else {
    throw new Error(
      `User ${user.email} does not have Google OAuth credentials stored. Please sign in with Google.`
    );
  }

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Convenience helper to fetch or create the app's root folder ID for a user.
 */
export async function getUserRootFolderId(userId: string): Promise<string> {
  const drive = await getDriveClient(userId);
  return ensureRootFolder(drive, userId);
}

export class GoogleDriveStorageProvider implements IStorageProvider {
  readonly name = "google_drive" as const;
  private authClient: ReturnType<typeof google.auth.fromJSON> | null = null;
  private drive: drive_v3.Drive | null = null;
  private accessToken?: string;
  private userId?: string;

  constructor(accessToken?: string, userId?: string) {
    this.accessToken = accessToken;
    this.userId = userId;
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

    let parentFolderId = metadata.storageFolderId;
    if (!parentFolderId && this.userId) {
      try {
        parentFolderId = await ensureRootFolder(drive, this.userId);
      } catch (err) {
        console.warn("Could not ensure root folder in Drive:", err);
      }
    }

    const fileMetadata: { name: string; parents?: string[] } = {
      name: metadata.name,
    };
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
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

    let parentId = parentStorageFolderId;
    if (!parentId && this.userId) {
      try {
        parentId = await ensureRootFolder(drive, this.userId);
      } catch (err) {
        console.warn("Could not ensure root folder for folder creation:", err);
      }
    }

    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
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
