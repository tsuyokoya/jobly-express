"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "newJob",
    salary: 10000,
    equity: 0.4,
    company_handle: "c1",
  };
  test("fails for non-admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("ok for admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);

    expect(resp.body).toEqual({
      job: {
        title: "newJob",
        salary: 10000,
        equity: "0.4",
        company_handle: "c1",
        id: expect.any(Number),
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        salary: 100,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        salary: "ten",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          company_handle: "c1",
          equity: "0.1",
          id: expect.any(Number),
          salary: 100,
          title: "job1",
        },
        {
          company_handle: "c2",
          equity: "0.2",
          id: expect.any(Number),
          salary: 200,
          title: "job2",
        },
      ],
    });
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:title", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/job1`);
    expect(resp.body).toEqual({
      job: {
        company_handle: {
          description: "Desc1",
          handle: "c1",
          logo_url: "http://c1.img",
          name: "C1",
          num_employees: 1,
        },
        equity: "0.1",
        id: expect.any(Number),
        salary: 100,
        title: "job1",
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/jobs/job1`);
    expect(resp.body).toEqual({
      job: {
        company_handle: {
          description: "Desc1",
          handle: "c1",
          logo_url: "http://c1.img",
          name: "C1",
          num_employees: 1,
        },
        equity: "0.1",
        id: expect.any(Number),
        salary: 100,
        title: "job1",
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin users", async function () {
    const job = await request(app).get(`/jobs/job1`);
    const jobId = job.body.job.id;

    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "newJobTitle",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        company_handle: "c1",
        equity: "0.1",
        id: expect.any(Number),
        salary: 100,
        title: "newJobTitle",
      },
    });
  });

  test("unauth for non-admin user", async function () {
    const job = await request(app).get(`/jobs/job1`);
    const jobId = job.body.job.id;

    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "newJobTitle",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/jobs/100000`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on invalid data", async function () {
    const job = await request(app).get(`/jobs/job1`);
    const jobId = job.body.job.id;

    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        salary: "not-an-integer",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin users", async function () {
    const job = await request(app).get(`/jobs/job1`);
    const jobId = job.body.job.id;

    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: expect.any(String) });
  });

  test("unauth for non-admin users", async function () {
    const job = await request(app).get(`/jobs/job1`);
    const jobId = job.body.job.id;

    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/100000`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
