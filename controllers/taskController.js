const pool = require("../db/pg-pool");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

function getCurrentUserId() {
  if (typeof global.user_id === "number") return global.user_id;
  return global.user_id?.id ?? null;
}

async function create(req, res) {
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

  // Persist the validated task in the database and return only safe fields.
  const task = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id)
    VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, userId],
  );

  return res.status(201).json(task.rows[0]);
}

async function index(req, res) {
  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  // Scope the query to the currently authenticated user so they only see their own tasks.
  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [userId],
  );

  if (tasks.rows.length === 0) return res.sendStatus(404);

  return res.status(200).json(tasks.rows);
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  // Pull only the requested task if it belongs to the current user.
  const task = await pool.query(
    `SELECT id, title, is_completed
    FROM tasks
    WHERE id = $1 AND user_id = $2`,
    [taskId, userId],
  );

  if (task.rows.length === 0) return res.sendStatus(404);

  return res.status(200).json(task.rows[0]);
}

async function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
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
  // Ignore any client-supplied ownership fields before building the SQL.
  if (taskChange.userId) delete taskChange.userId;
  if (taskChange.id) delete taskChange.id;

  // Map camelCase request keys to the database's snake_case column names.
  const keys = Object.keys(taskChange).map((key) =>
    key === "isCompleted" ? "is_completed" : key,
  );
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  // Restrict the update to the current user so one account can't edit another's task.
  const updatedTask = await pool.query(
    `UPDATE tasks SET ${setClauses}
    WHERE id = ${idParm} AND user_id = ${userParm}
    RETURNING id, title, is_completed`,
    [...Object.values(taskChange), taskId, userId],
  );

  if (updatedTask.rows.length === 0) return res.sendStatus(404);

  return res.status(200).json(updatedTask.rows[0]);
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  // Only delete a task when both the task id and the current user's id match.
  const deletedTask = await pool.query(
    `DELETE FROM tasks
    WHERE id = $1 AND user_id = $2
    RETURNING id, title, is_completed`,
    [taskId, userId],
  );

  if (deletedTask.rows.length === 0) return res.sendStatus(404);

  return res.status(200).json(deletedTask.rows[0]);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
