import { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { RequestHandlerParams } from 'express-serve-static-core';
import Knex from 'knex';

const checkKnex = (knex: Knex): void => {
  if (typeof knex !== 'function' || typeof knex.transaction !== 'function') {
    throw new TypeError(`Parameter "knex" must be an instance of Knex.Client. Received ${typeof knex}`);
  }
};

const checkLocals = (res: Response): void => {
  if (!res.locals.trx || typeof res.locals.trx.commit !== 'function' || typeof res.locals.trx.rollback !== 'function') {
    throw new Error(
      'res.locals.trx is not of type Knex.Transaction. Ensure that the `knexTrxBegin()` middleware ran successfully',
    );
  }
};

const checkMiddlewares = (middlewares: RequestHandlerParams): void => {
  const isValidMiddleware = middlewares && (!Array.isArray(middlewares) && typeof middlewares === 'function');
  const isValidMiddlewaresArray =
    Array.isArray(middlewares) &&
    middlewares &&
    middlewares.length > 0 &&
    middlewares.reduce((acc, curr): boolean => acc && typeof curr === 'function', true);

  if (!isValidMiddleware && !isValidMiddlewaresArray) {
    throw new TypeError(
      `Parameter "middlewares" must be of type function or function[]. Received ${typeof middlewares}`,
    );
  }
};

export const knexTrxBegin = (knex: Knex): RequestHandler => {
  checkKnex(knex);
  return async (req, res, next): Promise<void> => {
    res.locals.trx = await knex.transaction();
    next();
  };
};

export const knexTrxCommit: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    checkLocals(res);
    await res.locals.trx.commit();
    next();
  } catch (err) {
    next(err);
  }
};

export const knexTrxErrorHandler: ErrorRequestHandler = async (err, req, res, next): Promise<void> => {
  try {
    checkLocals(res);
    await res.locals.trx.rollback();
  } catch (rollbackErr) {
    // Keep original error, as that's probably the more important error.
    err.message = `An error occurred while trying to perform a knex trx rollback due to a previous error: ${err.message}`;
    next(err);
  }
  next(err);
};

export const withKnexTrx = (
  knex: Knex,
  middlewares: RequestHandlerParams,
): (RequestHandler | ErrorRequestHandler)[] => {
  checkKnex(knex);
  checkMiddlewares(middlewares);

  const middlewaresArray = Array.isArray(middlewares) ? middlewares : [middlewares];
  return [knexTrxBegin(knex), ...middlewaresArray, knexTrxCommit, knexTrxErrorHandler];
};
