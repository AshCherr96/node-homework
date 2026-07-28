// controllers/userController.js

const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

const scrypt = util.promisify(crypto.scrypt);

global.users = global.users || [];
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

const register = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const { name, email, password } = value;

  const existingUser = global.users.find((u) => u.email === email);
  if (existingUser) {
    return res.sendStatus(409);
  }

  const hashedPassword = await hashPassword(password);
  const newUser = {
    id: Date.now(),
    name,
    email,
    hashedPassword,
  };

  global.users.push(newUser);
  // store a minimal user object for the current session/context
  global.user_id = { id: newUser.id, name: newUser.name, email: newUser.email };

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
};

const logon = async (req, res) => {
  const { email, password } = req.body;

  const user = global.users.find((u) => u.email === email);
  const goodCredentials = user && (await comparePassword(password, user.hashedPassword));

  if (!goodCredentials) {
    return res.sendStatus(401);
  }

  // store a minimal user object for the current session/context
  global.user_id = { id: user.id, name: user.name, email: user.email };

  res.status(200).json({
    name: user.name,
    email: user.email,
  });
};

const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(200);
};

module.exports = {
  register,
  logon,
  logoff,
};