import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item, IItem } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { NoteVersion } from "@/lib/db/models/NoteVersion";
import { FileVersion } from "@/lib/db/models/FileVersion";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyItemAccess, verifyFolderAccess } from "@/lib/auth/permissions";
import { getStorageProvider } from "@/lib/storage";
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

    const item = auth.resource;
    let noteData = null;
    let versionsCount = 0;

    if (item.type === "note") {
      noteData = await Note.findOne({ itemId: item._id }).lean();
      versionsCount = await NoteVersion.countDocuments({ itemId: item._id });
    } else if (item.type === "file") {
      versionsCount = await FileVersion.countDocuments({ itemId: item._id });
    }

    return NextResponse.json({
      item: {
        ...item.toObject(),
        id: item._id.toString(),
        note: noteData ? { ...noteData, id: noteData._id.toString() } : null,
        versionsCount,
      },
      userRole: auth.role,
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to fetch item");
  }
}

export async function PATCH(
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
    const { name, folderId, isFavorite, isPinned, tags, isTrash } = body;

    const updates: Partial<IItem> = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Item name cannot be empty" }, { status: 400 });
      }
      updates.name = name.trim().slice(0, 150).replace(/[\x00-\x1f\x7f]/g, "");
    }

    // Validate target folderId
    if (folderId !== undefined) {
      if (folderId === "root" || !folderId) {
        updates.folderId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(folderId)) {
          return NextResponse.json({ error: "Invalid target folder identifier" }, { status: 400 });
        }
        // Verify user has editor access on destination folder
        const targetFolderAuth = await verifyFolderAccess(user.id, user.email, folderId, "editor");
        if (!targetFolderAuth.authorized) {
          return NextResponse.json({ error: "Cannot move item: Permission denied on destination folder" }, { status: 403 });
        }
        updates.folderId = new mongoose.Types.ObjectId(folderId);
      }
    }

    if (isFavorite !== undefined) updates.isFavorite = Boolean(isFavorite);
    if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
      }
      updates.tags = tags
        .filter((t) => typeof t === "string")
        .map((t) => t.trim().slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, ""))
        .filter(Boolean)
        .slice(0, 20);
    }

    if (isTrash !== undefined) {
      updates.isTrash = Boolean(isTrash);
      updates.trashedAt = isTrash ? new Date() : null;
    }

    const updated = await Item.findByIdAndUpdate(id, updates, { new: true });

    return NextResponse.json({
      item: {
        ...updated!.toObject(),
        id: updated!._id.toString(),
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to update item");
  }
}

export async function DELETE(
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

    // Allow checking trash when deleting
    const auth = await verifyItemAccess(user.id, user.email, id, "editor", { allowTrash: true });
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const item = auth.resource;

    // If already in trash, permanently delete
    if (item.isTrash) {
      if (item.storageFileId) {
        try {
          const storage = getStorageProvider(user.accessToken);
          await storage.delete(item.storageFileId);
        } catch (storageErr) {
          console.warn("Storage deletion error:", storageErr);
        }
      }
      if (item.type === "note") {
        await Note.deleteOne({ itemId: item._id });
        await NoteVersion.deleteMany({ itemId: item._id });
      } else {
        await FileVersion.deleteMany({ itemId: item._id });
      }
      await Item.findByIdAndDelete(id);

      return NextResponse.json({ success: true, message: "Item permanently deleted" });
    }

    // Soft delete to trash (§14, §18)
    await Item.findByIdAndUpdate(id, { isTrash: true, trashedAt: new Date() });
    return NextResponse.json({ success: true, message: "Item moved to trash" });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to delete item");
  }
}
