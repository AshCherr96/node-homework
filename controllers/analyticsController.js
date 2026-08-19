const prisma = require("../db/prisma");

async function getUserAnalytics(req, res, next) {
  // 1. Parse and validate user ID from req.params
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId) || userId < 1) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // 2. 404 Check Required: Check whether the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Use groupBy to count tasks by completion status
    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // 4. Include recent task activity with eager loading (last 10)
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 5. Calculate weekly progress using groupBy (tasks created in the last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      _count: { id: true },
    });

    // 6. Return response with taskStats, recentTasks, and weeklyProgress
    return res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress,
    });
  } catch (err) {
    return next(err);
  }
}

// Renamed from getAllUserAnalytics to getUsersWithStats to match test requirements
async function getUsersWithStats(req, res, next) {
  // Parse pagination parameters from query (default to page 1 and limit 10)
  let page = parseInt(req.query.page, 10) || 1;
  if (page < 1) page = 1;

  let limit = parseInt(req.query.limit, 10) || 10;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  try {
    // Get users with task counts and incomplete tasks using include
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Transform to only include the fields we want
    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    // Get total count for pagination metadata
    const totalUsers = await prisma.user.count();

    // Build pagination object
    const totalPages = Math.ceil(totalUsers / limit) || 1;
    const pagination = {
      page: page,
      limit: limit,
      total: totalUsers,
      pages: totalPages,
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1,
    };

    // Return users and pagination response
    return res.status(200).json({
      users,
      pagination,
    });
  } catch (err) {
    return next(err);
  }
}

async function searchTasks(req, res, next) {
  const searchQuery = req.query.q || req.query.find || "";

  // Validate search query (must be at least 2 characters)
 if (searchQuery.trim().length < 2) {
  return res.status(400).json({ error: "Query is too short" });
}

  // Get limit from query (default to 20 if not provided)
  const limit = parseInt(req.query.limit, 10) || 20;

  // Construct search patterns outside the query for proper parameterization
  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    // Use raw SQL with parameterized template literals
    const searchResults = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern} 
         OR u.name ILIKE ${searchPattern}
      ORDER BY 
        CASE 
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    // Return results with the results array, query string, and count number
    return res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};