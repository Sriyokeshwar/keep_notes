import { drive_v3 } from "googleapis";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/db/models/User";
import { Folder } from "../lib/db/models/Folder";
import { Item } from "../lib/db/models/Item";
import { getDriveClient, getUserRootFolderId } from "../lib/storage/google-drive";

const DRY_RUN = process.argv.includes("--dry-run");

function mimeToItemType(mimeType: string): "file" | "note" | "link" {
  return "file";
}

async function hashDriveFile(drive: drive_v3.Drive, fileId: string): Promise<string> {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = res.data as any;
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function importFolder(
  drive: drive_v3.Drive,
  driveFolderId: string,
  mongoFolderId: mongoose.Types.ObjectId | null,
  userId: mongoose.Types.ObjectId
) {
  let pageToken: string | undefined;
  let importedCount = 0;
  let skippedCount = 0;

  do {
    const res = await drive.files.list({
      q: `'${driveFolderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime)",
      pageToken,
      pageSize: 100,
    });

    const files = res.data.files ?? [];

    for (const file of files) {
      if (!file.id || !file.name) continue;

      // Handle nested folder
      if (file.mimeType === "application/vnd.google-apps.folder") {
        let folderDoc = await Folder.findOne({
          ownerId: userId,
          parentFolderId: mongoFolderId,
          name: file.name,
          isTrash: false,
        });

        if (!folderDoc) {
          console.log(`📁 ${DRY_RUN ? "[dry-run] would create folder" : "Creating folder"}: ${file.name}`);
          if (!DRY_RUN) {
            folderDoc = await Folder.create({
              ownerId: userId,
              parentFolderId: mongoFolderId,
              name: file.name,
              driveFolderId: file.id,
            });
          }
        } else if (!folderDoc.driveFolderId && !DRY_RUN) {
          folderDoc.driveFolderId = file.id;
          await folderDoc.save();
        }

        // Recurse into subfolder
        const nextMongoParent = folderDoc?._id || null;
        await importFolder(drive, file.id, nextMongoParent, userId);
        continue;
      }

      // Check for existing item by drive file ID
      const existing = await Item.findOne({
        ownerId: userId,
        storageFileId: file.id,
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      console.log(`📄 ${DRY_RUN ? "[dry-run] would import" : "Importing"}: ${file.name} (${file.mimeType || "unknown"}, ${file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : "0 B"})`);

      if (!DRY_RUN) {
        let checksum = "";
        try {
          checksum = await hashDriveFile(drive, file.id);
        } catch (hashErr) {
          console.warn(`   ⚠️ Warning: Could not compute checksum for ${file.name}:`, hashErr);
        }

        await Item.create({
          ownerId: userId,
          folderId: mongoFolderId,
          type: mimeToItemType(file.mimeType || "application/octet-stream"),
          name: file.name,
          mimeType: file.mimeType || "application/octet-stream",
          size: file.size ? parseInt(file.size, 10) : 0,
          storageFileId: file.id,
          storageProvider: "google_drive",
          checksum,
          createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
        });

        importedCount++;
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { importedCount, skippedCount };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const userIdentifier = args[0];
  let targetFolderId = args[1];

  if (!userIdentifier) {
    console.error("\n❌ Error: Missing user identifier.\n");
    console.log("Usage: npx tsx scripts/import-drive-folder.ts <userEmailOrId> [driveFolderId] [--dry-run]");
    console.log("Examples:");
    console.log("  npx tsx scripts/import-drive-folder.ts owner@vault.local --dry-run");
    console.log("  npx tsx scripts/import-drive-folder.ts owner@vault.local 18hjb9LnXjY8PvDGouBR3ZuvjH62praGQ");
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log(" Google Drive Idempotent Folder Import Tool");
  console.log("=======================================================\n");

  await connectToDatabase();

  let user = null;
  if (mongoose.Types.ObjectId.isValid(userIdentifier)) {
    user = await User.findById(userIdentifier);
  }
  if (!user) {
    user = await User.findOne({ email: userIdentifier.toLowerCase().trim() });
  }

  if (!user) {
    console.error(`❌ User not found with ID/email: "${userIdentifier}"`);
    process.exit(1);
  }

  console.log(`👤 User: ${user.name} (${user.email}, ID: ${user._id})`);

  let drive: drive_v3.Drive;
  try {
    drive = await getDriveClient(user._id.toString());
  } catch (err: any) {
    console.error(`❌ Could not initialize Google Drive client: ${err.message}`);
    process.exit(1);
  }

  // If no folder ID passed, resolve or auto-create the user's root folder
  if (!targetFolderId) {
    console.log(`🔍 No folder ID specified. Resolving user's root "Personal Knowledge Vault" folder in Drive...`);
    targetFolderId = await getUserRootFolderId(user._id.toString());
    console.log(`📁 Resolved root folder ID: ${targetFolderId}`);
  } else {
    console.log(`📁 Target folder ID: ${targetFolderId}`);
  }

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE ENABLED — No changes will be written to MongoDB.\n");
  }

  const startTime = Date.now();
  await importFolder(drive, targetFolderId, null, user._id);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Import process completed in ${elapsed}s.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Fatal error during Drive import:", err);
  process.exit(1);
});
