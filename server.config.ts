import { config } from "dotenv";

// Load environment variables
config();

export default {
  server: {
    host: process.env.HOST || "0.0.0.0",
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5050,
    corsOptions: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
  database: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/habits",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "default-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};
