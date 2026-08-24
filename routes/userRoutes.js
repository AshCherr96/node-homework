const express = require("express");
const userController = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

// Register a new user account.
router.post("/register", userController.register);
// Authenticate an existing user.
router.post("/logon", userController.logon);
// End the active session for a logged-in user.
router.post("/logoff", jwtMiddleware, userController.logoff);

module.exports = router;
