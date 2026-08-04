// controllers/taskController.js

const pool = require("../db/pg-pool");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

function getCurrentUserId() {
  return typeof global.user_id === "number"
    ? global.user_id
    : global.user_id?.id ?? null;
}

function normalizeTaskResponse(taskRow) {
  if (!taskRow) return taskRow;

  return {
    id: taskRow.id,
    title: taskRow.title,
    is_completed: taskRow.is_completed,
  };
}

async function create(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  const isCompleted = value.isCompleted ?? value.is_completed ?? false;

  try {
    const task = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
      VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
      [value.title, isCompleted, userId],
    );

    return res.status(201).json(normalizeTaskResponse(task.rows[0]));
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  try {
    const tasks = await pool.query(
      "SELECT id, title, is_completed FROM tasks WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    );

    return res.status(200).json(tasks.rows.map(normalizeTaskResponse));
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  try {
    const task = await pool.query(
      `SELECT id, title, is_completed
      FROM tasks
      WHERE id = $1 AND user_id = $2`,
      [taskId, userId],
    );

    if (task.rows.length === 0) return res.sendStatus(404);

    return res.status(200).json(normalizeTaskResponse(task.rows[0]));
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const schemaToUse = patchTaskSchema || taskSchema;
  const { error, value } = schemaToUse.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  const taskChange = { ...value };
  if (taskChange.userId) delete taskChange.userId;
  if (taskChange.id) delete taskChange.id;

  if (taskChange.isCompleted !== undefined) {
    taskChange.is_completed = taskChange.isCompleted;
    delete taskChange.isCompleted;
  }

  if (Object.keys(taskChange).length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const keys = Object.keys(taskChange);
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  try {
    const updatedTask = await pool.query(
      `UPDATE tasks SET ${setClauses}
      WHERE id = ${idParm} AND user_id = ${userParm}
      RETURNING id, title, is_completed`,
      [...Object.values(taskChange), taskId, userId],
    );

    if (updatedTask.rows.length === 0) return res.sendStatus(404);

    return res.status(200).json(normalizeTaskResponse(updatedTask.rows[0]));
  } catch (err) {
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  try {
    const deletedTask = await pool.query(
      `DELETE FROM tasks
      WHERE id = $1 AND user_id = $2
      RETURNING id, title, is_completed`,
      [taskId, userId],
    );

    if (deletedTask.rows.length === 0) return res.sendStatus(404);

    return res.status(200).json(normalizeTaskResponse(deletedTask.rows[0]));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};