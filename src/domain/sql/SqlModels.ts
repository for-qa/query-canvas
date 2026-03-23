export type SqlConditionConnector = 'AND' | 'OR'

export type SqlConditionOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'IN'
  | 'IS NULL'
  | 'IS NOT NULL'

export type SqlOrderDirection = 'ASC' | 'DESC'

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
  where: SqlCondition[]
  groupBy: string[]
  orderBy?: SqlOrderBy
  limit?: number
  quoteIdentifiers: boolean
  includeSemicolon: boolean
}

