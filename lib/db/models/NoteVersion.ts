import mongoose, { Schema, Document, Model } from "mongoose";
import { IChecklistItem } from "./Note";

export interface INoteVersion extends Document {
  _id: mongoose.Types.ObjectId;
  noteId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  version: number;
  content: string;
  checklistItems?: IChecklistItem[];
  changeSummary?: string;
  editedBy?: mongoose.Types.ObjectId;
  editedAt: Date;
}

const NoteVersionSchema = new Schema<INoteVersion>(
  {
    noteId: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    version: { type: Number, required: true },
    content: { type: String, default: "" },
    checklistItems: { type: [Schema.Types.Mixed], default: [] },
    changeSummary: { type: String },
    editedBy: { type: Schema.Types.ObjectId, ref: "User" },
    editedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NoteVersionSchema.index({ noteId: 1, version: 1 }, { unique: true });

export const NoteVersion: Model<INoteVersion> =
  mongoose.models.NoteVersion ||
  mongoose.model<INoteVersion>("NoteVersion", NoteVersionSchema);
