import knex, { Knex } from 'knex';
import config from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const connectionConfig = (config as any)[environment] || (config as any).development;

let db: Knex;

declare global {
  // eslint-disable-next-line no-var
  var __db__: Knex | undefined;
}

if (!global.__db__) {
  global.__db__ = knex(connectionConfig);
}
db = global.__db__;

export default db;
