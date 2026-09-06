import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { drive_v3 } from "googleapis";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/db/models/User";
import { Folder } from "../lib/db/models/Folder";
import { Item } from "../lib/db/models/Item";
import { getDriveClient, getUserRootFolderId, ensureRootFolder } from "../lib/storage/google-drive";

const DRY_RUN = process.argv.includes("--dry-run");
const DELETE_LOCAL = process.argv.includes("--delete-local");
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./vault-storage";

async function ensureFolderInDrive(
  drive: drive_v3.Drive,
  userId: mongoose.Types.ObjectId,
  folderId: mongoose.Types.ObjectId,
  userRootFolderId: string
): Promise<string> {
  const folder = await Folder.findById(folderId);
  if (!folder) return userRootFolderId;

  if (folder.driveFolderId) {
    return folder.driveFolderId;
  }

  let parentDriveId = userRootFolderId;
  if (folder.parentFolderId) {
    parentDriveId = await ensureFolderInDrive(drive, userId, folder.parentFolderId, userRootFolderId);
  }

  if (DRY_RUN) {
    return "dry-run-folder-id";
  }

  const res = await drive.files.create({
    requestBody: {
      name: folder.name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentDriveId],
    },
    fields: "id",
  });

  const newDriveFolderId = res.data.id!;
  folder.driveFolderId = newDriveFolderId;
  await folder.save();
  return newDriveFolderId;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const userIdentifier = args[0];

  if (!userIdentifier) {
    console.error("\n❌ Error: Missing user identifier.\n");
    console.log("Usage: npx tsx scripts/migrate-local-to-drive.ts <userEmailOrId> [--dry-run] [--delete-local]");
    console.log("Example:");
    console.log("  npx tsx scripts/migrate-local-to-drive.ts owner@vault.local --dry-run");
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log(" Local-to-Google-Drive Storage Migration Tool");
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

  const userRootFolderId = await getUserRootFolderId(user._id.toString());
  console.log(`📁 User Drive Root Folder ID: ${userRootFolderId}`);

  // Query all local items for this user
  const localItems = await Item.find({
    ownerId: user._id,
    storageProvider: "local",
    storageFileId: { $exists: true, $ne: null },
    isTrash: false,
  });

  console.log(`📦 Found ${localItems.length} local file items to migrate.\n`);

  if (localItems.length === 0) {
    console.log("Nothing to migrate. All files are already stored on Google Drive!");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE — No files will be uploaded or modified in MongoDB.\n");
  }

  let migratedCount = 0;
  let failedCount = 0;

  for (const item of localItems) {
    const localFilePath = path.resolve(process.cwd(), LOCAL_STORAGE_DIR, item.storageFileId!);
    if (!fs.existsSync(localFilePath)) {
      console.warn(`⚠️ Local file missing on disk: ${localFilePath} (Item: ${item.name})`);
      failedCount++;
      continue;
    }

    const fileSize = fs.statSync(localFilePath).size;
    console.log(`🔄 Migrating: ${item.name} (${(fileSize / 1024).toFixed(1)} KB)...`);

    if (DRY_RUN) {
      console.log(`   [dry-run] Would upload to Drive and update Item ${item._id}`);
      migratedCount++;
      continue;
    }

    try {
      let targetDriveFolderId = userRootFolderId;
      if (item.folderId) {
        targetDriveFolderId = await ensureFolderInDrive(drive, user._id, item.folderId, userRootFolderId);
      }

      const fileStream = fs.createReadStream(localFilePath);
      const res = await drive.files.create({
        requestBody: {
          name: item.name,
          parents: [targetDriveFolderId],
        },
        media: {
          mimeType: item.mimeType || "application/octet-stream",
          body: fileStream,
        },
        fields: "id, size",
      });

      const newDriveFileId = res.data.id!;
      const oldStorageFileId = item.storageFileId;

      item.storageFileId = newDriveFileId;
      item.storageProvider = "google_drive";
      item.updatedAt = new Date();
      await item.save();

      console.log(`   ✓ Uploaded to Drive (ID: ${newDriveFileId}) & updated Mongo record.`);

      if (DELETE_LOCAL) {
        fs.unlinkSync(localFilePath);
        console.log(`   🗑️ Deleted local copy (${oldStorageFileId}).`);
      }

      migratedCount++;
    } catch (uploadErr) {
      console.error(`   ❌ Failed to migrate ${item.name}:`, uploadErr);
      failedCount++;
    }
  }

  console.log(`\n=======================================================`);
  console.log(`Migration Summary:`);
  console.log(`  ✓ Successfully migrated: ${migratedCount}`);
  if (failedCount > 0) {
    console.log(`  ❌ Failed/Missing:       ${failedCount}`);
  }
  console.log(`=======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
