import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import type { SqlDriver } from './driver.js';

export class SqliteDriver implements SqlDriver {
  public readonly name = 'sqlite';
  public readonly types = {
    id: 'TEXT',
    text: 'TEXT',
    int: 'INTEGER',
    decimal: 'REAL',
    bool: 'INTEGER',
    datetime: 'TEXT'
  } as const;
  private db: DatabaseSync;
  private txDepth = 0;

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(this.bindable(params) as never[])) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const stmt = this.db.prepare(sql);
    stmt.run(...(this.bindable(params) as never[]));
  }

  /** node:sqlite only accepts null/number/bigint/string/buffer parameters. */
  private bindable(params: unknown[]): unknown[] {
    return params.map((value) => (value instanceof Date ? value.toISOString() : value));
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.txDepth += 1;
    this.db.exec('BEGIN');
    try {
      const result = await fn();
      this.txDepth -= 1;
      if (this.txDepth === 0) this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.txDepth -= 1;
      if (this.txDepth === 0) this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async tableExists(table: string): Promise<boolean> {
    const rows = await this.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [table]
    );
    return rows.length > 0;
  }

  async listColumns(table: string): Promise<string[]> {
    const rows = await this.all<{ name: string }>(`PRAGMA table_info(${table})`);
    return rows.map((row) => String(row.name));
  }

  quoteIdent(name: string): string {
    return name;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
