const Joi = require("joi");

const taskSchema = Joi.object({
  title: Joi.string().required().max(255),
 isCompleted: Joi.boolean().default(false),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
});

const patchTaskSchema = Joi.object({
  title: Joi.string().max(255),
  isCompleted: Joi.boolean(),
  priority: Joi.string().valid("low", "medium", "high"),
});

module.exports = {
  taskSchema,
  patchTaskSchema,
};
