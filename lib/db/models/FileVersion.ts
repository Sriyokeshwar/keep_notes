import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFileVersion extends Document {
  _id: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  version: number;
  storageFileId: string;
  size: number;
  checksum?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

const FileVersionSchema = new Schema<IFileVersion>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    version: { type: Number, required: true },
    storageFileId: { type: String, required: true },
    size: { type: Number, default: 0 },
    checksum: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

FileVersionSchema.index({ itemId: 1, version: 1 }, { unique: true });

export const FileVersion: Model<IFileVersion> =
  mongoose.models.FileVersion ||
  mongoose.model<IFileVersion>("FileVersion", FileVersionSchema);
