import type {
  DatasetFormatSettings,
  DatasetFormatter,
} from '../../domain/dataset/DatasetFormatter'

export class FormatDatasetUseCase {
  private readonly formatter: DatasetFormatter

  constructor(formatter: DatasetFormatter) {
    this.formatter = formatter
  }

  execute(input: string, settings: DatasetFormatSettings): string {
    return this.formatter.format(input, settings)
  }
}

