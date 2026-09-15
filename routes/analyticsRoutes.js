const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

const hasManagerRole = (rawRoles) => {
  // Parse the stored comma-delimited role string and check whether "manager" is present.
  const roles = typeof rawRoles === "string"
    ? rawRoles.split(",").map((role) => role.trim().toLowerCase())
    : [];

  return roles.includes("manager");
};

const requireManager = (req, res, next) => {
  // Restrict analytics routes to managers only; a missing or non-manager role gets a 401.
  if (!hasManagerRole(req.user?.roles)) {
    return res.status(401).json({ message: "Manager access required." });
  }

  return next();
};

router.use(requireManager);
router.get("/users/:id", analyticsController.getUserAnalytics);
router.get("/users", analyticsController.getUsersWithStats);
router.get("/tasks/search", analyticsController.searchTasks);

router.requireManager = requireManager;
router.hasManagerRole = hasManagerRole;
module.exports = { router, hasManagerRole, requireManager };
