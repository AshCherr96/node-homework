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

// User registration
const register = async (req, res, next) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  value.hashedPassword = await hashPassword(value.password);
  delete value.password;

  let user = null;
  try {
    user = await prisma.user.create({
      data: {
        name: value.name,
        email: value.email,
        hashedPassword: value.hashedPassword,
      },
      select: {
        name: true,
        email: true,
        id: true,
      },
    });
    
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Email already registered." });
    } else {
      return next(err);
    }
  }

  global.user_id = user.id;

  return res.status(201).json({
    name: user.name,
    email: user.email,
  });
};

// User logon
async function logon(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

module.exports = {
  register,
  logon,
  logoff,
};

