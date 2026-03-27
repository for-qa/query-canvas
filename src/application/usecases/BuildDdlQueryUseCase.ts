import type {
  SqlCreateTableQuery,
  SqlCreateDatabaseQuery,
  SqlDropTableQuery,
  SqlDropDatabaseQuery,
  SqlTruncateQuery,
} from '../../domain/sql/SqlModels'
import type { BasicDdlQueryBuilder } from '../../infrastructure/sql/BasicDdlQueryBuilder'

export class BuildDdlQueryUseCase {
  constructor(private readonly builder: BasicDdlQueryBuilder) {}

  executeCreateTable(query: SqlCreateTableQuery): string {
    return this.builder.buildCreateTable(query)
  }

  executeCreateDatabase(query: SqlCreateDatabaseQuery): string {
    return this.builder.buildCreateDatabase(query)
  }

  executeDropTable(query: SqlDropTableQuery): string {
    return this.builder.buildDropTable(query)
  }

  executeDropDatabase(query: SqlDropDatabaseQuery): string {
    return this.builder.buildDropDatabase(query)
  }

  executeTruncate(query: SqlTruncateQuery): string {
    return this.builder.buildTruncate(query)
  }
}
