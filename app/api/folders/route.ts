import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Folder } from "@/lib/db/models/Folder";
import { Item } from "@/lib/db/models/Item";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess } from "@/lib/auth/permissions";
import { getStorageProvider } from "@/lib/storage";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { logSecurityEvent, createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const parentIdParam = searchParams.get("parentFolderId");
    const allParam = searchParams.get("all") === "true";

    const filter: Record<string, unknown> = {
      isTrash: false,
    };

    if (!allParam) {
      if (!parentIdParam || parentIdParam === "root" || parentIdParam === "null") {
        filter.ownerId = user.id;
        filter.parentFolderId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parentIdParam)) {
          return NextResponse.json({ error: "Invalid parentFolderId" }, { status: 400 });
        }
        // Verify user has permission to read the parent folder (§2)
        const auth = await verifyFolderAccess(user.id, user.email, parentIdParam, "viewer");
        if (!auth.authorized) {
          return NextResponse.json({ error: auth.error || "Permission denied" }, { status: 403 });
        }
        filter.parentFolderId = new mongoose.Types.ObjectId(parentIdParam);
      }
    } else {
      filter.ownerId = user.id;
    }

    const folders = await Folder.find(filter).sort({ name: 1 }).lean();

    // Enrich with item counts
    const enriched = await Promise.all(
      folders.map(async (f) => {
        const itemCount = await Item.countDocuments({
          folderId: f._id,
          isTrash: false,
        });
        const subfolderCount = await Folder.countDocuments({
          parentFolderId: f._id,
          isTrash: false,
        });
        return {
          ...f,
          id: f._id.toString(),
          itemCount,
          subfolderCount,
        };
      })
    );

    return NextResponse.json({ folders: enriched });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to fetch folders");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 30 folder creations per minute
    const ip = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`folder_create_${user.id}_${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: "RATE_LIMIT_EXCEEDED",
        userId: user.id,
        userEmail: user.email,
        details: { action: "folder_create" },
      });
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json();
    let { name, parentFolderId, color } = body;

    // Input validation & sanitization
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    const safeName = name.trim().slice(0, 100).replace(/[\x00-\x1f\x7f]/g, "");

    let safeColor = "#6366f1";
    if (color && typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      safeColor = color;
    }

    let parentId = parentFolderId;
    if (parentId === "root" || parentId === "null" || !parentId) {
      parentId = null;
    } else {
      if (typeof parentId !== "string" || !mongoose.Types.ObjectId.isValid(parentId)) {
        return NextResponse.json({ error: "Invalid parentFolderId" }, { status: 400 });
      }
      const auth = await verifyFolderAccess(user.id, user.email, parentId, "editor");
      if (!auth.authorized) {
        return NextResponse.json({ error: "Permission denied on parent folder" }, { status: 403 });
      }
    }

    await connectToDatabase();

    let driveFolderId: string | undefined = undefined;
    try {
      let parentDriveFolderId: string | undefined;
      if (parentId) {
        const parentDoc = await Folder.findById(parentId);
        if (parentDoc?.driveFolderId) {
          parentDriveFolderId = parentDoc.driveFolderId;
        }
      }
      const storage = getStorageProvider(user.accessToken, user.id);
      if (storage.createFolder) {
        driveFolderId = await storage.createFolder(safeName, parentDriveFolderId);
      }
    } catch (storageErr) {
      console.warn("Could not mirror folder to storage provider:", storageErr);
    }

    const folder = await Folder.create({
      ownerId: user.id,
      parentFolderId: parentId,
      name: safeName,
      color: safeColor,
      driveFolderId,
    });

    return NextResponse.json({
      folder: {
        ...folder.toObject(),
        id: folder._id.toString(),
        itemCount: 0,
        subfolderCount: 0,
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to create folder");
  }
}
