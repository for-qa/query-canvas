import type { SqlQuery } from './SqlModels'

export interface SqlQueryBuilder {
  build(query: SqlQuery): string
}

