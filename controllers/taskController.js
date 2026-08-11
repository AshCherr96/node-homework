const prisma = require("../db/prisma");
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
    isCompleted: taskRow.isCompleted ?? taskRow.is_completed,
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
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: isCompleted,
        userId: userId,
      },
      select: { 
        id: true, 
        title: true, 
        isCompleted: true 
      },
    });

    return res.status(201).json({
      id: task.id,
      title: task.title,
      isCompleted: task.isCompleted,
    });
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  try {
    const tasks = await prisma.task.findMany({
      where: { userId: userId },
      orderBy: { id: "asc" },
      select: { 
        id: true,
        title: true, 
        isCompleted: true 
      },
    });

    if (tasks.length === 0) {
      return res.sendStatus(404);
    }

    return res.status(200).json(tasks);
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
    const task = await prisma.task.findUnique({
      where: {
        id_userId: {
          id: taskId,
          userId: userId,
        },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    if (!task) {
      return res.status(404).json({ message: "The task was not found." });
    }

    return res.status(200).json({
      id: task.id,
      title: task.title,
      isCompleted: task.isCompleted,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err);
    }
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

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id_userId: {
          id: taskId,
          userId: userId,
        },
      },
      select: { id: true, title: true, isCompleted: true },
    });

    return res.status(200).json(normalizeTaskResponse(task));
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err);
    }
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (Number.isNaN(taskId) || taskId < 1) return res.sendStatus(400);

  try {
    const deletedTask = await prisma.task.delete({
      where: {
        id_userId: {
          id: taskId,
          userId: userId,
        },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(200).json({
      id: deletedTask.id,
      title: deletedTask.title,
      isCompleted: deletedTask.isCompleted,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err);
    }
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
