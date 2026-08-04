const express = require("express");
const taskController = require("../controllers/taskController");

const router = express.Router();

// List all tasks for the current user.
router.get("/", taskController.index);
// Fetch a single task for the current user.
router.get("/:id", taskController.show);
// Create a new task for the current user.
router.post("/", taskController.create);
// Update an existing task owned by the current user.
router.patch("/:id", taskController.update);
// Remove a task owned by the current user.
router.delete("/:id", taskController.deleteTask);

module.exports = router;
