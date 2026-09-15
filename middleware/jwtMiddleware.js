require("dotenv").config();

const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

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

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return send401(res);
    }

    // Attach the validated identity to the request so controllers and route guards can use it.
    // Prefer the roles embedded in the JWT for performance, but fall back to the authenticated
    // user's stored database roles so RBAC stays consistent even when a token is older or missing role data.
    req.user = { id: decoded.id };
    if (decoded.roles) {
      req.user.roles = decoded.roles;
    } else {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { roles: true },
        });

        if (dbUser?.roles) {
          req.user.roles = dbUser.roles;
        }
      } catch (dbError) {
        return next(dbError);
      }
    }

    if (["POST", "PATCH", "PUT", "DELETE", "CONNECT"].includes(req.method)) {
      if (req.get("X-CSRF-TOKEN") != decoded.csrfToken) {
        return send401(res);
      }
    }

    return next();
  });
};
