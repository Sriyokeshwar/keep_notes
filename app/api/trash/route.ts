import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Folder } from "@/lib/db/models/Folder";
import { Note } from "@/lib/db/models/Note";
import { NoteVersion } from "@/lib/db/models/NoteVersion";
import { FileVersion } from "@/lib/db/models/FileVersion";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getStorageProvider } from "@/lib/storage";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const trashedFolders = await Folder.find({
      ownerId: user.id,
      isTrash: true,
    }).sort({ trashedAt: -1 }).limit(100).lean();

    const trashedItems = await Item.find({
      ownerId: user.id,
      isTrash: true,
    }).sort({ trashedAt: -1 }).limit(200).lean();

    return NextResponse.json({
      folders: trashedFolders.map((f) => ({ ...f, id: f._id.toString() })),
      items: trashedItems.map((i) => ({ ...i, id: i._id.toString() })),
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to load trash");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, type, id } = body;

    if (action !== "restore" || !["folder", "item"].includes(type) || !id) {
      return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    await connectToDatabase();

    // Enforce ownership: only the owner can restore their trashed items (§2, §7)
    if (type === "folder") {
      const updated = await Folder.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), ownerId: user.id, isTrash: true },
        { isTrash: false, trashedAt: null },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ error: "Folder not found in trash" }, { status: 404 });
      }
      await Item.updateMany(
        { folderId: updated._id, ownerId: user.id },
        { isTrash: false, trashedAt: null }
      );
      return NextResponse.json({ success: true, message: "Folder restored" });
    }

    if (type === "item") {
      const updated = await Item.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), ownerId: user.id, isTrash: true },
        { isTrash: false, trashedAt: null },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ error: "Item not found in trash" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Item restored" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to restore from trash");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const purgeAll = searchParams.get("purgeAll") === "true";
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    await connectToDatabase();
    const storage = getStorageProvider(user.accessToken, user.id);

    if (purgeAll) {
      const trashedItems = await Item.find({ ownerId: user.id, isTrash: true });
      for (const item of trashedItems) {
        if (item.storageFileId) {
          try {
            await storage.delete(item.storageFileId);
          } catch {
            // continue
          }
        }
        if (item.type === "note") {
          await Note.deleteOne({ itemId: item._id });
          await NoteVersion.deleteMany({ itemId: item._id });
        } else {
          await FileVersion.deleteMany({ itemId: item._id });
        }
      }
      await Item.deleteMany({ ownerId: user.id, isTrash: true });
      await Folder.deleteMany({ ownerId: user.id, isTrash: true });

      return NextResponse.json({ success: true, message: "Trash emptied permanently" });
    }

    if (type === "item" && id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
      }
      const item = await Item.findOne({ _id: new mongoose.Types.ObjectId(id), ownerId: user.id, isTrash: true });
      if (item) {
        if (item.storageFileId) {
          try {
            await storage.delete(item.storageFileId);
          } catch {
            // continue
          }
        }
        if (item.type === "note") {
          await Note.deleteOne({ itemId: item._id });
          await NoteVersion.deleteMany({ itemId: item._id });
        } else {
          await FileVersion.deleteMany({ itemId: item._id });
        }
        await Item.findByIdAndDelete(item._id);
        return NextResponse.json({ success: true, message: "Item deleted permanently" });
      }
      return NextResponse.json({ error: "Item not found in trash" }, { status: 404 });
    }

    if (type === "folder" && id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
      }
      const folder = await Folder.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id), ownerId: user.id, isTrash: true });
      if (folder) {
        return NextResponse.json({ success: true, message: "Folder deleted permanently" });
      }
      return NextResponse.json({ error: "Folder not found in trash" }, { status: 404 });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to delete permanently");
  }
}
