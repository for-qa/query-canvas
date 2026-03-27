import { BasicSelectQueryBuilder } from './infrastructure/sql/BasicSelectQueryBuilder'
import { BasicDdlQueryBuilder } from './infrastructure/sql/BasicDdlQueryBuilder'
import { BasicAlterTableBuilder } from './infrastructure/sql/BasicAlterTableBuilder'
import { BasicDmlQueryBuilder } from './infrastructure/sql/BasicDmlQueryBuilder'
import { LineJoinDatasetFormatter } from './infrastructure/dataset/LineJoinDatasetFormatter'
import { BuildSqlQueryUseCase } from './application/usecases/BuildSqlQueryUseCase'
import { FormatDatasetUseCase } from './application/usecases/FormatDatasetUseCase'
import { BuildDdlQueryUseCase } from './application/usecases/BuildDdlQueryUseCase'
import { BuildAlterTableUseCase } from './application/usecases/BuildAlterTableUseCase'
import { BuildDmlQueryUseCase } from './application/usecases/BuildDmlQueryUseCase'

export function createAppUseCases() {
  const datasetFormatter = new LineJoinDatasetFormatter()
  const sqlQueryBuilder = new BasicSelectQueryBuilder()
  const ddlQueryBuilder = new BasicDdlQueryBuilder()
  const alterTableBuilder = new BasicAlterTableBuilder()
  const dmlQueryBuilder = new BasicDmlQueryBuilder()

  const formatDataset = new FormatDatasetUseCase(datasetFormatter)
  const buildSqlQuery = new BuildSqlQueryUseCase(sqlQueryBuilder)
  const buildDdl = new BuildDdlQueryUseCase(ddlQueryBuilder)
  const buildAlterTable = new BuildAlterTableUseCase(alterTableBuilder)
  const buildDml = new BuildDmlQueryUseCase(dmlQueryBuilder)

  return {
    formatDataset,
    buildSqlQuery,
    buildDdl,
    buildAlterTable,
    buildDml,
  }
}

export type AppUseCases = ReturnType<typeof createAppUseCases>
