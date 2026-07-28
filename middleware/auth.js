function auth(req, res, next) {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

module.exports = auth;
