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
  const priority = value.priority ?? "medium";

  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: isCompleted,
        priority: priority,
        userId: userId,
      },
      select: { 
        id: true, 
        title: true, 
        isCompleted: true,
        priority: true,
      },
    });

    return res.status(201).json({
      id: task.id,
      title: task.title,
      isCompleted: task.isCompleted,
      priority: task.priority,
    });
  } catch (err) {
    return next(err);
  }
}

async function bulkCreate(req, res, next) {
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ 
      error: "Invalid request data. Expected an array of tasks." 
    });
  }

  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }

    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted ?? false,
      priority: value.priority ?? "medium",
      userId: userId,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

const getOrderBy = (query) => {
  const validSortFields = ["title", "priority", "createdAt", "id", "isCompleted"];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";
  
  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" };
};

async function index(req, res, next) {
  const userId = getCurrentUserId();
  if (!userId) return res.sendStatus(401);

  // 1. Parse and validate pagination parameters (page >= 1, limit 1-100)
  let page = parseInt(req.query.page, 10) || 1;
  if (page < 1) page = 1;

  let limit = parseInt(req.query.limit, 10) || 10;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  // 2. Build where clause with optional search filter
  const whereClause = { userId: userId };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: { 
        id: true,
        title: true, 
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      skip: skip,
      take: limit,
      orderBy: getOrderBy(req.query),
    });

    const totalTasks = await prisma.task.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalTasks / limit) || 1;
    const pagination = {
      page: page,
      limit: limit,
      total: totalTasks,
      pages: totalPages,
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1,
    };

    return res.status(200).json({
      tasks,
      pagination,
    });
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
    // Use the compound unique key (id_userId) to enforce ownership securely
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
        priority: true,
        createdAt: true,
        // Include nested User relation to satisfy eager loading requirements
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "The task was not found." });
    }

    return res.status(200).json(task);
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

  const taskId = parseInt(req.params.id, 10);
  const userId = getCurrentUserId();

  if (!userId) return res.sendStatus(401);
  if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID" });

  const updateData = {};
  if (value.title !== undefined) updateData.title = value.title;
  if (value.isCompleted !== undefined) updateData.isCompleted = value.isCompleted;
  if (value.priority !== undefined) updateData.priority = value.priority;
  if (value.is_completed !== undefined && value.isCompleted === undefined) {
    updateData.isCompleted = value.is_completed;
  }

  try {
    // Use the compound unique key (id_userId) for secure updates
    const task = await prisma.task.update({
      where: {
        id_userId: {
          id: taskId,
          userId: userId,
        },
      },
      data: updateData,
      select: { id: true, title: true, isCompleted: true, priority: true },
    });
    return res.status(200).json(task);
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
    // Use the compound unique key (id_userId) for secure deletion
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
  bulkCreate,
};
