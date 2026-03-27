import type { SqlDialect } from './SqlDialect'
export type { SqlDialect }

export type SqlConditionConnector = 'AND' | 'OR'


export type SqlConditionOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'NOT ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'

export type SqlOrderDirection = 'ASC' | 'DESC'

export type SqlJoinType = 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'FULL OUTER JOIN' | 'CROSS JOIN'

export interface SqlJoin {
  type: SqlJoinType
  table: string
  on: string
}

export interface SqlCondition {
  connector: SqlConditionConnector
  field: string
  operator: SqlConditionOperator
  value?: string
}

export interface SqlOrderBy {
  field: string
  direction: SqlOrderDirection
}

export interface SqlQuery {
  table: string
  columns: string[]
  distinct: boolean
  joins: SqlJoin[]
  where: SqlCondition[]
  having: SqlCondition[]
  groupBy: string[]
  orderBy: SqlOrderBy[]
  limit?: number
  offset?: number
  quoteIdentifiers: boolean
  /** Dialect-specific identifier quote character, e.g. '`', '"', '[' */
  identifierQuote?: string
  identifierQuoteClose?: string
  includeSemicolon: boolean
}

// ─── DDL Models ──────────────────────────────────────────────────────────────

export type SqlColumnType =
  | 'INT'
  | 'BIGINT'
  | 'SMALLINT'
  | 'DECIMAL'
  | 'FLOAT'
  | 'DOUBLE'
  | 'VARCHAR'
  | 'TEXT'
  | 'CHAR'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'TIMESTAMP'
  | 'TIME'
  | 'JSON'
  | 'UUID'

export interface SqlCreateTableColumn {
  name: string
  type: SqlColumnType
  length?: string
  nullable: boolean
  primaryKey: boolean
  unique: boolean
  defaultValue?: string
  autoIncrement: boolean
}

export interface SqlCreateTableQuery {
  tableName: string
  columns: SqlCreateTableColumn[]
  ifNotExists: boolean
  dialect: SqlDialect
  includeSemicolon: boolean
}

export interface SqlCreateDatabaseQuery {
  databaseName: string
  ifNotExists: boolean
  characterSet?: string
  collation?: string
  dialect: SqlDialect
  includeSemicolon: boolean
}

// ─── ALTER TABLE Models ───────────────────────────────────────────────────────

export interface SqlAlterAddColumn {
  kind: 'ADD_COLUMN'
  column: SqlCreateTableColumn
  afterColumn?: string
}

export interface SqlAlterDropColumn {
  kind: 'DROP_COLUMN'
  columnName: string
}

export interface SqlAlterModifyColumn {
  kind: 'MODIFY_COLUMN'
  column: SqlCreateTableColumn
}

export interface SqlAlterRenameColumn {
  kind: 'RENAME_COLUMN'
  oldName: string
  newName: string
  column: SqlCreateTableColumn
}

export interface SqlAlterRenameTable {
  kind: 'RENAME_TABLE'
  newName: string
}

export interface SqlAlterAddPrimaryKey {
  kind: 'ADD_PRIMARY_KEY'
  columns: string[]
}

export interface SqlAlterDropPrimaryKey {
  kind: 'DROP_PRIMARY_KEY'
}

export interface SqlAlterAddForeignKey {
  kind: 'ADD_FOREIGN_KEY'
  constraintName?: string
  columns: string[]
  refTable: string
  refColumns: string[]
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

export interface SqlAlterDropForeignKey {
  kind: 'DROP_FOREIGN_KEY'
  constraintName: string
}

export interface SqlAlterAddIndex {
  kind: 'ADD_INDEX'
  indexName?: string
  columns: string[]
  unique: boolean
}

export interface SqlAlterDropIndex {
  kind: 'DROP_INDEX'
  indexName: string
}

export type SqlAlterAction =
  | SqlAlterAddColumn
  | SqlAlterDropColumn
  | SqlAlterModifyColumn
  | SqlAlterRenameColumn
  | SqlAlterRenameTable
  | SqlAlterAddPrimaryKey
  | SqlAlterDropPrimaryKey
  | SqlAlterAddForeignKey
  | SqlAlterDropForeignKey
  | SqlAlterAddIndex
  | SqlAlterDropIndex

/** Convenience alias — the 'kind' of every possible ALTER TABLE action */
export type SqlAlterActionType = SqlAlterAction['kind']

export interface SqlAlterTableQuery {
  tableName: string
  actions: SqlAlterAction[]
  includeSemicolon: boolean
}

// ─── DML Models (UPDATE / DELETE) ────────────────────────────────────────────

export interface SqlSetClause {
  column: string
  value: string
}

export interface SqlUpdateQuery {
  table: string
  sets: SqlSetClause[]
  where: SqlCondition[]
  orderBy?: SqlOrderBy
  limit?: number
  quoteIdentifiers: boolean
  includeSemicolon: boolean
}

export interface SqlDeleteQuery {
  table: string
  where: SqlCondition[]
  orderBy?: SqlOrderBy
  limit?: number
  quoteIdentifiers: boolean
  includeSemicolon: boolean
}

// ─── DROP / TRUNCATE Models ──────────────────────────────────────────────────

export interface SqlDropTableQuery {
  tableName: string
  ifExists: boolean
  dialect: SqlDialect
  includeSemicolon: boolean
}

export interface SqlDropDatabaseQuery {
  databaseName: string
  ifExists: boolean
  dialect: SqlDialect
  includeSemicolon: boolean
}

export interface SqlTruncateQuery {
  tableName: string
  dialect: SqlDialect
  includeSemicolon: boolean
}
