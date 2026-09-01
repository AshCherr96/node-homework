const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    const passwordDetail = error.details.find((detail) => detail.path[0] === "password");
    expect(passwordDetail.path[0]).toBe("password");
  });

  it("2. requires an email", () => {
    const { error } = userSchema.validate(
      { name: "Bob", password: "Password1!" },
      { abortEarly: false },
    );
    const emailDetail = error.details.find((detail) => detail.path[0] === "email");
    expect(emailDetail.path[0]).toBe("email");
  });

  it("3. does not accept an invalid email", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "not-an-email", password: "Password1!" },
      { abortEarly: false },
    );
    const emailDetail = error.details.find((detail) => detail.path[0] === "email");
    expect(emailDetail.path[0]).toBe("email");
  });

  it("4. requires a password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com" },
      { abortEarly: false },
    );
    const passwordDetail = error.details.find((detail) => detail.path[0] === "password");
    expect(passwordDetail.path[0]).toBe("password");
  });

  it("5. requires a name", () => {
    const { error } = userSchema.validate(
      { email: "bob@sample.com", password: "Password1!" },
      { abortEarly: false },
    );
    const nameDetail = error.details.find((detail) => detail.path[0] === "name");
    expect(nameDetail.path[0]).toBe("name");
  });

  it("6. requires a name from 3 to 30 characters", () => {
    const { error } = userSchema.validate(
      { name: "Bo", email: "bob@sample.com", password: "Password1!" },
      { abortEarly: false },
    );
    const nameDetail = error.details.find((detail) => detail.path[0] === "name");
    expect(nameDetail.path[0]).toBe("name");
  });

  it("7. returns a falsy error for a valid user", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "Password1!" },
      { abortEarly: false },
    );
    expect(error).toBeUndefined();
  });
});

describe("task object validation tests", () => {
  it("8. requires a title", () => {
    const { error } = taskSchema.validate({}, { abortEarly: false });
    const titleDetail = error.details.find((detail) => detail.path[0] === "title");
    expect(titleDetail.path[0]).toBe("title");
  });

  it("9. rejects an invalid isCompleted value", () => {
    const { error } = taskSchema.validate(
      { title: "Buy milk", isCompleted: "yes" },
      { abortEarly: false },
    );
    const isCompletedDetail = error.details.find((detail) => detail.path[0] === "isCompleted");
    expect(isCompletedDetail.path[0]).toBe("isCompleted");
  });

  it("10. provides false when isCompleted is omitted by schema default", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(false);
  });

  it("11. retains true for isCompleted", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk", isCompleted: true },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(true);
  });
});

describe("patch task object validation tests", () => {
  it("12. accepts a valid patch without a title", () => {
    const { error } = patchTaskSchema.validate(
      { isCompleted: true },
      { abortEarly: false },
    );
    expect(error).toBeUndefined();
  });

  it("13. leaves isCompleted undefined when omitted", () => {
    const { value } = patchTaskSchema.validate(
      { title: "Buy milk" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBeUndefined();
  });
});
