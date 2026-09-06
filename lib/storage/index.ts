import { IStorageProvider } from "./types";
import { LocalStorageProvider } from "./local";
import { GoogleDriveStorageProvider } from "./google-drive";

export * from "./types";
export * from "./local";
export * from "./google-drive";

let localProviderInstance: LocalStorageProvider | null = null;

export function getStorageProvider(
  accessToken?: string,
  userId?: string
): IStorageProvider {
  const preferred = process.env.STORAGE_PROVIDER?.toLowerCase();

  if (
    (preferred === "google_drive" || accessToken) &&
    (accessToken || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET))
  ) {
    try {
      return new GoogleDriveStorageProvider(accessToken, userId);
    } catch (err) {
      console.warn("Failed to initialize Google Drive provider, falling back to LocalStorageProvider", err);
    }
  }

  if (!localProviderInstance) {
    localProviderInstance = new LocalStorageProvider();
  }
  return localProviderInstance;
}
