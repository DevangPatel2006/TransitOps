const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  const isProduction = process.env.NODE_ENV === 'production';

  if (!statusCode) {
    statusCode = 500;
  }

  // Always log internal server errors server-side for troubleshooting
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  let errors = null;
  // Handle validation error format
  if (statusCode === 400 && message && message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.errors) {
        errors = parsed.errors;
        message = 'Validation failed';
      }
    } catch (e) {
      // ignore parsing errors
    }
  }

  // Sanitize message in production for internal server errors
  if (isProduction && statusCode === 500 && !(err instanceof ApiError && err.isOperational)) {
    message = 'Internal server error';
  }

  const response = {
    error: message || 'An unexpected error occurred',
    ...(errors && { errors }),
    ...(!isProduction && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

//checked
