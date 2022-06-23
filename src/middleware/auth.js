"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError("Not logged in");
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must be an admin.
 *
 * If not, raises Unauthorized.
 */

function ensureAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    console.log("USER", user);
    if (!res.locals.user.isAdmin || !res.locals.user)
      throw new UnauthorizedError("Not an admin");
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when user must be admin and match username in the route param
 *
 *  If not, raises Unauthorized.
 */

function ensureValidUserOrAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    if (!(user && (user.isAdmin || user.username === req.params.username))) {
      throw new UnauthorizedError("Not a valid user or admin");
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureValidUserOrAdmin,
};
