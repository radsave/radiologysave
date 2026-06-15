const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ error: 'A record with this value already exists', detail: err.detail });
  }
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
