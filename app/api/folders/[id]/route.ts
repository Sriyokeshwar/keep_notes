import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Folder, IFolder } from "@/lib/db/models/Folder";
import { Item } from "@/lib/db/models/Item";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess } from "@/lib/auth/permissions";
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
      return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
    }

    const auth = await verifyFolderAccess(user.id, user.email, id, "viewer");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const folder = auth.resource;

    // Compute breadcrumb ancestry
    const breadcrumbs: Array<{ id: string; name: string }> = [
      { id: folder._id.toString(), name: folder.name },
    ];
    let curr = folder.parentFolderId;
    while (curr) {
      const parent = await Folder.findById(curr);
      if (!parent || parent.isTrash) break;
      breadcrumbs.unshift({ id: parent._id.toString(), name: parent.name });
      curr = parent.parentFolderId;
    }

    return NextResponse.json({
      folder: {
        ...folder.toObject(),
        id: folder._id.toString(),
      },
      breadcrumbs,
      userRole: auth.role,
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to load folder");
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
      return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
    }

    const auth = await verifyFolderAccess(user.id, user.email, id, "editor");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { name, color, parentFolderId } = body;

    const updates: Partial<IFolder> = {};
    if (name && typeof name === "string" && name.trim()) {
      updates.name = name.trim().slice(0, 100).replace(/[\x00-\x1f\x7f]/g, "");
    }
    if (color && typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      updates.color = color;
    }
    if (parentFolderId !== undefined) {
      if (parentFolderId === id) {
        return NextResponse.json({ error: "Cannot move folder into itself" }, { status: 400 });
      }
      if (parentFolderId === "root" || !parentFolderId) {
        updates.parentFolderId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
          return NextResponse.json({ error: "Invalid target parentFolderId" }, { status: 400 });
        }
        // Verify user has editor permission on the target destination folder
        const targetAuth = await verifyFolderAccess(user.id, user.email, parentFolderId, "editor");
        if (!targetAuth.authorized) {
          return NextResponse.json({ error: "Cannot move folder: Permission denied on target folder" }, { status: 403 });
        }
        updates.parentFolderId = new mongoose.Types.ObjectId(parentFolderId);
      }
    }

    const updated = await Folder.findByIdAndUpdate(id, updates, { new: true });

    return NextResponse.json({
      folder: {
        ...updated!.toObject(),
        id: updated!._id.toString(),
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to update folder");
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
      return NextResponse.json({ error: "Invalid folder identifier" }, { status: 400 });
    }

    const auth = await verifyFolderAccess(user.id, user.email, id, "editor");
    if (!auth.authorized || !auth.resource) {
      return NextResponse.json(
        { error: auth.error || "Permission denied" },
        { status: auth.statusCode || 403 }
      );
    }

    // Soft delete folder and items inside it
    await Folder.findByIdAndUpdate(id, { isTrash: true, trashedAt: new Date() });
    await Item.updateMany({ folderId: id }, { isTrash: true, trashedAt: new Date() });

    return NextResponse.json({ success: true, message: "Folder moved to trash" });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to delete folder");
  }
}
