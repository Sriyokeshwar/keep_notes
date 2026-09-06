import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITag extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#6366f1" },
  },
  { timestamps: true }
);

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Tag: Model<ITag> =
  mongoose.models.Tag || mongoose.model<ITag>("Tag", TagSchema);
