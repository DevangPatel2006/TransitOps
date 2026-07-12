const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!statusCode) {
    statusCode = 500;
  }

  let errors = null;
  // Handle validation error format
  if (statusCode === 400 && message.startsWith('{')) {
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

  const response = {
    error: message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).send(response);
};

module.exports = errorHandler;

//checked
