import mongoose from "mongoose";
import { connectToDatabase } from "../db/connect";
import { Folder, IFolder } from "../db/models/Folder";
import { Item, IItem } from "../db/models/Item";
import { Permission, PermissionRole, ResourceType } from "../db/models/Permission";
import { logSecurityEvent } from "../security/logger";

const ROLE_RANKS: Record<PermissionRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export interface AuthCheckResult<T = unknown> {
  authorized: boolean;
  role: PermissionRole | null;
  resource: T | null;
  error?: string;
  statusCode?: number;
}

export interface AuthCheckOptions {
  allowTrash?: boolean;
}

export async function verifyFolderAccess(
  userId: string,
  userEmail: string,
  folderId: string | mongoose.Types.ObjectId | null | undefined,
  requiredRole: PermissionRole = "viewer",
  options: AuthCheckOptions = {}
): Promise<AuthCheckResult<IFolder>> {
  await connectToDatabase();

  if (!folderId || folderId === "root") {
    // Root workspace belongs to the user
    return { authorized: true, role: "owner", resource: null };
  }

  // Validate ObjectId format to prevent NoSQL object injection or CastErrors
  const idStr = folderId.toString();
  if (!mongoose.Types.ObjectId.isValid(idStr)) {
    return { authorized: false, role: null, resource: null, error: "Invalid folder identifier", statusCode: 400 };
  }

  const folder = await Folder.findById(idStr);
  if (!folder) {
    return { authorized: false, role: null, resource: null, error: "Folder not found", statusCode: 404 };
  }

  // Check if folder is soft-deleted (§7, §14)
  if (folder.isTrash && !options.allowTrash) {
    return { authorized: false, role: null, resource: folder, error: "Folder is in trash", statusCode: 404 };
  }

  // Check direct owner
  if (folder.ownerId.toString() === userId.toString()) {
    return { authorized: true, role: "owner", resource: folder };
  }

  // Check explicit permission on this folder
  const email = userEmail.toLowerCase().trim();
  const directPerm = await Permission.findOne({
    resourceType: "folder",
    resourceId: folder._id,
    userEmail: email,
  });

  if (directPerm && ROLE_RANKS[directPerm.role] >= ROLE_RANKS[requiredRole]) {
    return { authorized: true, role: directPerm.role, resource: folder };
  }

  // Inherited permission from parent folders
  let currentParentId = folder.parentFolderId;
  while (currentParentId) {
    const parent = await Folder.findById(currentParentId);
    if (!parent) break;

    if (parent.isTrash && !options.allowTrash) break;

    if (parent.ownerId.toString() === userId.toString()) {
      return { authorized: true, role: "owner", resource: folder };
    }

    const parentPerm = await Permission.findOne({
      resourceType: "folder",
      resourceId: parent._id,
      userEmail: email,
    });

    if (parentPerm && ROLE_RANKS[parentPerm.role] >= ROLE_RANKS[requiredRole]) {
      return { authorized: true, role: parentPerm.role, resource: folder };
    }

    currentParentId = parent.parentFolderId;
  }

  logSecurityEvent({
    event: "ACCESS_DENIED",
    userId,
    userEmail,
    resourceId: idStr,
    details: { resourceType: "folder", requiredRole },
  });

  return { authorized: false, role: null, resource: folder, error: "Permission denied", statusCode: 403 };
}

export async function verifyItemAccess(
  userId: string,
  userEmail: string,
  itemId: string | mongoose.Types.ObjectId,
  requiredRole: PermissionRole = "viewer",
  options: AuthCheckOptions = {}
): Promise<AuthCheckResult<IItem>> {
  await connectToDatabase();

  const idStr = itemId ? itemId.toString() : "";
  if (!idStr || !mongoose.Types.ObjectId.isValid(idStr)) {
    return { authorized: false, role: null, resource: null, error: "Invalid item identifier", statusCode: 400 };
  }

  const item = await Item.findById(idStr);
  if (!item) {
    return { authorized: false, role: null, resource: null, error: "Item not found", statusCode: 404 };
  }

  // Check if item is soft-deleted (§7, §14: "trashed items are excluded from all reads until restored")
  if (item.isTrash && !options.allowTrash) {
    return { authorized: false, role: null, resource: item, error: "Item is in trash", statusCode: 404 };
  }

  // Check direct owner
  if (item.ownerId.toString() === userId.toString()) {
    return { authorized: true, role: "owner", resource: item };
  }

  // Check direct item permission
  const email = userEmail.toLowerCase().trim();
  const directPerm = await Permission.findOne({
    resourceType: "item",
    resourceId: item._id,
    userEmail: email,
  });

  if (directPerm && ROLE_RANKS[directPerm.role] >= ROLE_RANKS[requiredRole]) {
    return { authorized: true, role: directPerm.role, resource: item };
  }

  // Inherit permission from enclosing folder
  if (item.folderId) {
    const folderAuth = await verifyFolderAccess(userId, userEmail, item.folderId, requiredRole, options);
    if (folderAuth.authorized) {
      return { authorized: true, role: folderAuth.role, resource: item };
    }
  }

  logSecurityEvent({
    event: "ACCESS_DENIED",
    userId,
    userEmail,
    resourceId: idStr,
    details: { resourceType: "item", requiredRole },
  });

  return { authorized: false, role: null, resource: item, error: "Permission denied", statusCode: 403 };
}
