import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFolder extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  parentFolderId?: mongoose.Types.ObjectId | null;
  name: string;
  color?: string;
  driveFolderId?: string;
  isTrash: boolean;
  trashedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parentFolderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#6366f1" },
    driveFolderId: { type: String },
    isTrash: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FolderSchema.index({ ownerId: 1, parentFolderId: 1, name: 1 });

export const Folder: Model<IFolder> =
  mongoose.models.Folder || mongoose.model<IFolder>("Folder", FolderSchema);
