import type { SqlDriver } from './driver.js';
import {
  COLLECTIONS,
  SINGLETONS,
  SINGLETON_KEY,
  LEGACY_JSON_COLUMN,
  addColumnSql,
  childDdl,
  collectionDdl,
  columnName,
  schemaKey,
  singletonDdl
} from './schema.js';
import type { ChildDef, ColumnDef, ColumnKind, CollectionDef, DdlDialect, SingletonDef } from './schema.js';
import type { DatabaseSchema } from '../types.js';

export type LoadedSchema = Partial<DatabaseSchema>;
type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Path helpers: entities use camelCase/nested paths, the database uses
 * flat snake_case columns.
 * ------------------------------------------------------------------ */

function getPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Row)[part];
  }
  return current;
}

function parentOf(container: Row, parts: string[]): Row {
  let current: Row = container;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof current[key] !== 'object' || current[key] === null) current[key] = {};
    current = current[key] as Row;
  }
  return current;
}

function setPath(container: Row, path: string, value: unknown): void {
  const parts = path.split('.');
  parentOf(container, parts)[parts[parts.length - 1]] = value;
}

/** Returns (creating it when needed) the container stored at `path`. */
function ensureContainer(container: Row, path: string, asObject: boolean): Row | unknown[] {
  if (!path) return container;
  const parts = path.split('.');
  const parent = parentOf(container, parts);
  const leaf = parts[parts.length - 1];
  const existing = parent[leaf];
  if (Array.isArray(existing) || (existing && typeof existing === 'object')) {
    return existing as Row | unknown[];
  }
  const created: Row | unknown[] = asObject ? {} : [];
  parent[leaf] = created;
  return created;
}

function lowerCaseKeys(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) out[key.toLowerCase()] = value;
  return out;
}

function emptyValue(kind: ColumnKind): unknown {
  switch (kind) {
    case 'bool':
    case 'int':
    case 'decimal':
      return 0;
    case 'datetime':
    case 'id':
      return null;
    default:
      return '';
  }
}

/** Entity value -> SQL parameter (booleans become 0/1 for every driver). */
function toColumnValue(def: ColumnDef, raw: unknown): unknown {
  if (raw === undefined || raw === null) {
    return def.nullable || def.kind === 'id' || def.kind === 'datetime' ? null : emptyValue(def.kind);
  }
  switch (def.kind) {
    case 'bool':
      return raw ? 1 : 0;
    case 'int':
    case 'decimal': {
      const num = Number(raw);
      return Number.isFinite(num) ? (def.kind === 'int' ? Math.trunc(num) : num) : null;
    }
    case 'datetime': {
      const date = new Date(String(raw));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    case 'id':
      return String(raw);
    default:
      return String(raw);
  }
}

/** SQL value -> entity value (undefined drops the key, matching optional fields). */
function fromColumnValue(def: ColumnDef, value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  switch (def.kind) {
    case 'bool':
      return Number(value) !== 0;
    case 'int':
    case 'decimal': {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    }
    case 'datetime': {
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    default:
      return String(value);
  }
}

export class SchemaStore {
  private loaded: LoadedSchema = {};
  private ready = false;
  /** P1.1 — các bảng COLLECTION mà `ensureSchema()` vừa tạo trong lần chạy này. */
  private createdTables = new Set<string>();

  constructor(private driver: SqlDriver) {}

  get driverName(): string {
    return this.driver.name;
  }

  private get dialect(): DdlDialect {
    return { types: this.driver.types, quoteIdent: (name: string) => this.driver.quoteIdent(name) };
  }

  private q(name: string): string {
    return this.driver.quoteIdent(name);
  }

  /* ============================ schema ============================ */

  async ensureSchema(): Promise<void> {
    // Child tables are created first: migrating a legacy parent JSON column
    // immediately writes into them.
    for (const def of COLLECTIONS) {
      for (const child of def.children) await this.ensureChild(child);
    }
    for (const def of SINGLETONS) {
      for (const child of def.children) await this.ensureChild(child);
    }
    for (const def of COLLECTIONS) await this.ensureCollection(def);
    for (const def of SINGLETONS) await this.ensureSingleton(def);
  }

  private async ensureCollection(def: CollectionDef): Promise<void> {
    if (!(await this.driver.tableExists(def.table))) {
      await this.createTable(def.table, collectionDdl(def, this.dialect));
      // P1.1 — nhớ lại để `db.init()` seed dữ liệu mẫu cho entity vừa được thêm vào app.
      this.createdTables.add(def.table);
      return;
    }
    const columns = await this.driver.listColumns(def.table);
    if (columns.some((name) => name.toLowerCase() === LEGACY_JSON_COLUMN)) {
      await this.migrateLegacy(def.table, async (items) => {
        await this.driver.exec(collectionDdl(def, this.dialect));
        if (items.length) await this.writeCollection(def, items);
      });
      return;
    }
    await this.addMissingColumns(def.table, def.columns, columns);
    await this.addMissingColumns(
      def.table,
      [{ field: def.orderColumn, kind: 'int' }],
      await this.driver.listColumns(def.table)
    );
  }

  private async ensureChild(child: ChildDef): Promise<void> {
    if (!(await this.driver.tableExists(child.table))) {
      await this.createTable(child.table, childDdl(child, this.dialect));
      return;
    }
    await this.addMissingColumns(child.table, child.columns, await this.driver.listColumns(child.table));
  }

  private async ensureSingleton(def: SingletonDef): Promise<void> {
    if (!(await this.driver.tableExists(def.table))) {
      await this.createTable(def.table, singletonDdl(def, this.dialect));
      return;
    }
    const columns = await this.driver.listColumns(def.table);
    if (columns.some((name) => name.toLowerCase() === LEGACY_JSON_COLUMN)) {
      await this.migrateLegacySingleton(def);
      return;
    }
    await this.addMissingColumns(def.table, def.columns, columns);
  }

  private async createTable(table: string, ddl: string): Promise<void> {
    try {
      await this.driver.exec(ddl);
    } catch (err) {
      // Another process may have created the table in the meantime.
      if (!(await this.driver.tableExists(table))) throw err;
    }
  }

  private async addMissingColumns(
    table: string,
    columns: ColumnDef[],
    existing: string[]
  ): Promise<void> {
    const present = new Set(existing.map((name) => name.toLowerCase()));
    for (const def of columns) {
      const name = columnName(def);
      if (present.has(name.toLowerCase())) continue;
      await this.driver.exec(addColumnSql(table, def, this.dialect));
      console.log(`[DB] ${table}: added missing column ${name}.`);
    }
  }

  /** Replaces a legacy `data` JSON column with real columns, keeping the rows. */
  private async migrateLegacy(table: string, write: (items: Row[]) => Promise<void>): Promise<void> {
    const rows = await this.driver.all<Row>(
      `SELECT ${this.q('id')}, ${this.q(LEGACY_JSON_COLUMN)} FROM ${this.q(table)}`
    );
    const items: Row[] = [];
    for (const row of rows) {
      const raw = lowerCaseKeys(row)[LEGACY_JSON_COLUMN];
      try {
        const parsed = JSON.parse(String(raw)) as Row;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) items.push(parsed);
      } catch {
        /* ignore unreadable rows */
      }
    }
    console.log(
      `[DB] Migration: ${table} (${items.length} JSON row(s)) -> normalized columns. This runs once.`
    );
    await this.driver.exec(`DROP TABLE ${this.q(table)}`);
    await write(items);
  }

  private async migrateLegacySingleton(def: SingletonDef): Promise<void> {
    const rows = await this.driver.all<Row>(
      `SELECT ${this.q(LEGACY_JSON_COLUMN)} FROM ${this.q(def.table)} WHERE ${this.q(def.keyColumn)} = ?`,
      [SINGLETON_KEY]
    );
    let parsed: Row | undefined;
    if (rows[0]) {
      try {
        parsed = JSON.parse(String(lowerCaseKeys(rows[0])[LEGACY_JSON_COLUMN])) as Row;
      } catch {
        parsed = undefined;
      }
    }
    console.log(`[DB] Migration: ${def.table} -> normalized columns. This runs once.`);
    await this.driver.exec(`DROP TABLE ${this.q(def.table)}`);
    await this.driver.exec(singletonDdl(def, this.dialect));
    if (parsed) await this.writeSingleton(def, parsed);
  }

  /* ============================= load ============================= */

  async load(): Promise<LoadedSchema> {
    const result: LoadedSchema = {};
    for (const def of COLLECTIONS) {
      (result as Record<string, unknown>)[schemaKey(def.table)] = await this.readCollection(def);
    }
    for (const def of SINGLETONS) {
      const value = await this.readSingleton(def);
      if (value) (result as Record<string, unknown>)[schemaKey(def.table)] = value;
    }
    this.loaded = result;
    this.ready = true;
    return result;
  }

  private async readCollection(def: CollectionDef): Promise<Row[]> {
    const rows = await this.driver.all<Row>(
      `SELECT * FROM ${this.q(def.table)} ORDER BY ${this.q(def.orderColumn)}`
    );
    const entities: Row[] = rows.map((row) => this.mapColumns(row, def.columns));
    const byId = new Map<string, Row>();
    for (const entity of entities) byId.set(String(entity[def.idColumn]), entity);
    await this.readChildren(def.children, [...byId.keys()], byId);
    return entities;
  }

  private async readSingleton(def: SingletonDef): Promise<Row | undefined> {
    const rows = await this.driver.all<Row>(
      `SELECT * FROM ${this.q(def.table)} WHERE ${this.q(def.keyColumn)} = ?`,
      [SINGLETON_KEY]
    );
    if (!rows[0]) return undefined;
    const entity = this.mapColumns(rows[0], def.columns);
    await this.readChildren(def.children, [SINGLETON_KEY], new Map([[SINGLETON_KEY, entity]]));
    return entity;
  }

  private mapColumns(row: Row, columns: ColumnDef[]): Row {
    const lower = lowerCaseKeys(row);
    const entity: Row = {};
    for (const def of columns) {
      const value = fromColumnValue(def, lower[columnName(def).toLowerCase()]);
      if (value !== undefined) setPath(entity, def.field, value);
    }
    return entity;
  }

  /** Loads every child table of a collection and attaches the rows to entities. */
  private async readChildren(
    children: ChildDef[],
    ownerValues: string[],
    entities: Map<string, Row>
  ): Promise<void> {
    for (const child of children) {
      const order = child.indexColumns.map((name) => this.q(name)).join(', ');
      const rows = await this.driver.all<Row>(`SELECT * FROM ${this.q(child.table)} ORDER BY ${order}`);
      for (const row of rows) {
        const lower = lowerCaseKeys(row);
        const ownerValue = String(lower[child.ownerColumn.toLowerCase()] ?? '');
        const entity = entities.get(ownerValue);
        if (!entity) continue;
        const target = this.childTarget(entity, child, lower);
        if (target) this.assignChildValue(target, child, lower);
      }
      if (!child.alwaysInclude) continue;
      for (const ownerValue of ownerValues) {
        const entity = entities.get(ownerValue);
        if (!entity) continue;
        if (!child.itemsField) {
          ensureContainer(entity, child.path, child.shape === 'object');
          continue;
        }
        const parents = getPath(entity, child.path);
        if (!Array.isArray(parents)) continue;
        for (const parent of parents) {
          if (parent && typeof parent === 'object') {
            ensureContainer(parent as Row, child.itemsField, child.shape === 'object');
          }
        }
      }
    }
  }

  /** Finds (or creates) the list/object the child rows belong to. */
  private childTarget(entity: Row, child: ChildDef, row: Row): Row | unknown[] | undefined {
    if (!child.itemsField) return ensureContainer(entity, child.path, child.shape === 'object');
    const parents = getPath(entity, child.path);
    if (!Array.isArray(parents)) return undefined;
    const parentIndex = Number(row[child.indexColumns[0]]);
    const parent = parents[parentIndex];
    if (!parent || typeof parent !== 'object') return undefined;
    return ensureContainer(parent as Row, child.itemsField, child.shape === 'object');
  }

  private assignChildValue(target: Row | unknown[], child: ChildDef, row: Row): void {
    const offset = child.itemsField ? 1 : 0;
    const index = Number(row[child.indexColumns[offset]]);
    const read = (def: ColumnDef): unknown =>
      fromColumnValue(def, row[columnName(def).toLowerCase()]);

    if (child.shape === 'object') {
      const keyDef = child.columns.find((def) => def.field === '$key');
      const valueDef = child.columns.find((def) => def.field === '$value');
      if (!keyDef || !valueDef || Array.isArray(target)) return;
      const key = row[columnName(keyDef).toLowerCase()];
      if (key === null || key === undefined) return;
      const value = read(valueDef);
      target[String(key)] = value === undefined ? '' : value;
      return;
    }
    if (!Array.isArray(target)) return;
    if (child.columns.length === 1 && child.columns[0].field === '$value') {
      const value = read(child.columns[0]);
      target[index] = value === undefined ? '' : value;
      return;
    }
    const item: Row = {};
    for (const def of child.columns) {
      const value = read(def);
      if (value !== undefined) setPath(item, def.field, value);
    }
    target[index] = item;
  }

  /**
   * P1.1 — các collection mà `ensureSchema()` VỪA tạo bảng trong lần chạy này (theo key của
   * `DatabaseSchema`). Bảng mới ⇒ entity vừa được thêm vào app ⇒ `db.init()` seed dữ liệu mẫu.
   * Bảng đã tồn tại từ trước KHÔNG bao giờ bị seed lại (kể cả khi người dùng đã xoá sạch dữ liệu).
   */
  createdCollectionKeys(): string[] {
    return [...this.createdTables]
      .filter((table) => COLLECTIONS.some((def) => def.table === table))
      .map((table) => schemaKey(table));
  }

  /* ============================ write ============================= */

  async isEmpty(): Promise<boolean> {
    const def = COLLECTIONS.find((item) => item.table === 'products') ?? COLLECTIONS[0];
    const rows = await this.driver.all<{ count: number | string }>(
      `SELECT COUNT(*) AS count FROM ${this.q(def.table)}`
    );
    return Number(rows[0]?.count ?? 0) === 0;
  }

  async replace(schema: DatabaseSchema): Promise<void> {
    await this.driver.transaction(async () => {
      for (const def of COLLECTIONS) {
        const source = (schema as unknown as Record<string, unknown>)[schemaKey(def.table)];
        await this.writeCollection(def, Array.isArray(source) ? (source as Row[]) : []);
      }
      for (const def of SINGLETONS) {
        const value = (schema as unknown as Record<string, unknown>)[schemaKey(def.table)];
        if (value === undefined || value === null) continue;
        await this.writeSingleton(def, value as Row);
      }
    });
    this.loaded = schema as unknown as LoadedSchema;
  }

  private async writeCollection(def: CollectionDef, items: Row[]): Promise<void> {
    await this.clearTable(def.table, def.children);
    const columns = def.columns.map(columnName);
    let index = 0;
    for (const item of items) {
      const rawId = item[def.idColumn];
      const idValue = rawId === undefined || rawId === null ? `row-${index}` : String(rawId);
      const values = def.columns.map((col) =>
        columnName(col) === def.idColumn ? idValue : toColumnValue(col, getPath(item, col.field))
      );
      values.push(index);
      await this.insert(def.table, [...columns, def.orderColumn], values);
      await this.writeChildren(item, idValue, def.children);
      index += 1;
    }
  }

  private async writeSingleton(def: SingletonDef, value: Row): Promise<void> {
    await this.clearTable(def.table, def.children);
    const columns = [def.keyColumn, ...def.columns.map(columnName)];
    const values: unknown[] = [SINGLETON_KEY];
    for (const col of def.columns) values.push(toColumnValue(col, getPath(value, col.field)));
    await this.insert(def.table, columns, values);
    await this.writeChildren(value, SINGLETON_KEY, def.children);
  }

  private async writeChildren(owner: Row, ownerValue: string, children: ChildDef[]): Promise<void> {
    for (const child of children) {
      if (!child.itemsField) {
        await this.insertChildRows(child, ownerValue, getPath(owner, child.path), []);
        continue;
      }
      const parents = getPath(owner, child.path);
      if (!Array.isArray(parents)) continue;
      for (let i = 0; i < parents.length; i += 1) {
        const parent = parents[i];
        const source = parent && typeof parent === 'object' ? (parent as Row)[child.itemsField] : undefined;
        await this.insertChildRows(child, ownerValue, source, [i]);
      }
    }
  }

  private async insertChildRows(
    child: ChildDef,
    ownerValue: string,
    source: unknown,
    parentIndexes: number[]
  ): Promise<void> {
    const columns = [child.ownerColumn, ...child.indexColumns, ...child.columns.map(columnName)];
    const prepare = (get: (def: ColumnDef) => unknown): unknown[] =>
      child.columns.map((def) => toColumnValue(def, get(def)));

    if (child.shape === 'object') {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      let index = 0;
      for (const [key, value] of Object.entries(source as Row)) {
        const values = prepare((def) => (def.field === '$key' ? key : value));
        await this.insert(child.table, columns, [ownerValue, ...parentIndexes, index, ...values]);
        index += 1;
      }
      return;
    }
    if (!Array.isArray(source)) return;
    let index = 0;
    for (const element of source) {
      const values = prepare((def) => (def.field === '$value' ? element : getPath(element, def.field)));
      await this.insert(child.table, columns, [ownerValue, ...parentIndexes, index, ...values]);
      index += 1;
    }
  }

  private async insert(table: string, columns: string[], values: unknown[]): Promise<void> {
    const names = columns.map((name) => this.q(name)).join(', ');
    const placeholders = values.map(() => '?').join(', ');
    await this.driver.run(`INSERT INTO ${this.q(table)} (${names}) VALUES (${placeholders})`, values);
  }

  private async clearTable(table: string, children: ChildDef[]): Promise<void> {
    for (const child of children) await this.driver.run(`DELETE FROM ${this.q(child.table)}`);
    await this.driver.run(`DELETE FROM ${this.q(table)}`);
  }

  /* ============================ misc ============================= */

  getLoaded(): LoadedSchema {
    return this.loaded;
  }

  isReady(): boolean {
    return this.ready;
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}


