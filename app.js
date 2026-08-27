require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");
const userRoutes = require("./routes/userRoutes");
const jwtMiddleware = require("./middleware/jwtMiddleware");
const taskRoutes = require("./routes/taskRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler"); 
const prisma = require("./db/prisma");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
app.set("trust proxy", 1);

// Limit abusive clients before doing any further request processing.
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);
app.use(helmet());

// 1. Use express.json() before routes
app.use(express.json());
app.use(cookieParser());
app.use(xss());

// 2. Mount the user router at /api/users
app.use("/api/users", userRoutes);

// Mount the task router at /api/tasks and protect with JWT middleware.
app.use("/api/tasks", jwtMiddleware, taskRoutes);

app.use("/api/analytics", jwtMiddleware, analyticsRoutes);


// Health check endpoint verifying database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', db: 'not connected', error: err.message });
  }
});

// Use the not-found middleware for unmatched routes
app.use(notFound);

// Use the imported shared error handler middleware as the final middleware
app.use(errorHandler);

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

        // Disconnect Prisma client directly
        await prisma.$disconnect();
        console.log("Prisma disconnected");

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
