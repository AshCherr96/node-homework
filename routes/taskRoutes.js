const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

// Static routes first
router.post("/bulk", taskController.bulkCreate);
router.post("/", taskController.create);
router.get("/", taskController.index);

// Parameterized routes after
router.get("/:id", taskController.show);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
