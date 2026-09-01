require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { EventEmitter } = require("node:events");
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

// A few useful globals.
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  // The environment variable above ensures these operations use the test database.
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  user1 = await prisma.user.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.user.create({
    data: { name: "Alice", email: "alice@sample.com", hashedPassword: "nonsense" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("testing task creation", () => {
  it("14. can't create a task without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (error) {
      expect(error.name).toBe("TypeError");
    }
  });

  it("15. can't create a task with a bogus user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: 72348 };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (error) {
      expect(error.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("16. creates a task for a valid user", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });

  it("17. returns the expected task title", () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id;
    expect(saveData.title).toBe("first task");
  });

  it("18. returns false for isCompleted by default", () => {
    expect(saveData.isCompleted).toBe(false);
  });

  it("19. does not return userId", () => {
    expect(saveData.userId).toBeUndefined();
  });
});

describe("test getting created tasks", () => {
  it("20. can't list tasks without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({ method: "GET" });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(index, req, saveRes);
    } catch (error) {
      expect(error.name).toBe("TypeError");
    }
  });

  it("21. returns 200 when user1 lists tasks", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("22. returns a tasks array with one task", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks).toHaveLength(1);
  });

  it("23. returns the expected first task title", () => {
    expect(saveData.tasks[0].title).toBe("first task");
  });

  it("24. does not expose userId in the task list", () => {
    expect(saveData.tasks[0].userId).toBeUndefined();
  });

  it("25. returns 404 when user2 has no tasks", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user2.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("26. retrieves the created task for user1", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("27. prevents user2 from retrieving user1's task", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

describe("testing task updates and deletion", () => {
  it("28. lets user1 mark the task as completed", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { isCompleted: true },
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("29. prevents user2 from updating user1's task", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { isCompleted: true },
    });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("30. prevents user2 from deleting user1's task", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("31. lets user1 delete the task", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("32. returns 404 when user1 has no remaining tasks", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});
