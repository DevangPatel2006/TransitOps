const ApiError = require('./ApiError');

const validate = (schema) => (req, res, next) => {
  const data = {};
  if (schema.shape.body) data.body = req.body;
  if (schema.shape.query) data.query = req.query;
  if (schema.shape.params) data.params = req.params;

  const result = schema.safeParse(data);

  if (!result.success) {
    const errorDetails = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      errorDetails[path] = err.message;
    });
    return next(new ApiError(400, JSON.stringify({ errors: errorDetails })));
  }

  // Assign validated data back
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  if (result.data.params) req.params = result.data.params;

  next();
};

module.exports = validate;
