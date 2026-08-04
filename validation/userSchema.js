const Joi = require("joi");

const userSchema = Joi.object({
  // Email must be present and valid.
  email: Joi.string().trim().lowercase().email().required(),
  // Name must be a trimmed string between 3 and 30 characters.
  name: Joi.string().trim().min(3).max(30).required(),
  // Require at least one lowercase, one uppercase, one digit, and one special character.
  password: Joi.string()
    .trim()
    .min(8)
    .pattern(new RegExp("(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])"))
    .required(),
});

module.exports = { userSchema };
