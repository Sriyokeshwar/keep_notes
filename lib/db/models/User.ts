import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    avatar: { type: String },
    googleId: { type: String, sparse: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
