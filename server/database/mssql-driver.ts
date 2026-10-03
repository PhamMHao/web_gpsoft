import type { SqlDriver } from './driver.js';

/**
 * Microsoft SQL Server (MSSQL) driver.
 *
 * Authentication modes (`MSSQL_AUTH`, or the `auth` config option):
 *  - `windows` (default when no login is configured): Windows Integrated
 *    Authentication over ODBC via the `msnodesqlv8` driver, using the Windows
 *    account that runs the Node process. No password is stored.
 *  - `sql`: SQL Server login (username + password) over TDS via `tedious`.
 *  - `ntlm`: a Windows account given explicitly (domain + user + password).
 *
 * Dialect differences from SQLite/MySQL absorbed here:
 *  - No `CREATE TABLE IF NOT EXISTS` -> the schema layer calls `tableExists()`.
 *  - `?` placeholders are not supported -> `toNamedParams()` rewrites them into
 *    `@p0, @p1, ...` so `SchemaStore` can stay dialect independent.
 *  - `KEY` is a reserved word in T-SQL -> `quoteIdent()` returns `[key]`.
 *  - `DATETIME2` rejects the ISO-8601 `...Z` suffix -> timestamps are converted
 *    to JS `Date` objects before binding.
 *  - Unicode matters for Vietnamese content -> strings bind as `NVARCHAR(MAX)`.
 */

export type MssqlAuthMode = 'windows' | 'sql' | 'ntlm';

interface MssqlRequest {
  input(name: string, type: unknown, value?: unknown): MssqlRequest;
  query(sql: string): Promise<{ rows?: unknown[]; recordset?: unknown[] }>;
  /** Not implemented by every driver (msnodesqlv8 does not expose it). */
  batch?(sql: string): Promise<unknown>;
}

interface MssqlTransaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  request(): MssqlRequest;
}

interface MssqlPool {
  connect(): Promise<unknown>;
  request(): MssqlRequest;
  transaction(): MssqlTransaction;
  close(): Promise<void>;
}

interface MssqlRuntime {
  ConnectionPool: new (config: Record<string, unknown>) => MssqlPool;
  MAX: number;
  NVarChar: (length?: number) => unknown;
  DateTime2: unknown;
  Bit: unknown;
  Float: unknown;
}

export interface MssqlConfig {
  server?: string;
  port?: number;
  user?: string;
  password?: string;
  domain?: string;
  database?: string;
  instanceName?: string;
  auth?: MssqlAuthMode;
  odbcDriver?: string;
  tdsVersion?: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectionLimit?: number;
}

// ODBC driver used by the Windows-auth path. Override with MSSQL_ODBC_DRIVER,
// e.g. "ODBC Driver 18 for SQL Server" or "SQL Server Native Client 11.0".
const DEFAULT_ODBC_DRIVER = 'ODBC Driver 17 for SQL Server';
const TRUTHY = /^(1|true|yes|on)$/i;

interface OdbcConnectionOptions {
  server: string;
  port: number;
  instanceName?: string;
  database: string;
  driver: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

/**
 * Builds an ODBC connection string for Windows Integrated Authentication.
 * Values are braced only when they contain a separator, except the driver name
 * which always needs braces. `Trusted_Connection` only accepts yes/no on ODBC
 * Driver 17 (true/false raises "Invalid value specified for ... attribute").
 */
function buildOdbcConnectionString(opts: OdbcConnectionOptions): string {
  const braceAlways = (value: string) => `{${value.replace(/\}/g, '}}')}}`;
  const braceIfNeeded = (value: string) => (/[;{}]/.test(value) ? braceAlways(value) : value);
  const serverLine = opts.instanceName
    ? `${opts.server}\\${opts.instanceName}`
    : `${opts.server},${opts.port}`;

  const pairs = [
    `Driver=${braceAlways(opts.driver)}`,
    `Server=${braceIfNeeded(serverLine)}`,
    `Database=${braceIfNeeded(opts.database)}`,
    `Encrypt=${opts.encrypt ? 'yes' : 'no'}`
  ];
  if (opts.encrypt) {
    pairs.push(`TrustServerCertificate=${opts.trustServerCertificate ? 'yes' : 'no'}`);
  }
  pairs.push('Trusted_Connection=yes');
  return `${pairs.join(';')};`;
}

export class MssqlDriver implements SqlDriver {
  public readonly name = 'mssql';
  public readonly types = {
    id: 'NVARCHAR(191)',
    text: 'NVARCHAR(MAX)',
    int: 'INT',
    decimal: 'DECIMAL(18,2)',
    bool: 'BIT',
    datetime: 'DATETIME2'
  } as const;

  private runtime!: MssqlRuntime;
  private pool!: MssqlPool;
  private txTransaction: MssqlTransaction | null = null;
  private authMode: MssqlAuthMode = 'sql';

  constructor(private config: MssqlConfig) {}

  static async create(config: MssqlConfig = {}): Promise<MssqlDriver> {
    const driver = new MssqlDriver(config);
    await driver.connect();
    return driver;
  }

  /** Authentication mode actually used for the current connection. */
  get auth(): MssqlAuthMode {
    return this.authMode;
  }

  private resolveAuthMode(): MssqlAuthMode {
    const explicit = (this.config.auth || process.env.MSSQL_AUTH || '').toLowerCase();
    if (explicit === 'windows' || explicit === 'integrated' || explicit === 'sspi') return 'windows';
    if (explicit === 'ntlm') return 'ntlm';
    if (explicit === 'sql' || explicit === 'server') return 'sql';
    if (explicit) {
      throw new Error(`[DB] Unknown MSSQL_AUTH "${explicit}". Use "windows", "sql" or "ntlm".`);
    }

    const trusted = process.env.MSSQL_TRUSTED_CONNECTION || process.env.MSSQL_TRUSTED;
    if (trusted && TRUTHY.test(trusted)) return 'windows';

    // No login configured -> use the Windows account running the app.
    const user = this.config.user || process.env.MSSQL_USER;
    const password = this.config.password ?? process.env.MSSQL_PASSWORD;
    return user || password ? 'sql' : 'windows';
  }

  private buildPoolConfig(): {
    config: Record<string, unknown>;
    server: string;
    database: string;
    target: string;
  } {
    const server =
      this.config.server || process.env.MSSQL_SERVER || process.env.MSSQL_HOST || '127.0.0.1';
    const database = this.config.database || process.env.MSSQL_DATABASE || 'gpsoft';
    const instanceName =
      this.config.instanceName || process.env.MSSQL_INSTANCE || process.env.MSSQL_INSTANCE_NAME;
    const port = this.config.port || Number(process.env.MSSQL_PORT) || 1433;
    const encryptEnv = process.env.MSSQL_ENCRYPT;
    const trustCertEnv = process.env.MSSQL_TRUST_SERVER_CERTIFICATE;
    const encrypt = this.config.encrypt ?? (encryptEnv ? TRUTHY.test(encryptEnv) : false);
    const trustServerCertificate =
      this.config.trustServerCertificate ?? (trustCertEnv ? TRUTHY.test(trustCertEnv) : true);
    const pool = { max: this.config.connectionLimit ?? 10, min: 0, idleTimeoutMillis: 30000 };

    if (this.authMode === 'windows') {
      // mssql's own connection-string builder emits `Driver=ODBC Driver 17 for
      // SQL Server` without the braces ODBC requires ("Invalid value specified
      // for connection string attribute"), so the string is built here instead.
      const odbcDriver =
        this.config.odbcDriver || process.env.MSSQL_ODBC_DRIVER || DEFAULT_ODBC_DRIVER;
      const connectionString =
        process.env.MSSQL_ODBC_CONNECTION_STRING ||
        buildOdbcConnectionString({
          server,
          port,
          instanceName,
          database,
          driver: odbcDriver,
          encrypt,
          trustServerCertificate
        });
      return {
        server,
        database,
        target: `Windows integrated auth over ${odbcDriver}`,
        config: { server, database, connectionString, options: { useUTC: true }, pool }
      };
    }

    const tdsVersion = this.config.tdsVersion || process.env.MSSQL_TDS_VERSION;
    const user = this.config.user || process.env.MSSQL_USER;
    const password = this.config.password ?? process.env.MSSQL_PASSWORD ?? '';
    if (!user) {
      throw new Error('[DB] MSSQL_AUTH="sql"/"ntlm" requires MSSQL_USER (and MSSQL_PASSWORD).');
    }

    let authentication: Record<string, unknown> | undefined;
    if (this.authMode === 'ntlm') {
      // Accepts "DOMAIN\\user" in MSSQL_USER, or a separate MSSQL_DOMAIN.
      const rawUser = String(user);
      const explicitDomain = this.config.domain || process.env.MSSQL_DOMAIN;
      const [domainFromUser, userFromUser] = rawUser.includes('\\')
        ? rawUser.split('\\', 2)
        : [undefined, rawUser];
      authentication = {
        type: 'ntlm',
        options: {
          domain: explicitDomain || domainFromUser || '',
          userName: userFromUser,
          password
        }
      };
    }

    return {
      server,
      database,
      target: `${this.authMode} auth as ${user}`,
      config: {
        server,
        // A named instance resolves its own TCP port through SQL Browser.
        port: instanceName ? undefined : port,
        database,
        user,
        password,
        authentication,
        options: { instanceName, encrypt, trustServerCertificate, tdsVersion, useUTC: true },
        pool
      }
    };
  }

  private async connect(): Promise<void> {
    this.authMode = this.resolveAuthMode();
    const useOdbc = this.authMode === 'windows';
    // Declared as `string` so TypeScript does not try to resolve the module at
    // build time - the driver only has to exist when this mode is used.
    const moduleName: string = useOdbc ? 'mssql/msnodesqlv8' : 'mssql';

    let runtime: unknown;
    try {
      runtime = await import(moduleName);
    } catch (err) {
      const cause = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      throw new Error(
        `[DB] Cannot load "${moduleName}" (required for MSSQL_AUTH="${this.authMode}"). ` +
          `Install it with: npm install mssql${useOdbc ? ' msnodesqlv8' : ''}\n` +
          `[DB] Underlying error: ${cause}`
      );
    }

    const loaded = runtime as { default?: MssqlRuntime } & Partial<MssqlRuntime>;
    this.runtime = (loaded.default ?? loaded) as MssqlRuntime;

    const { config, server, database, target } = this.buildPoolConfig();
    this.pool = new this.runtime.ConnectionPool(config);

    try {
      // mssql requires an explicit connect(): without it every request fails
      // with "Connection is closed." (ECONNCLOSED) because pool.connected stays
      // false. This applies to both the tedious and the msnodesqlv8 drivers.
      await this.pool.connect();
      // Fail fast at boot instead of on the first request.
      await this.pool.request().query('SELECT 1 AS ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await this.pool.close();
      } catch {
        /* the pool never opened */
      }
      throw new Error(
        `[DB] Cannot connect to SQL Server (server=${server}, database=${database}, ${target}).\n` +
          (useOdbc
            ? '[DB] Windows auth goes through an ODBC driver: install "ODBC Driver 17/18 for SQL Server" or point MSSQL_ODBC_DRIVER at a driver that exists.\n'
            : '') +
          `[DB] Underlying error: ${message}`
      );
    }

    console.log(`[DB] Connected to SQL Server "${server}" database "${database}" (${target}).`);
  }

  async exec(sql: string): Promise<void> {
    const request = this.createRequest();
    // `batch()` is not implemented by every mssql driver, so fall back to
    // `query()` (our DDL is a single CREATE TABLE statement).
    if (typeof request.batch === 'function') await request.batch(sql);
    else await request.query(sql);
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const request = this.bindParams(this.createRequest(), sql, params);
    const result = await request.query(this.toNamedParams(sql));
    // The tedious driver exposes `rows`, the msnodesqlv8 driver only exposes
    // `recordset` (its `rows` is undefined), so both are checked.
    return (result.recordset ?? result.rows ?? []) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const request = this.bindParams(this.createRequest(), sql, params);
    await request.query(this.toNamedParams(sql));
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Reuse the ambient transaction when called re-entrantly.
    if (this.txTransaction) return fn();

    const transaction = this.pool.transaction();
    await transaction.begin();
    this.txTransaction = transaction;
    try {
      const result = await fn();
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      this.txTransaction = null;
    }
  }

  async tableExists(table: string): Promise<boolean> {
    // SCHEMA_NAME() resolves the caller's default schema, which is the same
    // schema bare table names use in the DDL statements.
    const rows = await this.all<{ c: number | string }>(
      'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_NAME = ?',
      [table]
    );
    return Number(rows[0]?.c ?? 0) > 0;
  }

  async listColumns(table: string): Promise<string[]> {
    const rows = await this.all<{ column_name: string }>(
      'SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_NAME = ?',
      [table]
    );
    return rows.map((row) => String(row.column_name ?? ''));
  }

  quoteIdent(name: string): string {
    return `[${name.replace(/]/g, ']]')}]`;
  }

  async close(): Promise<void> {
    await this.pool.close();
  }

  private createRequest(): MssqlRequest {
    return (this.txTransaction ?? this.pool).request();
  }

  /**
   * Prefix for generated parameter names. It must NOT collide with the
   * `@P1..@Pn` names ODBC Driver 17/18 creates for `?` placeholders: T-SQL
   * identifiers are case-insensitive, so the old `@p1` clashed with `@P1`
   * ("The variable name '@p1' has already been declared").
   */
  private static readonly PARAM_PREFIX = 'gpsoft_';

  /** Rewrites `?` placeholders into the `@name` form required by SQL Server. */
  private toNamedParams(sql: string): string {
    let index = 0;
    let out = '';
    let insideLiteral = false;
    for (const char of sql) {
      if (char === "'") insideLiteral = !insideLiteral;
      if (char === '?' && !insideLiteral) {
        out += `@${MssqlDriver.PARAM_PREFIX}${index}`;
        index += 1;
        continue;
      }
      out += char;
    }
    return out;
  }

  private bindParams(request: MssqlRequest, sql: string, params: unknown[]): MssqlRequest {
    if (!params.length) return request;
    const placeholderCount =
      this.toNamedParams(sql).match(new RegExp(`@${MssqlDriver.PARAM_PREFIX}\\d+`, 'g'))?.length ?? 0;
    if (placeholderCount !== params.length) {
      throw new Error(
        `[DB] SQL Server driver received ${params.length} parameter(s) for ${placeholderCount} placeholder(s).`
      );
    }
    params.forEach((value, index) => {
      const name = `${MssqlDriver.PARAM_PREFIX}${index}`;
      // `SchemaStore` already converts each column to its SQL type: datetime
      // columns arrive as Date objects, booleans as 0/1 and everything else as
      // string. Binding explicitly avoids unicode loss and NULL inference errors.
      if (value instanceof Date) {
        request.input(name, this.runtime.DateTime2, value);
      } else if (value === null || value === undefined) {
        request.input(name, this.runtime.NVarChar(this.runtime.MAX), null);
      } else if (typeof value === 'boolean') {
        request.input(name, this.runtime.Bit, value);
      } else if (typeof value === 'number') {
        request.input(name, this.runtime.Float, value);
      } else {
        request.input(name, this.runtime.NVarChar(this.runtime.MAX), String(value));
      }
    });
    return request;
  }
}

