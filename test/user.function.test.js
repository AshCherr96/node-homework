require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");
const { app, server } = require("../app");

let agent;
let saveRes;
let csrfToken;

const getJwtCookie = (response) => {
  const setCookieHeader = response?.headers?.["set-cookie"];
  if (!Array.isArray(setCookieHeader)) {
    return undefined;
  }
  return setCookieHeader.find((entry) => entry.startsWith("jwt="));
};

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  agent = request.agent(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

describe("register a user", () => {
  it("46. creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. registration returns the expected name and csrfToken", () => {
    expect(saveRes.body).toEqual(
      expect.objectContaining({
        name: "John Deere",
        csrfToken: expect.any(String),
      }),
    );
    csrfToken = saveRes.body.csrfToken;
    expect(csrfToken).toBeDefined();
  });

  it("48. registration sets the JWT cookie with HttpOnly", () => {
    const jwtCookie = getJwtCookie(saveRes);
    expect(jwtCookie).toBeDefined();
    expect(jwtCookie).toMatch(/^jwt=/);
    expect(jwtCookie).toContain("HttpOnly");
  });

  it("49. logs on as the new user", async () => {
    saveRes = await agent
      .post("/api/users/logon")
      .send({ email: "jdeere@example.com", password: "Pa$$word20" });
    csrfToken = saveRes.body.csrfToken;
    expect(saveRes.status).toBe(200);
  });

  it("50. logon sets a JWT cookie with HttpOnly", () => {
    const jwtCookie = getJwtCookie(saveRes);
    expect(jwtCookie).toBeDefined();
    expect(jwtCookie).toMatch(/^jwt=/);
    expect(jwtCookie).toContain("HttpOnly");
  });

  it("51. verifies the user is logged in", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.status).not.toBe(401);
  });

  it("52. logs out the user and clears the JWT cookie", async () => {
    saveRes = await agent
      .post("/api/users/logoff")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(saveRes.status).toBe(200);

    const jwtCookie = getJwtCookie(saveRes);
    expect(jwtCookie).toBeDefined();
    expect(jwtCookie).toMatch(/^jwt=/);
    expect(jwtCookie).toContain("Jan 1970");
  });

  it("53. verifies the user is logged out", async () => {
    saveRes = await agent.get("/api/tasks");
    expect(saveRes.status).toBe(401);
  });
});
