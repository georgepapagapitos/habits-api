import mongoose from "mongoose";
import { UserDocument } from "../types/user.types";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: 3,
      maxLength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    googlePhotos: {
      tokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number,
      },
      selectedAlbumId: String,
      connectionStatus: {
        type: String,
        enum: ["connected", "needs_reconnect", "disconnected"],
        default: "connected",
      },
      lastConnected: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<UserDocument>("User", userSchema);
