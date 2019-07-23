![Build Status](https://img.shields.io/travis/com/JiaboHou/express-knex-trx.svg)
![Coveralls github branch](https://img.shields.io/coveralls/github/JiaboHou/express-knex-trx/master.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/JiaboHou/express-knex-trx.svg)

# express-knex-trx
Wrap express middlewares with in a knex transaction!


## Usage

```javascript
// my-request-handler.js

import { withKnexTrx } from 'express-knex-trx';
import knexInstance from './path/to/your/knex-config';

const createDriver = async (req, res, next) => {
  try {
    // Access the transaction object with `res.locals.trx`.
    const driverId = await knex('drivers')
      .transacting(res.locals.trx)
      .insert({ name: 'Joe' });

    const carId = await knex('cars')
      .transacting(res.locals.trx)
      .insert({
        driver_id: driverId,
        year: 2020,
      });
  } catch (e) {
    next(e); // Handled by express-knex-trx. Transaction will be rolled back and error passed on to the next handler.
  }
  
  // Any unhandled errors here will also cause the transaction to be rolled back.

  next(); // Since the commit handler comes after, make sure you do not send the response in this handler.
};

export default [withKnexTrx(knexInstance, handler), sendResponseHandler];
```
