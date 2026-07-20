const express = require("express");
const { randomUUID } = require("crypto");
const dogsRouter = require("./routes/dogs");
const path = require("path");

const app = express();

// Assignment 3b and 3c ask you to add middleware in this file.

// Request ID middleware 
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// Logging middleware 
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

// Security Headers middleware 
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Logging, JSON parsing, and static middleware 
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Content-Type Validation middleware for POST requests
app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
  }
  next();
});


app.use("/", dogsRouter);// Do not remove this line

// 404 Not Found Handler 
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

// Advanced Error Handler (Handles both logging and response)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errName = err.name || "Error";

  if (statusCode >= 400 && statusCode < 500) {
    global.console.warn(`WARN: ${errName} - ${err.message}`);
  } else {
    global.console.error(`ERROR: ${errName} - ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

module.exports = app;


