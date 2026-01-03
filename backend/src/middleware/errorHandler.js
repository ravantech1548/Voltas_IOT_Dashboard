const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(400).json({ error: 'Duplicate entry. This record already exists.' });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Invalid reference. Related record does not exist.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;


