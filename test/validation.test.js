const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });

  it("2. requires an email", () => {
    const { error } = userSchema.validate({
      name: "Bob",
      password: "Password1!",
    });
    expect(error.details.find((detail) => detail.context.key === "email")).toBeDefined();
  });

  it("3. does not accept an invalid email", () => {
    const { error } = userSchema.validate({
      name: "Bob",
      email: "not-an-email",
      password: "Password1!",
    });
    expect(error.details.find((detail) => detail.context.key === "email")).toBeDefined();
  });

  it("4. requires a password", () => {
    const { error } = userSchema.validate({ name: "Bob", email: "bob@sample.com" });
    expect(error.details.find((detail) => detail.context.key === "password")).toBeDefined();
  });

  it("5. requires a name", () => {
    const { error } = userSchema.validate({
      email: "bob@sample.com",
      password: "Password1!",
    });
    expect(error.details.find((detail) => detail.context.key === "name")).toBeDefined();
  });

  it("6. requires a name from 3 to 30 characters", () => {
    const { error } = userSchema.validate({
      name: "Bo",
      email: "bob@sample.com",
      password: "Password1!",
    });
    expect(error.details.find((detail) => detail.context.key === "name")).toBeDefined();
  });

  it("7. returns a falsy error for a valid user", () => {
    const { error } = userSchema.validate({
      name: "Bob",
      email: "bob@sample.com",
      password: "Password1!",
    });
    expect(error).toBeFalsy();
  });
});

describe("task object validation tests", () => {
  it("8. requires a title", () => {
    const { error } = taskSchema.validate({});
    expect(error.details.find((detail) => detail.context.key === "title")).toBeDefined();
  });

  it("9. requires isCompleted to be valid when specified", () => {
    const { error } = taskSchema.validate({ title: "Buy milk", isCompleted: "yes" });
    expect(error.details.find((detail) => detail.context.key === "isCompleted")).toBeDefined();
  });

  it("10. provides false when isCompleted is omitted", () => {
    const { value } = taskSchema.validate({ title: "Buy milk" });
    expect(value.isCompleted).toBe(false);
  });

  it("11. retains true for isCompleted", () => {
    const { value } = taskSchema.validate({ title: "Buy milk", isCompleted: true });
    expect(value.isCompleted).toBe(true);
  });
});

describe("patch task object validation tests", () => {
  it("12. does not require a title", () => {
    const { error } = patchTaskSchema.validate({});
    expect(error).toBeFalsy();
  });

  it("13. leaves isCompleted undefined when omitted", () => {
    const { value } = patchTaskSchema.validate({});
    expect(value.isCompleted).toBeUndefined();
  });
});
