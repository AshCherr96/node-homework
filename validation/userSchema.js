const Joi = require("joi");

const userSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  name: Joi.string().trim().min(3).max(30).required(),
  // require at least one lowercase, one uppercase, one digit, and one special char
  password: Joi.string()
    .trim()
    .min(8)
    .pattern(new RegExp("(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])"))
    .required(),
});

module.exports = { userSchema };
