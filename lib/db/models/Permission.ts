import mongoose, { Schema, Document, Model } from "mongoose";

export type PermissionRole = "owner" | "editor" | "viewer";
export type ResourceType = "folder" | "item";

export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  resourceType: ResourceType;
  resourceId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail: string;
  role: PermissionRole;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resourceType: { type: String, enum: ["folder", "item"], required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "viewer" },
  },
  { timestamps: true }
);

PermissionSchema.index({ resourceType: 1, resourceId: 1, userEmail: 1 }, { unique: true });

export const Permission: Model<IPermission> =
  mongoose.models.Permission ||
  mongoose.model<IPermission>("Permission", PermissionSchema);
