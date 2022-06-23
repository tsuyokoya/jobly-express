const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("when creating an sql partial update object", function () {
  test("should update the user", function () {
    const data = { firstName: "Frodo", lastName: "Baggins", age: 50 };
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name",
    };
    const sqlObject = sqlForPartialUpdate(data, jsToSql);

    expect({
      setCols: '"first_name"=$1, "last_name"=$2, "age"=$3',
      values: ["Frodo", "Baggins", 50],
    }).toEqual(sqlObject);
  });
  test("should update the company", function () {
    const data = { numEmployees: 100 };
    const jsToSql = {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    };
    const sqlObject = sqlForPartialUpdate(data, jsToSql);

    expect({
      setCols: '"num_employees"=$1',
      values: [100],
    }).toEqual(sqlObject);
  });
  test("should fail for empty data", function () {
    const data = {};
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name",
    };
    expect(() => sqlForPartialUpdate(data, jsToSql)).toThrowError(/No data/g);
    expect(() => sqlForPartialUpdate(data, jsToSql)).toThrow(BadRequestError);
  });
});
