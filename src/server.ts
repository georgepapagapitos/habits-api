import app from "./app";
import { connectDB } from "./config/db";
import { PORT } from "./config/env";
import { setupScheduler } from "./utils/scheduler";

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start server - listen on all network interfaces
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
      console.log(
        `Access the server at http://localhost:${PORT} or http://192.168.0.20:${PORT}`
      );
    });

    // Set up scheduled tasks
    setupScheduler();
    console.log("Scheduler initialized");

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      console.error(`Error: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });

// Handle SIGTERM
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  process.exit(0);
});
