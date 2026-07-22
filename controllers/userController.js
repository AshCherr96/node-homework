// controllers/userController.js

global.users = global.users || [];
global.user_id = global.user_id || null;

const register = (req, res) => {
  const { name, email, password } = req.body;

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
  };

  global.users.push(newUser);
  global.user_id = newUser; // Set global.user_id to the created user object

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
};

const logon = (req, res) => {
  const { email, password } = req.body;

  const user = global.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  global.user_id = user;

  res.status(200).json({
    name: user.name,
    email: user.email,
  });
};

const logoff = (req, res) => {
  global.user_id = null;
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  register,
  logon,
  logoff,
};