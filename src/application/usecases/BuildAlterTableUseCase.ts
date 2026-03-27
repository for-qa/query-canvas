import type { SqlAlterTableQuery } from '../../domain/sql/SqlModels'
import type { BasicAlterTableBuilder } from '../../infrastructure/sql/BasicAlterTableBuilder'

export class BuildAlterTableUseCase {
  constructor(private readonly builder: BasicAlterTableBuilder) {}

  execute(query: SqlAlterTableQuery): string {
    return this.builder.build(query)
  }
}
