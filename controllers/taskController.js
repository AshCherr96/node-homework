const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

let nextTaskId = 1;

function taskCounter() {
  return nextTaskId++;
}

function sanitizeTask(task) {
  const { userId, ...sanitizedTask } = task;
  return sanitizedTask;
}

function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const task = {
    id: taskCounter(),
    ...value,
    // ensure ownership can't be overridden by client data
    userId: global.user_id.email,
  };

  global.tasks.push(task);

  res.status(201).json(sanitizeTask(task));
}

function index(req, res) {
  if (!global.user_id?.email) return res.sendStatus(401);

  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email
  );

  if (userTasks.length === 0) return res.sendStatus(404);

  const sanitizedTasks = userTasks.map((task) => sanitizeTask(task));

  res.status(200).json(sanitizedTasks);
}

function show(req, res) {
  const taskId = parseInt(req.params?.id, 10);
  const userEmail = global.user_id?.email;

  if (!userEmail) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === userEmail
  );

  if (!task) return res.sendStatus(404);

  res.status(200).json(sanitizeTask(task));
}

function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const taskId = parseInt(req.params?.id, 10);
  const userEmail = global.user_id?.email;

  if (!userEmail) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === userEmail
  );

  if (!task) return res.sendStatus(404);

  // prevent clients from changing ownership or id via patch
  if (value.userId) delete value.userId;
  if (value.id) delete value.id;

  Object.assign(task, value);

  res.status(200).json(sanitizeTask(task));
}

function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id, 10);
  const userEmail = global.user_id?.email;

  if (!userEmail) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskId && task.userId === userEmail
  );

  if (taskIndex === -1) return res.sendStatus(404);

  const [deletedTask] = global.tasks.splice(taskIndex, 1);
  res.status(200).json(sanitizeTask(deletedTask));
}

module.exports = {
  taskCounter,
  create,
  index,
  show,
  update,
  deleteTask,
};
