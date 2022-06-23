"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  test("works", async function () {
    const newJob = {
      title: "Rapper",
      salary: 100,
      equity: "0.1",
      company_handle: "c1",
    };

    const job = await Job.create(newJob);
    const jobId = job["id"];
    delete job["id"];
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobId}`
    );
    expect(result.rows).toEqual([
      {
        company_handle: "c1",
        equity: "0.1",
        id: expect.any(Number),
        salary: 100,
        title: "Rapper",
      },
    ]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        company_handle: "c1",
        equity: "0.0",
        id: expect.any(Number),
        salary: 100,
        title: "title1",
      },
      {
        company_handle: "c2",
        equity: "0.2",
        id: expect.any(Number),
        salary: 200,
        title: "title2",
      },
      {
        company_handle: "c3",
        equity: "0.3",
        id: expect.any(Number),
        salary: 300,
        title: "title3",
      },
    ]);
  });
  test("filter works: by title", async function () {
    const filterData = {
      title: "title1",
    };
    const job = await Job.filter(filterData);
    expect(job[0]).toEqual({
      company_handle: "c1",
      equity: "0.0",
      id: expect.any(Number),
      salary: 100,
      title: "title1",
    });
  });
  test("filter works: by minSalary", async function () {
    const filterData = {
      minSalary: 200,
    };
    const job = await Job.filter(filterData);
    expect(job).toEqual([
      {
        company_handle: "c2",
        equity: "0.2",
        id: expect.any(Number),
        salary: 200,
        title: "title2",
      },
      {
        company_handle: "c3",
        equity: "0.3",
        id: expect.any(Number),
        salary: 300,
        title: "title3",
      },
    ]);
  });
  test("filter works: by hasEquity", async function () {
    const filterData = {
      hasEquity: "true",
    };
    const job = await Job.filter(filterData);
    expect(job).toEqual([
      {
        company_handle: "c2",
        equity: "0.2",
        id: expect.any(Number),
        salary: 200,
        title: "title2",
      },
      {
        company_handle: "c3",
        equity: "0.3",
        id: expect.any(Number),
        salary: 300,
        title: "title3",
      },
    ]);
  });
  test("throws error with invalid filter", async function () {
    const filterData = {
      my: "filter",
      name: "todd",
    };
    await expect(async () => await Job.filter(filterData)).rejects.toThrowError(
      "Invalid filter"
    );
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const job = await Job.get("title1");
    expect(job).toEqual({
      company_handle: {
        description: "Desc1",
        handle: "c1",
        logo_url: "http://c1.img",
        name: "C1",
        num_employees: 1,
      },
      equity: "0.0",
      id: expect.any(Number),
      salary: 100,
      title: "title1",
    });
  });

  test("not found if no such company", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "newTitle",
    salary: 900,
    equity: 0.5,
  };

  test("works", async function () {
    const targetJob = await Job.get("title1");
    let job = await Job.update(targetJob.id, updateData);
    expect(job).toEqual({
      id: targetJob.id,
      ...updateData,
      company_handle: "c1",
      equity: "0.5",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${targetJob.id}`
    );
    expect(result.rows).toEqual([
      {
        id: targetJob.id,
        ...updateData,
        company_handle: "c1",
        equity: "0.5",
      },
    ]);
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const targetJob = await Job.get("title1");
    await Job.remove(targetJob.id);
    const res = await db.query(`SELECT id FROM jobs WHERE id=${targetJob.id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(100000);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
