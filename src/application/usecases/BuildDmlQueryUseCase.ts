import type { SqlUpdateQuery, SqlDeleteQuery } from '../../domain/sql/SqlModels'
import type { BasicDmlQueryBuilder } from '../../infrastructure/sql/BasicDmlQueryBuilder'

export class BuildDmlQueryUseCase {
  constructor(private readonly builder: BasicDmlQueryBuilder) {}

  executeUpdate(query: SqlUpdateQuery): string {
    return this.builder.buildUpdate(query)
  }

  executeDelete(query: SqlDeleteQuery): string {
    return this.builder.buildDelete(query)
  }
}
