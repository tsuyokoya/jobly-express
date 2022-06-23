"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * */

  static async create({ title, salary, equity, company_handle }) {
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle`,
      [title, salary, equity, company_handle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           ORDER BY company_handle`
    );
    return jobsRes.rows;
  }

  /** Filter jobs based on query parameters
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * Throws BadRequestError if filter is invalid.
   *
   * */

  static async filter(query) {
    // Throw error if query parameter includes an invalid filter
    const validFilters = ["title", "minSalary", "hasEquity"];
    for (const key of Object.keys(query)) {
      if (validFilters.includes(key) === false) {
        throw new BadRequestError(`Invalid filter`);
      }
    }

    // Store SQL clause for each filter and its values
    const filters = [];
    const filtersValues = [];

    if ("title" in query) {
      const queryPortion = `title ILIKE $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push("%" + query["title"] + "%");
    }
    if ("minSalary" in query) {
      const queryPortion = `salary >= $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push(query["minSalary"]);
    }
    if ("hasEquity" in query && query["hasEquity"] === "true") {
      const queryPortion = `equity > $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push(0);
    }

    // Join SQL clauses with "AND" if there are more than one
    const filtersQuery =
      filters.length > 1 ? filters.join(" AND ") : filters[0];

    const sqlQuery = `SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE ${filtersQuery}
      ORDER BY company_handle`;

    const jobsRes = await db.query(sqlQuery, filtersValues);
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company_handle }
   *  where company_handle is { handle, name, description, num_employees, logo_url }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = $1`,
      [title]
    );

    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job: ${title}`);

    const company = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
      FROM companies
      WHERE handle=$1`,
      [jobRes.rows[0]["company_handle"]]
    );

    job.company_handle = company.rows[0];

    return job;
  }

  /** Update job data with `data`.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                      SET ${setCols}
                      WHERE id = ${idVarIdx}
                      RETURNING id, title, salary, equity, company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No company: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
