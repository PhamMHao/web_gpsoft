export interface SqlColumnTypes {
  id: string;
  text: string;
  int: string;
  decimal: string;
  bool: string;
  datetime: string;
}

export interface SqlDriver {
  readonly name: string;
  readonly types: SqlColumnTypes;
  exec(sql: string): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
  /**
   * Whether the physical table already exists in the target database.
   * Needed because not every dialect supports `CREATE TABLE IF NOT EXISTS`
   * (SQL Server does not), so the schema layer checks first.
   */
  tableExists(table: string): Promise<boolean>;
  /** Existing column names of a table (used for auto-migration/ALTER TABLE). */
  listColumns(table: string): Promise<string[]>;
  /** Quote an identifier for the dialect (e.g. the reserved column name `key`). */
  quoteIdent(name: string): string;
}

export function createPlaceholderSql(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
