import { BasicSelectQueryBuilder } from './infrastructure/sql/BasicSelectQueryBuilder'
import { LineJoinDatasetFormatter } from './infrastructure/dataset/LineJoinDatasetFormatter'
import { BuildSqlQueryUseCase } from './application/usecases/BuildSqlQueryUseCase'
import { FormatDatasetUseCase } from './application/usecases/FormatDatasetUseCase'

export function createAppUseCases() {
  const datasetFormatter = new LineJoinDatasetFormatter()
  const sqlQueryBuilder = new BasicSelectQueryBuilder()

  const formatDataset = new FormatDatasetUseCase(datasetFormatter)
  const buildSqlQuery = new BuildSqlQueryUseCase(sqlQueryBuilder)

  return {
    formatDataset,
    buildSqlQuery,
  }
}

export type AppUseCases = ReturnType<typeof createAppUseCases>

