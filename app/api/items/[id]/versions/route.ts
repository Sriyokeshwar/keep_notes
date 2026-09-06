import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { NoteVersion } from "@/lib/db/models/NoteVersion";
import { FileVersion } from "@/lib/db/models/FileVersion";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyItemAccess } from "@/lib/auth/permissions";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid item identifier" }, { status: 400 });
    }

    const auth = await verifyItemAccess(user.id, user.email, id, "viewer");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    await connectToDatabase();
    const item = auth.resource;

    if (item.type === "note") {
      const versions = await NoteVersion.find({ itemId: item._id })
        .populate("editedBy", "name email avatar")
        .sort({ version: -1 })
        .limit(50)
        .lean();

      return NextResponse.json({
        type: "note",
        versions: versions.map((v) => ({
          id: v._id.toString(),
          version: v.version,
          content: v.content,
          checklistItems: v.checklistItems,
          changeSummary: v.changeSummary || `Version ${v.version}`,
          editedAt: v.editedAt,
          editedBy: v.editedBy,
        })),
      });
    }

    if (item.type === "file") {
      const versions = await FileVersion.find({ itemId: item._id })
        .populate("uploadedBy", "name email avatar")
        .sort({ version: -1 })
        .limit(50)
        .lean();

      return NextResponse.json({
        type: "file",
        versions: versions.map((v) => ({
          id: v._id.toString(),
          version: v.version,
          size: v.size,
          checksum: v.checksum,
          uploadedAt: v.uploadedAt,
          uploadedBy: v.uploadedBy,
        })),
      });
    }

    return NextResponse.json({ versions: [] });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to fetch versions");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid item identifier" }, { status: 400 });
    }

    const auth = await verifyItemAccess(user.id, user.email, id, "editor");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { versionToRestore } = body;

    const versionNum = parseInt(String(versionToRestore), 10);
    if (isNaN(versionNum) || versionNum <= 0) {
      return NextResponse.json({ error: "versionToRestore must be a positive integer" }, { status: 400 });
    }

    await connectToDatabase();
    const item = auth.resource;

    if (item.type === "note") {
      const note = await Note.findOne({ itemId: item._id });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      const historicalVersion = await NoteVersion.findOne({
        itemId: item._id,
        version: versionNum,
      });

      if (!historicalVersion) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      // Restoring creates a NEW version rather than destructively overwriting (§12)
      const newVersionNumber = (note.currentVersion || 1) + 1;

      note.content = historicalVersion.content;
      if (historicalVersion.checklistItems) {
        note.checklistItems = historicalVersion.checklistItems;
      }
      note.currentVersion = newVersionNumber;
      await note.save();

      await NoteVersion.create({
        noteId: note._id,
        itemId: item._id,
        version: newVersionNumber,
        content: historicalVersion.content,
        checklistItems: historicalVersion.checklistItems,
        changeSummary: `Restored from version ${versionNum}`,
        editedBy: user.id,
        editedAt: new Date(),
      });

      item.size = (historicalVersion.content || "").length;
      item.updatedAt = new Date();
      await item.save();

      return NextResponse.json({
        success: true,
        message: `Restored version ${versionNum} as version ${newVersionNumber}`,
        newVersion: newVersionNumber,
        item: {
          ...item.toObject(),
          id: item._id.toString(),
          note: {
            ...note.toObject(),
            id: note._id.toString(),
          },
        },
      });
    }

    if (item.type === "file") {
      const targetVersion = await FileVersion.findOne({
        itemId: item._id,
        version: versionNum,
      });

      if (!targetVersion) {
        return NextResponse.json({ error: "File version not found" }, { status: 404 });
      }

      const nextVersionNum = (await FileVersion.countDocuments({ itemId: item._id })) + 1;

      await FileVersion.create({
        itemId: item._id,
        version: nextVersionNum,
        storageFileId: targetVersion.storageFileId,
        size: targetVersion.size,
        checksum: targetVersion.checksum,
        uploadedBy: user.id,
        uploadedAt: new Date(),
      });

      item.storageFileId = targetVersion.storageFileId;
      item.size = targetVersion.size;
      item.checksum = targetVersion.checksum;
      item.updatedAt = new Date();
      await item.save();

      return NextResponse.json({
        success: true,
        message: `Restored file version ${versionNum} as version ${nextVersionNum}`,
        newVersion: nextVersionNum,
      });
    }

    return NextResponse.json({ error: "Unsupported item type" }, { status: 400 });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to restore version");
  }
}
