const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");
const { userSchema } = require("../validation/userSchema");

// Keep the authenticated user id in a simple session variable for the app.
global.user_id = global.user_id || null;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, keyHex] = storedHash.split(":");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  const storedKey = Buffer.from(keyHex, "hex");

  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKey, derivedKey);
}

async function show(req, res, next) {
  const userId = parseInt(req.params.id, 10);
  
  if (Number.isNaN(userId) || userId < 1) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        Task: {
          where: { isCompleted: false },
          select: { 
            id: true, 
            title: true, 
            priority: true,
            createdAt: true 
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
}

// User registration
async function register(req, res, next) {
  if (!req.body) req.body = {};

  // 1. Run Joi validation
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    // 2. Hash the password using scrypt (matching your helper function)
    const hashedPassword = await hashPassword(value.password);
    const { email, name } = value;

    // 3. Use prisma.$transaction() to wrap user creation and task creation
    const result = await prisma.$transaction(async (tx) => {
      // Create user account using tx
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    // 4. Store user ID globally for session management
    global.user_id = result.user.id;

    // 5. Send success response with status 201
    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    // Handle P2002 errors (duplicate email)
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    } else {
      return next(err);
    }
  }
}

// User logon
async function logon(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      // We must select hashedPassword to verify it, but we can safely select specific public fields to return
      select: {
        id: true,
        name: true,
        email: true,
        hashedPassword: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatch = await comparePassword(password, user.hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    global.user_id = user.id;
    return res.status(200).json({ message: "Logged on successfully.", name: user.name });
  } catch (err) {
    return next(err);
  }
}

// User logoff
const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(200);
};

// Example helper or method logic for dynamic field selection
async function getTasksWithDynamicFields(req, res, next) {
 const userId = global.user_id;
if (!userId) {
  return res.sendStatus(401);
}

  // Default fields if none or invalid fields are requested
  const allowedFields = ["id", "title", "isCompleted", "priority", "createdAt"];
  let selectFields = { id: true, title: true, isCompleted: true, priority: true, createdAt: true };

  // Check if a 'fields' query parameter was provided (e.g., ?fields=id,title,priority)
  if (req.query.fields) {
    const requestedFields = req.query.fields.split(",");
    selectFields = {}; // Reset default select
    
    for (const field of requestedFields) {
      const trimmedField = field.trim();
      if (allowedFields.includes(trimmedField)) {
        selectFields[trimmedField] = true;
      }
    }

    // Fallback if no valid fields matched
    if (Object.keys(selectFields).length === 0) {
      selectFields = { id: true, title: true };
    }
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      select: selectFields,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(tasks);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  logon,
  logoff,
  show,
  getTasksWithDynamicFields,
};

