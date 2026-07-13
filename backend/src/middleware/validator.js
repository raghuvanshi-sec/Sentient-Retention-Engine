const validationSchemas = require('./validationSchemas');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return res.status(400).json({ status: 'error', message: errorMessage });
  }
  next();
};

module.exports = {
  validate,
  retentionSchemas: validationSchemas
};

