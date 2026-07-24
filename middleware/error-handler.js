const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.message}`);
  } else {
    console.error(`ERROR: ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    ...(req.requestId && { requestId: req.requestId }),
  });
};

module.exports = errorHandler;