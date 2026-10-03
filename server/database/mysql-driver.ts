import type { SqlDriver } from './driver.js';

interface MySqlPool {
  execute(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
  query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
  getConnection(): Promise<MySqlConnection>;
  end(): Promise<void>;
}

interface MySqlConnection {
  execute(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
  query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface MySqlConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  timezone?: string;
  connectionLimit?: number;
}

export class MySqlDriver implements SqlDriver {
  public readonly name = 'mysql';
  public readonly types = {
    id: 'VARCHAR(191)',
    text: 'LONGTEXT',
    int: 'INT',
    decimal: 'DECIMAL(18,2)',
    bool: 'TINYINT(1)',
    datetime: 'DATETIME'
  } as const;
  private pool!: MySqlPool;
  private txConnection: MySqlConnection | null = null;

  constructor(private config: MySqlConfig) {}

  static async create(config: MySqlConfig): Promise<MySqlDriver> {
    const driver = new MySqlDriver(config);
    await driver.connect();
    return driver;
  }

  private async connect(): Promise<void> {
    const moduleName = 'mysql2/promise';
    let mysql: { createPool: (cfg: MySqlConfig) => MySqlPool };
    try {
      mysql = (await import(moduleName)) as unknown as { createPool: (cfg: MySqlConfig) => MySqlPool };
    } catch {
      throw new Error(
        '[DB] MySQL driver selected but "mysql2" is not installed. Run: npm install mysql2'
      );
    }
    this.pool = mysql.createPool({
      host: this.config.host || process.env.MYSQL_HOST || '127.0.0.1',
      port: this.config.port || Number(process.env.MYSQL_PORT) || 3306,
      user: this.config.user || process.env.MYSQL_USER || 'root',
      password: this.config.password ?? process.env.MYSQL_PASSWORD ?? '',
      database: this.config.database || process.env.MYSQL_DATABASE || 'gpsoft',
      // Store/read DATETIME values as UTC so ISO timestamps round-trip.
      timezone: this.config.timezone || 'Z',
      connectionLimit: this.config.connectionLimit ?? 10
    });
  }

  // DDL is never parameterized, so it must go through `query` (prepared `execute`
  // cannot run every CREATE/ALTER statement on older MySQL/MariaDB servers).
  async exec(sql: string): Promise<void> {
    const executor = this.txConnection || this.pool;
    await executor.query(sql);
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const executor = this.txConnection || this.pool;
    const [rows] = await executor.execute(sql, params);
    return rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const executor = this.txConnection || this.pool;
    await executor.execute(sql, params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.txConnection) return fn();
    const connection = await this.pool.getConnection();
    this.txConnection = connection;
    try {
      await connection.beginTransaction();
      const result = await fn();
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      this.txConnection = null;
      connection.release();
    }
  }

  async tableExists(table: string): Promise<boolean> {
    const rows = await this.all<{ c: number | string }>(
      'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [table]
    );
    return Number(rows[0]?.c ?? 0) > 0;
  }

  async listColumns(table: string): Promise<string[]> {
    const rows = await this.all<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
      [table]
    );
    return rows.map((row) => String(row.column_name ?? ''));
  }

  quoteIdent(name: string): string {
    return `\`${name}\``;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
