import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import path from "path";
import { connectToDatabase } from "@/lib/db/connect";
import { Item, IItem } from "@/lib/db/models/Item";
import { Note } from "@/lib/db/models/Note";
import { FileVersion } from "@/lib/db/models/FileVersion";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess } from "@/lib/auth/permissions";
import { getStorageProvider } from "@/lib/storage";
import { calculateBufferChecksum } from "@/lib/utils/checksum";
import { getMimeTypeFromExt } from "@/lib/utils/mime";
import {
  MAX_FILE_SIZE_BYTES,
  validateFileSignature,
  sanitizeFilename,
  sanitizeSvg,
  checkUserStorageQuota,
} from "@/lib/security/fileValidation";
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
    const folderIdParam = searchParams.get("folderId");
    const typeParam = searchParams.get("type");
    const favoritesOnly = searchParams.get("favorites") === "true";
    const recentOnly = searchParams.get("recent") === "true";
    const tagParam = searchParams.get("tag");
    const sortBy = searchParams.get("sort") || "created";
    const sortOrder = searchParams.get("order") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {
      isTrash: false,
    };

    if (favoritesOnly) {
      filter.ownerId = user.id;
      filter.isFavorite = true;
    } else if (recentOnly) {
      filter.ownerId = user.id;
    } else if (tagParam) {
      filter.ownerId = user.id;
      filter.tags = String(tagParam).slice(0, 50);
    } else {
      if (!folderIdParam || folderIdParam === "root" || folderIdParam === "null") {
        filter.ownerId = user.id;
        filter.folderId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(folderIdParam)) {
          return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
        }
        // Verify user has permission to view this folder (§2)
        const auth = await verifyFolderAccess(user.id, user.email, folderIdParam, "viewer");
        if (!auth.authorized) {
          return NextResponse.json({ error: auth.error || "Permission denied" }, { status: 403 });
        }
        filter.folderId = new mongoose.Types.ObjectId(folderIdParam);
      }
    }

    if (typeParam && ["note", "file", "link"].includes(typeParam)) {
      filter.type = typeParam;
    }

    let sortOption: Record<string, 1 | -1> = { isPinned: -1, createdAt: -1 };
    if (sortBy === "name") sortOption = { isPinned: -1, name: sortOrder };
    if (sortBy === "size") sortOption = { isPinned: -1, size: sortOrder };
    if (sortBy === "modified") sortOption = { isPinned: -1, updatedAt: sortOrder };
    if (sortBy === "type") sortOption = { isPinned: -1, type: sortOrder };

    const items = await Item.find(filter).sort(sortOption).limit(200).lean();

    // Enrich notes with their note content & checklists
    const enriched = await Promise.all(
      items.map(async (item) => {
        let noteData = null;
        if (item.type === "note") {
          noteData = await Note.findOne({ itemId: item._id }).lean();
        }
        return {
          ...item,
          id: item._id.toString(),
          note: noteData
            ? {
                ...noteData,
                id: noteData._id.toString(),
              }
            : null,
        };
      })
    );

    return NextResponse.json({ items: enriched });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to fetch items");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 20 uploads per minute per user (§6)
    const ip = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`upload_${user.id}_${ip}`, 20, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: "RATE_LIMIT_EXCEEDED",
        userId: user.id,
        userEmail: user.email,
        details: { action: "file_upload" },
      });
      return NextResponse.json({ error: "Upload rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let folderId = formData.get("folderId") as string | null;
    const rawDuplicateAction = formData.get("duplicateAction") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side file size check (§4)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 50MB limit (provided: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    // Validate duplicate action parameter
    let duplicateAction: "keep_both" | "replace" | "shortcut" | null = null;
    if (rawDuplicateAction) {
      if (!["keep_both", "replace", "shortcut"].includes(rawDuplicateAction)) {
        return NextResponse.json({ error: "Invalid duplicateAction" }, { status: 400 });
      }
      duplicateAction = rawDuplicateAction as "keep_both" | "replace" | "shortcut";
    }

    if (folderId === "root" || folderId === "null" || !folderId) {
      folderId = null;
    } else {
      if (typeof folderId !== "string" || !mongoose.Types.ObjectId.isValid(folderId)) {
        return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
      }
      const auth = await verifyFolderAccess(user.id, user.email, folderId, "editor");
      if (!auth.authorized) {
        return NextResponse.json({ error: "Permission denied for this folder" }, { status: 403 });
      }
    }

    await connectToDatabase();

    // Check user storage quota (§6)
    const quotaCheck = await checkUserStorageQuota(user.id, file.size);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: "Storage quota exceeded (1GB limit reached for this account)" },
        { status: 403 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    // Sanitize filename and validate file signature / magic bytes (§4)
    const rawFilename = file.name || "Untitled";
    const filename = sanitizeFilename(rawFilename);
    const ext = path.extname(filename).toLowerCase();
    const declaredMime = file.type || getMimeTypeFromExt(filename);

    const sigCheck = validateFileSignature(buffer, declaredMime, ext);
    if (!sigCheck.isValid) {
      logSecurityEvent({
        event: "MALICIOUS_UPLOAD_BLOCKED",
        userId: user.id,
        userEmail: user.email,
        details: { filename, declaredMime, reason: sigCheck.error },
      });
      return NextResponse.json({ error: sigCheck.error || "Disallowed file type" }, { status: 400 });
    }

    // Sanitize SVGs against stored XSS (§3, §4)
    if (ext === ".svg" || declaredMime === "image/svg+xml") {
      buffer = sanitizeSvg(buffer);
    }

    const mimeType = sigCheck.detectedType || declaredMime;
    const checksum = calculateBufferChecksum(buffer);

    // Duplicate detection (§12)
    const existingDuplicate = await Item.findOne({
      ownerId: user.id,
      checksum,
      isTrash: false,
    });

    if (existingDuplicate && !duplicateAction) {
      return NextResponse.json(
        {
          duplicateDetected: true,
          existingItem: {
            id: existingDuplicate._id.toString(),
            name: existingDuplicate.name,
            size: existingDuplicate.size,
            folderId: existingDuplicate.folderId?.toString() || null,
          },
        },
        { status: 409 }
      );
    }

    // Handle replace / new version (§12)
    if (existingDuplicate && duplicateAction === "replace") {
      const storage = getStorageProvider(user.accessToken);
      const uploadRes = await storage.upload(buffer, {
        name: filename,
        mimeType,
      });

      const nextVersion = (await FileVersion.countDocuments({ itemId: existingDuplicate._id })) + 1;

      await FileVersion.create({
        itemId: existingDuplicate._id,
        version: nextVersion,
        storageFileId: uploadRes.storageFileId,
        size: uploadRes.size,
        checksum,
        uploadedBy: user.id,
      });

      existingDuplicate.storageFileId = uploadRes.storageFileId;
      existingDuplicate.storageProvider = uploadRes.provider;
      existingDuplicate.size = uploadRes.size;
      existingDuplicate.mimeType = mimeType;
      existingDuplicate.checksum = checksum;
      existingDuplicate.updatedAt = new Date();
      await existingDuplicate.save();

      return NextResponse.json({
        success: true,
        item: {
          ...existingDuplicate.toObject(),
          id: existingDuplicate._id.toString(),
        },
        version: nextVersion,
      });
    }

    // Handle shortcut
    if (existingDuplicate && duplicateAction === "shortcut") {
      const shortcutItem = await Item.create({
        ownerId: user.id,
        folderId,
        type: "link",
        name: `Shortcut to ${existingDuplicate.name}`,
        mimeType: "application/x-vault-shortcut",
        size: 0,
        metadata: {
          isShortcut: true,
          targetItemId: existingDuplicate._id.toString(),
        },
      });

      return NextResponse.json({
        success: true,
        item: {
          ...shortcutItem.toObject(),
          id: shortcutItem._id.toString(),
        },
      });
    }

    // Normal upload or Keep Both
    let finalName = filename;
    if (existingDuplicate && duplicateAction === "keep_both") {
      const extName = filename.lastIndexOf(".") !== -1 ? filename.slice(filename.lastIndexOf(".")) : "";
      const baseName = filename.lastIndexOf(".") !== -1 ? filename.slice(0, filename.lastIndexOf(".")) : filename;
      finalName = `${baseName} (Copy)${extName}`;
    }

    const storage = getStorageProvider(user.accessToken);
    const uploadRes = await storage.upload(buffer, {
      name: finalName,
      mimeType,
    });

    const item = await Item.create({
      ownerId: user.id,
      folderId,
      type: "file",
      name: finalName,
      mimeType,
      size: uploadRes.size,
      storageFileId: uploadRes.storageFileId,
      storageProvider: uploadRes.provider,
      checksum,
      tags: [],
    });

    // Record initial FileVersion (§12)
    await FileVersion.create({
      itemId: item._id,
      version: 1,
      storageFileId: uploadRes.storageFileId,
      size: uploadRes.size,
      checksum,
      uploadedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      item: {
        ...item.toObject(),
        id: item._id.toString(),
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to upload file");
  }
}
