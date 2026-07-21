function notFound(req, res, next) {
  res.status(404).json({
    error: `No route found for ${req.method} ${req.path}`,
  });
}

module.exports = notFound;