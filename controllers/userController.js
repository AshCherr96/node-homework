// controllers/userController.js

const crypto = require("crypto");
const util = require("util");
const pool = require("../db/pg-pool");
const { userSchema } = require("../validation/userSchema");

const scrypt = util.promisify(crypto.scrypt);

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

  // Use timingSafeEqual for constant-time comparison
  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKey, derivedKey);
}

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

  let user = null;
  // Hash the submitted password before saving it to the database.
  value.hashed_password = await hashPassword(value.password);

  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    );
  } catch (e) {
    if (e.code === "23505") {
      return res.status(400).json({ message: "Email already registered" });
    }
    return next(e);
  }

  const newUser = user.rows[0];
  // Store the newly registered user id in the app session for later task ownership checks.
  global.user_id = newUser.id;

  return res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
};

const logon = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Look up the account by email in the database before checking credentials.
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const dbUser = result.rows[0];

    if (!dbUser) {
      // The account must exist in the database before password verification can proceed.
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Compare the submitted password with the stored password hash.
    const goodCredentials = await comparePassword(password, dbUser.hashed_password);

    if (!goodCredentials) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    global.user_id = dbUser.id;

    return res.status(200).json({
      name: dbUser.name,
      email: dbUser.email,
    });
  } catch (err) {
    next(err);
  }
};

const logoff = (req, res) => {
  // Clear the active session-only user id after a user logs out.
  global.user_id = null;
  res.sendStatus(200);
};

module.exports = {
  register,
  logon,
  logoff,
};