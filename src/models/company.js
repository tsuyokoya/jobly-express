"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

const selectQuery = async (from, where, fields) => {
  const whereClause = where.map((col, i) => `${col} = $${i + 1}`).join(" AND ");
  return await db.query(`SELECT * FROM ${from} WHERE ${whereClause}`, fields);
};

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await selectQuery("companies", ["handle"], [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies - up to 100 companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name
           LIMIT 100`
    );
    return companiesRes.rows;
  }

  /** Filter companies based on query parameters
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * Throws BadRequestError if filter is invalid.
   *
   * */

  static async filter(query) {
    // Throw error if query parameter includes an invalid filter
    const validFilters = ["name", "minEmployees", "maxEmployees"];
    for (const key of Object.keys(query)) {
      if (validFilters.includes(key) === false) {
        throw new BadRequestError(`Invalid filter`);
      }
    }

    // Throw error if minEmployees > maxEmployees
    if (
      Object.keys(query).includes("minEmployees") &&
      Object.keys(query).includes("maxEmployees") &&
      Number(query["minEmployees"]) > Number(query["maxEmployees"])
    ) {
      throw new BadRequestError(
        `minEmployees cannot be greater than maxEmployees`
      );
    }

    // Store SQL clause for each filter and its values
    const filters = [];
    const filtersValues = [];

    if (query.hasOwnProperty("name")) {
      const queryPortion = `name ILIKE $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push("%" + query["name"] + "%");
    }
    if (query.hasOwnProperty("minEmployees")) {
      const queryPortion = `num_employees >= $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push(query["minEmployees"]);
    }
    if (query.hasOwnProperty("maxEmployees")) {
      const queryPortion = `num_employees <= $${filters.length + 1}`;
      filters.push(queryPortion);
      filtersValues.push(query["maxEmployees"]);
    }

    // Join SQL clauses with "AND" if there are more than one
    const filtersQuery =
      filters.length > 1 ? filters.join(" AND ") : filters[0];

    const sqlQuery = `
        SELECT *
        FROM companies
        WHERE ${filtersQuery}
        ORDER BY name
      `;

    const companiesRes = await db.query(sqlQuery, filtersValues);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await selectQuery("companies", ["handle"], [handle]);

    const company = companyRes.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const job = await selectQuery("jobs", ["company_handle"], [handle]);

    company.jobs = job.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies
                      SET ${setCols}
                      WHERE handle = ${handleVarIdx}
                      RETURNING handle,
                                name,
                                description,
                                num_employees AS "numEmployees",
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
