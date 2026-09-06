import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createSafeErrorResponse } from "@/lib/security/logger";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { checksum, folderId } = body;

    // Strict regex validation for SHA-256 hex string to prevent NoSQL object injection (§3)
    if (!checksum || typeof checksum !== "string" || !/^[a-f0-9]{64}$/i.test(checksum)) {
      return NextResponse.json({ error: "Valid SHA-256 checksum is required" }, { status: 400 });
    }

    if (folderId && folderId !== "root" && !mongoose.Types.ObjectId.isValid(folderId)) {
      return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Item.findOne({
      ownerId: user.id,
      checksum: checksum.toLowerCase(),
      isTrash: false,
    }).lean();

    if (!existing) {
      return NextResponse.json({ hasDuplicate: false });
    }

    return NextResponse.json({
      hasDuplicate: true,
      item: {
        id: existing._id.toString(),
        name: existing.name,
        size: existing.size,
        mimeType: existing.mimeType,
        folderId: existing.folderId?.toString() || null,
        sameFolder: existing.folderId?.toString() === (folderId || null),
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to check duplicates");
  }
}
