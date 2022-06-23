const jwt = require("jsonwebtoken");
const { createToken } = require("./tokens");
const { SECRET_KEY } = require("../config");

describe("when creating a token", function () {
  test("should work for non-admin users", function () {
    const token = createToken({ username: "test", is_admin: false });
    const payload = jwt.verify(token, SECRET_KEY);
    expect({
      iat: expect.any(Number),
      username: "test",
      isAdmin: false,
    }).toEqual(payload);
  });

  test("should work for admin users", function () {
    const token = createToken({ username: "test", isAdmin: true });
    const payload = jwt.verify(token, SECRET_KEY);
    expect({
      iat: expect.any(Number),
      username: "test",
      isAdmin: true,
    }).toEqual(payload);
  });

  test("should default to no admin", function () {
    // given the security risk if this didn't work, checking this specifically
    const token = createToken({ username: "test" });
    const payload = jwt.verify(token, SECRET_KEY);
    expect({
      iat: expect.any(Number),
      username: "test",
      isAdmin: false,
    }).toEqual(payload);
  });
});
