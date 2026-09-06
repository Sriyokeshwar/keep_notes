import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Permission, PermissionRole, ResourceType } from "@/lib/db/models/Permission";
import { User } from "@/lib/db/models/User";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { verifyFolderAccess, verifyItemAccess } from "@/lib/auth/permissions";
import { logSecurityEvent, createSafeErrorResponse } from "@/lib/security/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resourceType = searchParams.get("resourceType") as ResourceType | null;
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !["folder", "item"].includes(resourceType) || !resourceId) {
      return NextResponse.json({ error: "Valid resourceType and resourceId are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return NextResponse.json({ error: "Invalid resource identifier" }, { status: 400 });
    }

    if (resourceType === "folder") {
      const auth = await verifyFolderAccess(user.id, user.email, resourceId, "viewer");
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error || "Permission denied" }, { status: auth.statusCode || 403 });
      }
    } else {
      const auth = await verifyItemAccess(user.id, user.email, resourceId, "viewer");
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error || "Permission denied" }, { status: auth.statusCode || 403 });
      }
    }

    await connectToDatabase();
    const perms = await Permission.find({
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
    })
      .populate("userId", "name email avatar")
      .lean();

    return NextResponse.json({
      permissions: perms.map((p) => ({
        id: p._id.toString(),
        userEmail: p.userEmail,
        role: p.role,
        user: p.userId,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to fetch permissions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { resourceType, resourceId, email, role } = body as {
      resourceType: ResourceType;
      resourceId: string;
      email: string;
      role: PermissionRole;
    };

    if (!resourceType || !["folder", "item"].includes(resourceType) || !resourceId || !email) {
      return NextResponse.json({ error: "resourceType, resourceId, and email are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return NextResponse.json({ error: "Invalid resource identifier" }, { status: 400 });
    }

    const targetEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    if (targetEmail === user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Cannot share resource with yourself" }, { status: 400 });
    }

    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'viewer' or 'editor'" }, { status: 400 });
    }

    // Privilege Escalation Defense: ONLY the OWNER can manage permissions (§2)
    if (resourceType === "folder") {
      const auth = await verifyFolderAccess(user.id, user.email, resourceId, "owner");
      if (!auth.authorized || auth.role !== "owner") {
        logSecurityEvent({
          event: "PRIVILEGE_ESCALATION_ATTEMPT",
          userId: user.id,
          userEmail: user.email,
          resourceId,
          details: { attempt: "grant_permission_as_non_owner" },
        });
        return NextResponse.json({ error: "Only the owner can grant or modify permissions" }, { status: 403 });
      }
    } else {
      const auth = await verifyItemAccess(user.id, user.email, resourceId, "owner");
      if (!auth.authorized || auth.role !== "owner") {
        logSecurityEvent({
          event: "PRIVILEGE_ESCALATION_ATTEMPT",
          userId: user.id,
          userEmail: user.email,
          resourceId,
          details: { attempt: "grant_permission_as_non_owner" },
        });
        return NextResponse.json({ error: "Only the owner can grant or modify permissions" }, { status: 403 });
      }
    }

    await connectToDatabase();
    const targetUser = await User.findOne({ email: targetEmail });

    const perm = await Permission.findOneAndUpdate(
      { resourceType, resourceId: new mongoose.Types.ObjectId(resourceId), userEmail: targetEmail },
      {
        resourceType,
        resourceId: new mongoose.Types.ObjectId(resourceId),
        userEmail: targetEmail,
        userId: targetUser?._id,
        role,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      permission: {
        id: perm._id.toString(),
        userEmail: perm.userEmail,
        role: perm.role,
      },
    });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to set permission");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const permissionId = searchParams.get("id");

    if (!permissionId || !mongoose.Types.ObjectId.isValid(permissionId)) {
      return NextResponse.json({ error: "Invalid permission identifier" }, { status: 400 });
    }

    await connectToDatabase();
    const perm = await Permission.findById(permissionId);
    if (!perm) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    // Only OWNER can revoke permissions
    if (perm.resourceType === "folder") {
      const auth = await verifyFolderAccess(user.id, user.email, perm.resourceId.toString(), "owner");
      if (!auth.authorized || auth.role !== "owner") {
        return NextResponse.json({ error: "Only the owner can revoke permissions" }, { status: 403 });
      }
    } else {
      const auth = await verifyItemAccess(user.id, user.email, perm.resourceId.toString(), "owner");
      if (!auth.authorized || auth.role !== "owner") {
        return NextResponse.json({ error: "Only the owner can revoke permissions" }, { status: 403 });
      }
    }

    await Permission.findByIdAndDelete(permissionId);

    return NextResponse.json({ success: true, message: "Permission removed" });
  } catch (err: unknown) {
    return createSafeErrorResponse(err, "Failed to delete permission");
  }
}
