import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Folder } from "@/lib/db/models/Folder";
import { Note } from "@/lib/db/models/Note";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess } from "@/lib/auth/permissions";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting (§6): max 40 searches per minute per user/IP
    const ip = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`search_${user.id}_${ip}`, 40, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Search rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q") || "";
    // ReDoS Prevention: cap query length to 100 characters (§3)
    const query = rawQuery.trim().slice(0, 100);
    const type = searchParams.get("type");
    const folderId = searchParams.get("folderId");
    const favoritesOnly = searchParams.get("favorites") === "true";

    if (!query && !type && !favoritesOnly) {
      return NextResponse.json({ folders: [], items: [] });
    }

    if (folderId && folderId !== "root") {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
      }
      const auth = await verifyFolderAccess(user.id, user.email, folderId, "viewer");
      if (!auth.authorized) {
        return NextResponse.json({ error: "Permission denied for this folder" }, { status: 403 });
      }
    }

    await connectToDatabase();
    // Escape all regex special characters to prevent ReDoS or regex manipulation
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = query ? new RegExp(escaped, "i") : null;

    // 1. Search Folders
    let matchedFolders: any[] = [];
    if (!type || type === "all") {
      const folderFilter: Record<string, unknown> = {
        ownerId: user.id,
        isTrash: false,
      };
      if (regex) folderFilter.name = regex;
      matchedFolders = await Folder.find(folderFilter).limit(20).lean();
    }

    // 2. Search Items
    const itemFilter: Record<string, unknown> = {
      ownerId: user.id,
      isTrash: false,
    };

    if (type && ["note", "file", "link"].includes(type)) {
      itemFilter.type = type;
    }
    if (folderId && folderId !== "root") {
      itemFilter.folderId = new mongoose.Types.ObjectId(folderId);
    }
    if (favoritesOnly) {
      itemFilter.isFavorite = true;
    }

    if (regex) {
      // Find note IDs where note content matches regex
      const matchingNotes = await Note.find({ content: regex }).select("itemId").limit(50).lean();
      const matchingItemIdsFromNotes = matchingNotes.map((n) => n.itemId);

      itemFilter.$or = [
        { name: regex },
        { tags: regex },
        { "metadata.title": regex },
        { "metadata.description": regex },
        { "metadata.url": regex },
        { _id: { $in: matchingItemIdsFromNotes } },
      ];
    }

    const items = await Item.find(itemFilter).sort({ updatedAt: -1 }).limit(50).lean();

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
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
      query,
      folders: matchedFolders.map((f: any) => ({
        ...f,
        id: f._id.toString(),
      })),
      items: enrichedItems,
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Search failed");
  }
}
