import { Document } from "mongoose";

export interface User {
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
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
