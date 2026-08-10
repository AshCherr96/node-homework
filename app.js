const express = require("express");
const userRoutes = require("./routes/userRoutes");
const authMiddleware = require("./middleware/auth");
const taskRoutes = require("./routes/taskRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const prisma = require("./db/prisma");


const app = express();

// Track the authenticated user id for the DB-backed session.
global.user_id = null;

// 1. Use express.json() before routes
app.use(express.json());

// 2. Mount the user router at /api/users
app.use("/api/users", userRoutes);

// Mount the task router at /api/tasks and protect with auth middleware
app.use("/api/tasks", authMiddleware, taskRoutes);

// Health check endpoint verifying database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'not connected', error: err.message });
  }
});


// 3. Add not-found middleware
app.use(notFound);

// 4. Add error-handler middleware at the end
app.use((err, req, res, next) => {
  if (err.name === "PrismaClientInitializationError") {
    console.error("Couldn't connect to the database. Is it running?");
  }

  // Existing error handling logic...
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});


const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

// Graceful shutdown handler
const shutdown = async () => {
  try {
    console.log("Shutting down gracefully...");
    server.close(async () => {
      try {
        console.log("HTTP server closed.");


        // Disconnect Prisma client
        await prisma.$disconnect();
        console.log("Prisma disconnected.");

        process.exit(0);
      } catch (dbError) {
        console.error("Error closing database connections:", dbError);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = { app, server };