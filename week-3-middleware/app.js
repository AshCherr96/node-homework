const express = require("express");
const { randomUUID } = require("crypto");
const dogsRouter = require("./routes/dogs");
const path = require("path");

const app = express();

// 1. Request ID middleware
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// 2. Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

// 3. Security Headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// 4. JSON parsing and static middleware FIRST
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 5. Content-Type Validation middleware for POST requests
app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    // Allow standard JSON and test agent requests
    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      return res.status(400).json({
        error: "Content-Type must be application/json",
        requestId: req.requestId,
      });
    }
  }
  next();
});

// 6. Routes
app.use("/", dogsRouter); // Do not remove this line

// 7. 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

// 8. Advanced Error Handler (Handles both logging and consistent JSON error response)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errName = err.name || "Error";

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${errName} - ${err.message}`);
  } else {
    console.error(`ERROR: ${errName} - ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

module.exports = app;


