import type {
  SqlCreateTableColumn,
  SqlCreateTableQuery,
  SqlCreateDatabaseQuery,
  SqlDropTableQuery,
  SqlDropDatabaseQuery,
  SqlTruncateQuery,
} from '../../domain/sql/SqlModels'
import { DIALECT_CONFIGS } from '../../domain/sql/SqlDialect'
import type { SqlDialect } from '../../domain/sql/SqlDialect'

export class BasicDdlQueryBuilder {
  buildCreateTable(query: SqlCreateTableQuery): string {
    const tableName = this.qi(query.tableName.trim(), query.dialect)
    if (!tableName) return ''

    const cols = query.columns
      .filter((c) => c.name.trim().length > 0)
      .map((c) => this.buildColumnDef(c, query.dialect))

    if (cols.length === 0) return ''

    const ifNotExists = query.ifNotExists ? 'IF NOT EXISTS ' : ''
    const semi = query.includeSemicolon ? ';' : ''
    const colDefs = cols.map((c) => '  ' + c).join(',\n')
    return 'CREATE TABLE ' + ifNotExists + tableName + ' (\n' + colDefs + '\n)' + semi
  }

  buildCreateDatabase(query: SqlCreateDatabaseQuery): string {
    const dbName = this.qi(query.databaseName.trim(), query.dialect)
    if (!dbName) return ''

    const ifNotExists = query.ifNotExists ? 'IF NOT EXISTS ' : ''
    let sql = 'CREATE DATABASE ' + ifNotExists + dbName

    if (query.characterSet?.trim()) {
      sql += ' CHARACTER SET ' + query.characterSet.trim()
    }
    if (query.collation?.trim()) {
      sql += ' COLLATE ' + query.collation.trim()
    }

    if (query.includeSemicolon) sql += ';'
    return sql
  }

  buildDropTable(query: SqlDropTableQuery): string {
    const name = this.qi(query.tableName.trim(), query.dialect)
    if (!name) return ''
    const ifExists = query.ifExists ? 'IF EXISTS ' : ''
    const semi = query.includeSemicolon ? ';' : ''
    return 'DROP TABLE ' + ifExists + name + semi
  }

  buildDropDatabase(query: SqlDropDatabaseQuery): string {
    const name = this.qi(query.databaseName.trim(), query.dialect)
    if (!name) return ''
    const ifExists = query.ifExists ? 'IF EXISTS ' : ''
    const semi = query.includeSemicolon ? ';' : ''
    return 'DROP DATABASE ' + ifExists + name + semi
  }

  buildTruncate(query: SqlTruncateQuery): string {
    const name = this.qi(query.tableName.trim(), query.dialect)
    if (!name) return ''
    const semi = query.includeSemicolon ? ';' : ''
    // SQL Server uses TRUNCATE TABLE, others use TRUNCATE TABLE too
    return 'TRUNCATE TABLE ' + name + semi
  }

  private buildColumnDef(col: SqlCreateTableColumn, dialect?: SqlDialect): string {
    const name = this.qi(col.name.trim(), dialect)
    const typeWithLength = this.resolveType(col)
    const parts: string[] = [name + ' ' + typeWithLength]

    if (col.primaryKey) {
      parts.push('PRIMARY KEY')
    } else if (col.unique) {
      parts.push('UNIQUE')
    }

    if (col.autoIncrement) {
      const keyword = dialect ? DIALECT_CONFIGS[dialect].autoIncrementKeyword : 'AUTO_INCREMENT'
      parts.push(keyword)
    }
    if (!col.nullable) parts.push('NOT NULL')

    if (col.defaultValue !== undefined && col.defaultValue.trim().length > 0) {
      const dv = col.defaultValue.trim()
      const isRaw =
        /^-?\d+(\.\d+)?$/.test(dv) ||
        /^(NULL|TRUE|FALSE|CURRENT_TIMESTAMP|CURRENT_DATE|CURRENT_TIME)$/i.test(dv)
      const escaped = dv.replaceAll("'", "''")
      const quotedDv = "'" + escaped + "'"
      parts.push('DEFAULT ' + (isRaw ? dv : quotedDv))
    }

    return parts.join(' ')
  }

  private resolveType(col: SqlCreateTableColumn): string {
    const lengthTypes = ['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE']
    if (lengthTypes.includes(col.type) && col.length?.trim()) {
      return col.type + '(' + col.length.trim() + ')'
    }
    return col.type
  }

  /** Dialect-aware identifier quoting */
  private qi(name: string, dialect?: SqlDialect): string {
    if (!name) return ''
    if (!dialect || dialect === 'mysql') {
      return '`' + name.replaceAll('`', '``') + '`'
    }
    const cfg = DIALECT_CONFIGS[dialect]
    const escaped = name.replaceAll(cfg.idOpen, cfg.idOpen + cfg.idOpen)
    return cfg.idOpen + escaped + cfg.idClose
  }
}
