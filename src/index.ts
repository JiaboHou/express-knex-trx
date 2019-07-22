import { ErrorRequestHandler, RequestHandler } from 'express';
import { RequestHandlerParams } from 'express-serve-static-core';
import Knex from 'knex';

export const knexTrxBegin = (knex: Knex): RequestHandler => {
  if (typeof knex !== 'function' || typeof knex.transaction !== 'function') {
    throw new TypeError('Parameter "knex" must be an instance of Knex.Client. Got ' + typeof knex);
  }

  return (req, res, next): void => {
    knex.transaction((trx): void => {
      res.locals.trx = trx;
      next();
    });
  };
};

export const knexTrxCommit: RequestHandler = async (req, res, next): Promise<void> => {
  if (res.locals.trx && typeof res.locals.trx.commit === 'function') {
    try {
      await res.locals.trx.commit();
    } catch (err) {
      next(err);
      return;
    }
  }
  next();
};

export const knexTrxErrorHandler: ErrorRequestHandler = async (err, req, res, next): Promise<void> => {
  if (res.locals.trx && typeof res.locals.trx.rollback === 'function') {
    try {
      await res.locals.trx.rollback();
    } catch (err) {
      next(err);
      return;
    }
  }
  next(err);
};

export const withKnexTrx = (knex: Knex, middlewares: RequestHandlerParams): RequestHandlerParams => {
  let middlewaresArray = middlewares;
  if (!Array.isArray(middlewaresArray)) {
    middlewaresArray = [middlewaresArray];
  }

  return [knexTrxBegin(knex), ...middlewaresArray, knexTrxCommit, knexTrxErrorHandler];
};
