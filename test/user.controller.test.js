require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { EventEmitter } = require("node:events");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const jwt = require("jsonwebtoken");

const cookie = require("cookie");

let saveRes = null;
let saveData = null;
let registerRes = null;
let loginRes = null;
let saveReq = null;
let jwtCookie;

function MockResponseWithCookies() {
  const res = httpMocks.createResponse({
    eventEmitter: EventEmitter,
  });

  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");
    if (currentHeader === undefined) {
      currentHeader = [];
    }
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };

  return res;
}

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("testing logon, register, and logoff", () => {
  it("33. A user can be registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    registerRes = saveRes;
    expect(saveRes.statusCode).toBe(201);
  });

  it("34. The user can logon.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    loginRes = saveRes;
    expect(saveRes.statusCode).toBe(200);
  });

  it("35. A string in the cookie array starts with jwt=.", () => {
    const setCookieArray = loginRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });

  it("36. That string contains HttpOnly;.", () => {
    expect(jwtCookie).toContain("HttpOnly");
  });

  it("37. The returned data from the register has the expected name.", () => {
    saveData = registerRes._getJSONData();
    expect(saveData.name).toBe("Bob");
  });

  it("38. The returned data contains a csrfToken.", () => {
    saveData = registerRes._getJSONData();
    expect(saveData.csrfToken).toBeDefined();
  });

  it("39. You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    req.cookies = { jwt: jwt.sign({ id: 1, csrfToken: registerRes._getJSONData().csrfToken }, process.env.JWT_SECRET, { expiresIn: "1h" }) };
    req.headers = { "X-CSRF-TOKEN": registerRes._getJSONData().csrfToken };
    await waitForRouteHandlerCompletion(logoff, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("40. The logoff clears the cookie.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toContain("Jan 1970");
  });

  it("41. A logon attempt with a bad password returns a 401.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "bad password" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("42. You can't register with an email address that is already registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("Testing JWT middleware", () => {
  it("61. jwtMiddleware returns a 401 if the JWT cookie is not present in the req.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("62. Returns a 401 if the JWT is invalid.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const badToken = jwt.sign({ id: 5, csrfToken: "badToken" }, "badSecret", {
      expiresIn: "1h",
    });
    req.cookies = { jwt: badToken };
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("63. Returns a 401 if the JWT is valid but the CSRF token isn't.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const validToken = jwt.sign({ id: 5, csrfToken: "badtoken" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    req.cookies = { jwt: validToken };
    req.headers = {};
    req.headers["X-CSRF-TOKEN"] = "goodtoken";
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("64. Calls next() if both the token and the jwt are good.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const validToken = jwt.sign({ id: 5, csrfToken: "goodtoken" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    req.cookies = { jwt: validToken };
    req.headers = {};
    req.headers["X-CSRF-TOKEN"] = "goodtoken";
    const next = await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    saveReq = req;
    expect(next).toHaveBeenCalled();
  });

  it("65. If both the token and the jwt are good, req.user.id has the appropriate value.", () => {
    expect(saveReq.user.id).toBe(5);
  });
});
