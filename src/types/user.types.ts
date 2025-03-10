import { Document } from "mongoose";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export type ConnectionStatus = "connected" | "needs_reconnect" | "disconnected";

export interface GooglePhotos {
  tokens?: GoogleTokens;
  selectedAlbumId?: string;
  connectionStatus?: ConnectionStatus;
  lastConnected?: Date;
}

export interface User {
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
  googlePhotos?: GooglePhotos;
}

export interface UserDocument extends User, Document {
  _id: string;
  createdAt: Date;
}

export interface AuthRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}
