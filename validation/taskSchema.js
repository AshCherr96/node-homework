const Joi = require("joi");

const taskSchema = Joi.object({
  // Task title is required and must be trimmed to a reasonable length.
  title: Joi.string().trim().min(3).max(30).required(),
  // Default completion state to false when omitted.
  isCompleted: Joi.boolean().default(false).not(null),
});

const patchTaskSchema = Joi.object({
  // Title is optional for patch requests, but at least one field must be provided.
  title: Joi.string().trim().min(3).max(30),
  // Completion flag is allowed to change independently when patching.
  isCompleted: Joi.boolean().not(null),
}).min(1);

module.exports = { taskSchema, patchTaskSchema };
