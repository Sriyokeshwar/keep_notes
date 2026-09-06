import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId | null;
  type: "note" | "file" | "link";
  name: string;
  mimeType: string;
  size: number;
  storageFileId?: string;
  storageProvider: "google_drive" | "local";
  checksum?: string;
  thumbnailUrl?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isTrash: boolean;
  trashedAt?: Date | null;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null, index: true },
    type: { type: String, enum: ["note", "file", "link"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "text/plain" },
    size: { type: Number, default: 0 },
    storageFileId: { type: String },
    storageProvider: { type: String, enum: ["google_drive", "local"], default: "local" },
    checksum: { type: String, index: true },
    thumbnailUrl: { type: String },
    isPinned: { type: Boolean, default: false, index: true },
    isFavorite: { type: Boolean, default: false, index: true },
    isTrash: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date, default: null },
    tags: [{ type: String, trim: true }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ItemSchema.index({ ownerId: 1, folderId: 1, isTrash: 1 });
ItemSchema.index({ ownerId: 1, type: 1, isTrash: 1 });
ItemSchema.index({ name: "text", tags: "text" });

export const Item: Model<IItem> =
  mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
