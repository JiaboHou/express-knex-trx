const knex = require('knex');
const mockKnex = require('mock-knex');

const ekt = require('../src');

describe('src/index', () => {
  describe('knexTrxBegin', () => {
    describe('when given invalid parameters', () => {
      it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 4],
        ['a string', 'hello'],
        ['a boolean', true],
        ['an array', []],
        ['an object', {}],
        ['a function without a "transaction" member', () => {}],
      ])('throws a TypeError when parameter is %s', (label, testParam) => {
        expect(() => ekt.knexTrxBegin(testParam)).toThrow(TypeError);
      });
    });

    describe('when given valid paramters', () => {
      const req = {};
      const res = { locals: {} };
      const next = jest.fn();
      let beginTrxMiddleware;

      beforeEach(() => {
        const knexClient = knex({ client: 'pg' });
        mockKnex.mock(knexClient);
        beginTrxMiddleware = ekt.knexTrxBegin(knexClient);

        next.mockReset();
      });

      it('returns a function', () => {
        expect(beginTrxMiddleware).toBeInstanceOf(Function);
      });

      it('adds the transaction to res.locals', async () => {
        next.mockImplementation(() => {
          expect(res.locals).toHaveProperty('trx');
        });
        await beginTrxMiddleware(req, res, next);
      });

      it('proceeds to the next middleware', async () => {
        await beginTrxMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('knexTrxCommit', () => {
    describe('when trx is not an instance of Knex.Transaction', () => {
      const req = {};
      const next = jest.fn();

      beforeEach(() => {
        next.mockReset();
      });

      it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 4],
        ['a string', 'hello'],
        ['a boolean', true],
        ['an array', []],
        ['an object', {}],
        ['a function without a "commit" member', () => {}],
      ])('throws an Error when res.locals.trx is %s', async (label, testParam) => {
        await ekt.knexTrxCommit(req, { locals: { trx: testParam } }, next);
        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      });
    });

    describe('successful commit', () => {
      const req = {};
      const res = {
        locals: {
          trx: {
            commit: jest.fn(),
            rollback: jest.fn(),
          },
        },
      };
      const next = jest.fn();

      beforeEach(() => {
        ekt.knexTrxCommit(req, res, next);
      });

      it('attempts to commits the transaction', () => {
        expect(res.locals.trx.commit).toHaveBeenCalled();
      });

      it('proceeds to the next middleware', () => {
        expect(next).toHaveBeenCalled();
      });

      it('does not pass an error to the next middleware', () => {
        expect(next.mock.calls[0][0]).not.toBeDefined();
      });
    });

    describe('failed commit', () => {
      const testErrorMessage = 'test error';
      const req = {};
      const res = {
        locals: {
          trx: {
            commit: jest.fn(() => {
              throw new Error(testErrorMessage);
            }),
            rollback: jest.fn(),
          },
        },
      };
      const next = jest.fn();

      beforeEach(() => {
        ekt.knexTrxCommit(req, res, next);
      });
      it('attempts to commits the transaction', () => {
        expect(res.locals.trx.commit).toHaveBeenCalled();
      });

      it('proceeds to the next middleware', () => {
        expect(next).toHaveBeenCalled();
      });

      it('passes an error to the next middleware', () => {
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      });

      it('passes the expected error message to the next middleware', () => {
        expect(next.mock.calls[0][0].message).toEqual(testErrorMessage);
      });
    });
  });

  describe('knexTrxErrorHandler', () => {
    describe('when trx is not an instance of Knex.Transaction', () => {
      const req = {};
      const next = jest.fn();

      beforeEach(() => {
        next.mockReset();
      });

      it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 4],
        ['a string', 'hello'],
        ['a boolean', true],
        ['an array', []],
        ['an object', {}],
        ['a function without a "rollback" member', () => {}],
      ])('throws an Error when res.locals.trx is %s', async (label, testParam) => {
        await ekt.knexTrxErrorHandler(new Error(), req, { locals: { trx: testParam } }, next);
        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(next.mock.calls[0][0]).toMatchSnapshot();
      });
    });

    describe('successful rollback', () => {
      const testErrorMessage = 'test error';
      const req = {};
      const res = {
        locals: {
          trx: {
            commit: jest.fn(),
            rollback: jest.fn(),
          },
        },
      };
      const next = jest.fn();

      beforeEach(() => {
        ekt.knexTrxErrorHandler(new Error(testErrorMessage), req, res, next);
      });

      it('attempts to rollback the transaction', () => {
        expect(res.locals.trx.rollback).toHaveBeenCalled();
      });

      it('proceeds to the next middleware', () => {
        expect(next).toHaveBeenCalled();
      });

      it('passes an error to the next middleware', () => {
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      });

      it('passes the expected error message to the next middleware', () => {
        expect(next.mock.calls[0][0].message).toEqual(testErrorMessage);
      });
    });

    describe('failed rollback', () => {
      const testErrorMessage = 'test error';
      const req = {};
      const res = {
        locals: {
          trx: {
            commit: jest.fn(),
            rollback: jest.fn(() => {
              throw new Error();
            }),
          },
        },
      };
      const next = jest.fn();

      beforeEach(() => {
        ekt.knexTrxErrorHandler(new Error(testErrorMessage), req, res, next);
      });

      it('attempts to rollback the transaction', () => {
        expect(res.locals.trx.rollback).toHaveBeenCalled();
      });

      it('proceeds to the next middleware', () => {
        expect(next).toHaveBeenCalled();
      });

      it('passes an error to the next middleware', () => {
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      });

      it('passes the expected error message to the next middleware', () => {
        expect(next.mock.calls[0][0].message).toMatchSnapshot();
      });
    });
  });

  describe('withKnexTrx', () => {
    let knexClient;

    beforeAll(() => {
      knexClient = knex({ client: 'pg' });
      mockKnex.mock(knexClient);
    });

    describe('when given invalid parameters', () => {
      it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 4],
        ['a string', 'hello'],
        ['a boolean', true],
        ['an array', []],
        ['an object', {}],
        ['a function without a "transaction" member', () => {}],
      ])('throws a TypeError when "knex" parameter is %s', (label, testParam) => {
        expect(() => ekt.withKnexTrx(testParam, () => {})).toThrow(TypeError);
      });

      it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 4],
        ['a string', 'hello'],
        ['a boolean', true],
        ['an empty array', []],
        ['an array of functions and primitives', [() => {}, 'a', 3, true]],
        ['an object', {}],
      ])('throws a TypeError when "middlewares" parameter is %s', (label, testParam) => {
        expect(() => ekt.withKnexTrx(knexClient, testParam)).toThrow(TypeError);
      });
    });

    it.each([
      ['1 user-specified middleware', () => {}, 4],
      ['an array of 1 user-specified middleware', [() => {}], 4],
      ['an array of 3 user-specified middlewares', [() => {}, () => {}, () => {}], 6],
    ])('adds 3 middlewares in addition to %s', (label, middlewares, expectedCount) => {
      const middlewaresWithKnexTrx = ekt.withKnexTrx(knexClient, middlewares);
      expect(middlewaresWithKnexTrx.length).toEqual(expectedCount);
    });

    it('maintains ordering of the middlewares', () => {
      const middlewares = [() => {}, () => {}, () => {}];
      const middlewaresWithKnexTrx = ekt.withKnexTrx(knexClient, middlewares);
      expect(middlewaresWithKnexTrx[1]).toBe(middlewares[0]);
      expect(middlewaresWithKnexTrx[2]).toBe(middlewares[1]);
      expect(middlewaresWithKnexTrx[3]).toBe(middlewares[2]);
    });
  });
});
