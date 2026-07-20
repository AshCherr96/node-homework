function notFound(req, res, next) {
  res.status(404).json({
    message: `No route found for ${req.method} ${req.path}`,
  });
}

module.exports = notFound;