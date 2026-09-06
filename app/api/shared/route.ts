import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Permission } from "@/lib/db/models/Permission";
import { Folder } from "@/lib/db/models/Folder";
import { Item } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const userEmail = user.email.toLowerCase().trim();

    const permissions = await Permission.find({
      $or: [{ userEmail }, { userId: user.id }],
    }).lean();

    const folderIds = permissions
      .filter((p) => p.resourceType === "folder")
      .map((p) => p.resourceId);

    const itemIds = permissions
      .filter((p) => p.resourceType === "item")
      .map((p) => p.resourceId);

    // Only return resources that are not in trash (§7, §10)
    const sharedFolders = await Folder.find({
      _id: { $in: folderIds },
      isTrash: false,
    })
      .populate("ownerId", "name email avatar")
      .lean();

    const sharedItems = await Item.find({
      _id: { $in: itemIds },
      isTrash: false,
    })
      .populate("ownerId", "name email avatar")
      .lean();

    const enrichedItems = await Promise.all(
      sharedItems.map(async (item) => {
        let noteData = null;
        if (item.type === "note") {
          noteData = await Note.findOne({ itemId: item._id }).lean();
        }
        return {
          ...item,
          id: item._id.toString(),
          note: noteData ? { ...noteData, id: noteData._id.toString() } : null,
        };
      })
    );

    return NextResponse.json({
      folders: sharedFolders.map((f: any) => ({ ...f, id: f._id.toString() })),
      items: enrichedItems,
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to load shared items");
  }
}
