import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  contentFormat: "markdown" | "html";
  content: string;
  color: string;
  isChecklist: boolean;
  checklistItems: IChecklistItem[];
  currentVersion: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    id: { type: String, required: true },
    text: { type: String, default: "" },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, unique: true, index: true },
    contentFormat: { type: String, enum: ["markdown", "html"], default: "markdown" },
    content: { type: String, default: "" },
    color: { type: String, default: "#ffffff" },
    isChecklist: { type: Boolean, default: false },
    checklistItems: [ChecklistItemSchema],
    currentVersion: { type: Number, default: 1 },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
