const express = require("express");
const userRoutes = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

// Initialize in-memory globals
global.user_id = null;
global.users = [];
global.tasks = [];

// 1. Use express.json() before routes
app.use(express.json());

// 2. Mount the user router at /api/users
app.use("/api/users", userRoutes);

// 3. Add not-found middleware
app.use(notFound);

// 4. Add error-handler middleware at the end
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

module.exports = { app, server };