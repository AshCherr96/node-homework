function register(req, res, next) {
  const { name, email, password } = req.body;

  if (!global.users) {
    global.users = [];
  }

  const newUser = {
    name,
    email,
    password,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  return res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

function logon(req, res, next) {
  const { email, password } = req.body;

  if (!global.users) {
    global.users = [];
  }

  const matchedUser = global.users.find(
    (user) => user.email === email && user.password === password
  );

  if (!matchedUser) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  global.user_id = matchedUser;

  return res.status(200).json({
    name: matchedUser.name,
    email: matchedUser.email,
  });
}

function logoff(req, res, next) {
  // Clear the active session user
  global.user_id = null;

  // Return status 200
  return res.status(200).json({
    message: "Logged off successfully.",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};