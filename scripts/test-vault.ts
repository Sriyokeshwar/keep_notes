import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/db/models/User";
import { Folder } from "../lib/db/models/Folder";
import { Item } from "../lib/db/models/Item";
import { Note } from "../lib/db/models/Note";
import { NoteVersion } from "../lib/db/models/NoteVersion";
import { FileVersion } from "../lib/db/models/FileVersion";
import { Permission } from "../lib/db/models/Permission";
import { getStorageProvider } from "../lib/storage";
import { calculateBufferChecksum } from "../lib/utils/checksum";
import { extractLinkMetadata } from "../lib/utils/linkPreview";
import { getViewerType } from "../lib/utils/mime";
import { verifyFolderAccess, verifyItemAccess } from "../lib/auth/permissions";

async function runTests() {
  console.log("🚀 Starting Personal Knowledge Vault System Verification...\n");

  // 1. Database Connection
  console.log("1. Testing MongoDB connection...");
  const db = await connectToDatabase();
  console.log("   ✓ Connected to MongoDB successfully.\n");

  // Clean up any previous test artifacts
  await User.deleteMany({ email: /test.*@vault\.test/ });
  await Folder.deleteMany({ name: /TestFolder/ });
  await Item.deleteMany({ name: /Test/ });

  // 2. User & Owner Provisioning
  console.log("2. Testing User creation & ACL...");
  const owner = await User.create({
    name: "Vault Test Owner",
    email: "testowner@vault.test",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=testowner",
  });
  const friend = await User.create({
    name: "Trusted Friend",
    email: "testfriend@vault.test",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=testfriend",
  });
  console.log(`   ✓ Created owner (${owner.email}) and friend (${friend.email}).\n`);

  // 3. Folder Hierarchy & Nesting (§2)
  console.log("3. Testing Folder hierarchy & breadcrumb ancestry...");
  const parentFolder = await Folder.create({
    ownerId: owner._id,
    name: "TestFolder Learning",
    color: "#6366f1",
  });
  const childFolder = await Folder.create({
    ownerId: owner._id,
    parentFolderId: parentFolder._id,
    name: "TestFolder AI & Deep Learning",
    color: "#10b981",
  });

  // Verify access
  const ownerAccess = await verifyFolderAccess(owner._id.toString(), owner.email, childFolder._id);
  if (!ownerAccess.authorized || ownerAccess.role !== "owner") {
    throw new Error("Owner access check failed on folder");
  }

  // Verify unauthorized user
  const strangerAccess = await verifyFolderAccess(friend._id.toString(), friend.email, childFolder._id);
  if (strangerAccess.authorized) {
    throw new Error("Friend should not have access yet without permission grant");
  }

  // Grant Viewer permission on parent folder and verify inheritance
  await Permission.create({
    resourceType: "folder",
    resourceId: parentFolder._id,
    userId: friend._id,
    userEmail: friend.email,
    role: "viewer",
  });
  const inheritedAccess = await verifyFolderAccess(friend._id.toString(), friend.email, childFolder._id, "viewer");
  if (!inheritedAccess.authorized) {
    throw new Error("Inherited permission from parent folder failed");
  }
  console.log("   ✓ Folder hierarchy, direct ownership, and inherited permissions verified.\n");

  // 4. Keep-Style Note System & Version History (§4, §12)
  console.log("4. Testing Keep-Style Note creation, checklists, and revision history...");
  const noteItem = await Item.create({
    ownerId: owner._id,
    folderId: childFolder._id,
    type: "note",
    name: "Test System Architecture",
    mimeType: "text/markdown",
    size: 50,
    tags: ["architecture", "vault"],
  });

  const note = await Note.create({
    itemId: noteItem._id,
    contentFormat: "markdown",
    content: "Initial draft: MongoDB for metadata, Google Drive for bytes.",
    color: "#fef9c3", // Pastel Yellow
    isChecklist: true,
    checklistItems: [
      { id: "1", text: "Database schema setup", checked: true },
      { id: "2", text: "Storage abstraction layer", checked: true },
      { id: "3", text: "Version history restore test", checked: false },
    ],
    currentVersion: 1,
  });

  // Initial revision (Version 1)
  await NoteVersion.create({
    noteId: note._id,
    itemId: noteItem._id,
    version: 1,
    content: note.content,
    checklistItems: note.checklistItems,
    changeSummary: "Initial version",
    editedBy: owner._id,
    editedAt: new Date(),
  });

  // Second revision (Version 2)
  note.content = "Revised: Added support for SHA-256 duplicate detection.";
  note.checklistItems[2].checked = true;
  note.currentVersion = 2;
  await note.save();

  await NoteVersion.create({
    noteId: note._id,
    itemId: noteItem._id,
    version: 2,
    content: note.content,
    checklistItems: note.checklistItems,
    changeSummary: "Added duplicate detection",
    editedBy: owner._id,
    editedAt: new Date(),
  });

  // Test Non-destructive restore (§12: "restoring creates a new version rather than destructively overwriting history")
  const v1 = await NoteVersion.findOne({ itemId: noteItem._id, version: 1 });
  if (!v1) throw new Error("Version 1 not found");

  const restoredVersionNum = 3;
  note.content = v1.content;
  note.checklistItems = v1.checklistItems || [];
  note.currentVersion = restoredVersionNum;
  await note.save();

  await NoteVersion.create({
    noteId: note._id,
    itemId: noteItem._id,
    version: restoredVersionNum,
    content: v1.content,
    checklistItems: v1.checklistItems,
    changeSummary: `Restored from version 1`,
    editedBy: owner._id,
    editedAt: new Date(),
  });

  const totalVersions = await NoteVersion.countDocuments({ itemId: noteItem._id });
  if (totalVersions !== 3) {
    throw new Error(`Expected 3 versions, got ${totalVersions}`);
  }
  console.log(`   ✓ Keep note revisions and non-destructive restore verified (total versions: ${totalVersions}).\n`);

  // 5. Storage Provider & SHA-256 Duplicate Detection (§5, §11, §12)
  console.log("5. Testing Storage Provider & SHA-256 duplicate detection...");
  const storage = getStorageProvider();
  const testBuffer = Buffer.from("Personal Knowledge Vault File Content Test Payload 2026", "utf-8");
  const checksum = calculateBufferChecksum(testBuffer);

  const uploadResult = await storage.upload(testBuffer, {
    name: "TestDocument.pdf",
    mimeType: "application/pdf",
  });
  console.log(`   ✓ Storage upload completed with provider [${uploadResult.provider}], ID: ${uploadResult.storageFileId}`);

  // Create Item in Mongo
  const fileItem = await Item.create({
    ownerId: owner._id,
    folderId: childFolder._id,
    type: "file",
    name: "TestDocument.pdf",
    mimeType: "application/pdf",
    size: uploadResult.size,
    storageFileId: uploadResult.storageFileId,
    storageProvider: uploadResult.provider,
    checksum,
  });

  await FileVersion.create({
    itemId: fileItem._id,
    version: 1,
    storageFileId: uploadResult.storageFileId,
    size: uploadResult.size,
    checksum,
    uploadedBy: owner._id,
  });

  // Verify duplicate check query matches
  const duplicateMatch = await Item.findOne({
    ownerId: owner._id,
    checksum,
    isTrash: false,
  });
  if (!duplicateMatch || duplicateMatch._id.toString() !== fileItem._id.toString()) {
    throw new Error("Duplicate check query failed to find identical SHA-256");
  }
  console.log(`   ✓ SHA-256 checksum (${checksum}) accurately matched duplicate item.`);

  // Test media streaming byte-range support (§15)
  const streamResult = await storage.getStream(uploadResult.storageFileId, { start: 0, end: 15 });
  if (streamResult.statusCode !== 206 || !streamResult.contentRange) {
    throw new Error("HTTP 206 byte range streaming failed");
  }
  console.log(`   ✓ HTTP 206 byte-range media streaming verified (Range: ${streamResult.contentRange}).\n`);

  // 6. Link Bookmarks & Metadata Extraction (§8)
  console.log("6. Testing Link bookmark preview extraction...");
  const linkMeta = await extractLinkMetadata("https://github.com");
  if (!linkMeta.domain || !linkMeta.title) {
    throw new Error("Link metadata scraping failed");
  }
  console.log(`   ✓ Link preview extracted: Title "${linkMeta.title}", Domain "${linkMeta.domain}", Favicon "${linkMeta.favicon}".\n`);

  // 7. Universal MIME Viewer Routing (§6)
  console.log("7. Testing MIME type viewer routing...");
  const testCases = [
    { mime: "image/png", name: "photo.png", expected: "image" },
    { mime: "application/pdf", name: "contract.pdf", expected: "pdf" },
    { mime: "audio/mpeg", name: "track.mp3", expected: "audio" },
    { mime: "video/mp4", name: "presentation.mp4", expected: "video" },
    { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: "report.docx", expected: "office" },
    { mime: "text/markdown", name: "notes.md", expected: "text" },
  ];
  for (const tc of testCases) {
    const viewer = getViewerType(tc.mime, tc.name);
    if (viewer !== tc.expected) {
      throw new Error(`MIME routing failed for ${tc.name}: expected ${tc.expected}, got ${viewer}`);
    }
  }
  console.log("   ✓ All MIME type viewers correctly routed.\n");

  // 8. Soft Delete & Recovery (§14, §18)
  console.log("8. Testing Trash soft-delete and recovery...");
  await Item.findByIdAndUpdate(fileItem._id, { isTrash: true, trashedAt: new Date() });
  const trashedCheck = await Item.findOne({ _id: fileItem._id, isTrash: true });
  if (!trashedCheck) throw new Error("Soft delete failed");

  // Restore
  await Item.findByIdAndUpdate(fileItem._id, { isTrash: false, trashedAt: null });
  const restoredCheck = await Item.findOne({ _id: fileItem._id, isTrash: false });
  if (!restoredCheck) throw new Error("Trash restore failed");
  console.log("   ✓ Soft-delete to Trash and recovery verified.\n");

  // Clean up test records
  await User.deleteMany({ email: /test.*@vault\.test/ });
  await Folder.deleteMany({ name: /TestFolder/ });
  await Item.deleteMany({ name: /Test/ });
  await Note.deleteMany({ itemId: noteItem._id });
  await NoteVersion.deleteMany({ itemId: noteItem._id });
  await FileVersion.deleteMany({ itemId: fileItem._id });
  await storage.delete(uploadResult.storageFileId);

  console.log("🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! Everything is green.\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test failed with error:", err);
  process.exit(1);
});
