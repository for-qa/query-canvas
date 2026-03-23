import type {
  SqlCondition,
  SqlQuery,
  SqlOrderBy,
} from '../../domain/sql/SqlModels'
import type { SqlQueryBuilder } from '../../domain/sql/SqlQueryBuilder'

type SqlIdentifier = string

export class BasicSelectQueryBuilder implements SqlQueryBuilder {
  build(query: SqlQuery): string {
    const columns = query.columns.length ? query.columns : ['*']
    const colsSql = columns.join(', ')
    const tableSql = this.formatIdentifier(query.table, query.quoteIdentifiers)

    let sql = `SELECT ${colsSql} FROM ${tableSql}`

    const whereSql = this.buildWhere(query.where, query.quoteIdentifiers)
    if (whereSql) sql += ` WHERE ${whereSql}`

    const groupBySql = this.buildList(query.groupBy, query.quoteIdentifiers)
    if (groupBySql) sql += ` GROUP BY ${groupBySql}`

    if (query.orderBy) {
      sql += ` ORDER BY ${this.buildOrderBy(query.orderBy, query.quoteIdentifiers)}`
    }

    if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
      sql += ` LIMIT ${Math.trunc(query.limit)}`
    }

    if (query.includeSemicolon) sql += ';'

    return sql
  }

  private buildWhere(where: SqlCondition[], quoteIdentifiers: boolean): string | null {
    if (!where.length) return null

    return where
      .map((condition, idx) => {
        const connector = idx === 0 ? '' : ` ${condition.connector} `
        return `${connector}${this.buildCondition(condition, quoteIdentifiers)}`
      })
      .join('')
  }

  private buildCondition(condition: SqlCondition, quoteIdentifiers: boolean): string {
    const fieldSql = this.formatIdentifier(condition.field, quoteIdentifiers)
    const operator = condition.operator

    if (operator === 'IS NULL') return `${fieldSql} IS NULL`
    if (operator === 'IS NOT NULL') return `${fieldSql} IS NOT NULL`

    if (operator === 'IN') {
      const values = (condition.value ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      const formatted = values.map((v) => this.formatSqlLiteral(v))
      return `${fieldSql} IN (${formatted.join(', ')})`
    }

    const valueSql = this.formatSqlLiteral((condition.value ?? '').trim())
    return `${fieldSql} ${operator} ${valueSql}`
  }

  private formatSqlLiteral(raw: string): string {
    if (!raw) return "''"

    const upper = raw.toUpperCase()
    if (upper === 'NULL') return 'NULL'
    if (upper === 'TRUE') return 'TRUE'
    if (upper === 'FALSE') return 'FALSE'

    // Numeric: avoid quoting. This is intentionally conservative.
    if (/^-?\d+(\.\d+)?$/.test(raw)) return raw

    const escaped = raw.replace(/'/g, "''")
    return `'${escaped}'`
  }

  private buildOrderBy(orderBy: SqlOrderBy, quoteIdentifiers: boolean): string {
    const fieldSql = this.formatIdentifier(orderBy.field, quoteIdentifiers)
    return `${fieldSql} ${orderBy.direction}`
  }

  private buildList(items: string[], quoteIdentifiers: boolean): string | null {
    const filtered = items
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => this.formatIdentifier(x, quoteIdentifiers))
    return filtered.length ? filtered.join(', ') : null
  }

  private formatIdentifier(identifier: SqlIdentifier, quote: boolean): string {
    const trimmed = identifier.trim()
    if (!quote) return trimmed

    // Double-quote escape for identifiers.
    const escaped = trimmed.replace(/"/g, '""')
    return `"${escaped}"`
  }
}

