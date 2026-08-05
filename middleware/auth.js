function auth(req, res, next) {
  // Require an active user session before task routes can be used.
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

module.exports = auth;
