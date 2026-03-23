import type { SqlQuery } from '../../domain/sql/SqlModels'
import type { SqlQueryBuilder } from '../../domain/sql/SqlQueryBuilder'

export class BuildSqlQueryUseCase {
  private readonly builder: SqlQueryBuilder

  constructor(builder: SqlQueryBuilder) {
    this.builder = builder
  }

  execute(query: SqlQuery): string {
    return this.builder.build(query)
  }
}

