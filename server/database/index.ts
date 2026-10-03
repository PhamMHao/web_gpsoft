import path from 'path';
import type { SqlDriver } from './driver.js';
import { SqliteDriver } from './sqlite-driver.js';
import { SchemaStore } from './store.js';

export function resolveSqliteFile(): string {
  if (process.env.SQLITE_FILE) return path.resolve(process.env.SQLITE_FILE);
  return path.resolve(process.cwd(), 'data', 'gpsoft.sqlite');
}

async function createDriver(): Promise<SqlDriver> {
  const provider = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
  if (provider === 'mysql') {
    try {
      const { MySqlDriver } = await import('./mysql-driver.js');
      return await MySqlDriver.create({});
    } catch (err) {
      console.warn('[DB] Không thể kết nối MySQL, chuyển sang SQLite fallback:', (err as Error).message);
      return new SqliteDriver(resolveSqliteFile());
    }
  }
  if (provider === 'mssql' || provider === 'sqlserver' || provider === 'sql-server') {
    try {
      const { MssqlDriver } = await import('./mssql-driver.js');
      return await MssqlDriver.create({});
    } catch (err) {
      console.warn('[DB] Không thể kết nối SQL Server, chuyển sang SQLite fallback:', (err as Error).message);
      return new SqliteDriver(resolveSqliteFile());
    }
  }
  return new SqliteDriver(resolveSqliteFile());
}

let storePromise: Promise<SchemaStore> | null = null;

export function getStore(): Promise<SchemaStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const driver = await createDriver();
      const store = new SchemaStore(driver);
      await store.ensureSchema();
      return store;
    })();
  }
  return storePromise;
}

export type { SqlDriver } from './driver.js';
export { SchemaStore } from './store.js';
