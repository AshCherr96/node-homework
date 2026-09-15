require("dotenv").config();

const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const send401 = (res) => {
  res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "No user is authenticated." });
};

module.exports = async (req, res, next) => {
  const token = req?.cookies?.jwt;
  if (!token) {
    return send401(res);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return send401(res);
    }

    // Attach the validated identity to the request so controllers can use it.
    // If the JWT includes roles, expose them as req.user.roles for route-level RBAC checks.
    req.user = { id: decoded.id };
    if (decoded.roles) {
      req.user.roles = decoded.roles;
    }

    if (["POST", "PATCH", "PUT", "DELETE", "CONNECT"].includes(req.method)) {
      if (req.get("X-CSRF-TOKEN") != decoded.csrfToken) {
        return send401(res);
      }
    }

    return next();
  });
};
