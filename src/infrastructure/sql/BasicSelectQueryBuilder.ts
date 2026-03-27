import type {
  SqlCondition,
  SqlJoin,
  SqlQuery,
  SqlOrderBy,
} from '../../domain/sql/SqlModels'
import type { SqlQueryBuilder } from '../../domain/sql/SqlQueryBuilder'

export class BasicSelectQueryBuilder implements SqlQueryBuilder {
  build(query: SqlQuery): string {
    const columns = query.columns.length ? query.columns : ['*']
    const colsSql = columns.join(', ')
    const tableSql = this.formatIdentifier(query.table, query.quoteIdentifiers)
    const distinct = query.distinct ? 'DISTINCT ' : ''

    let sql = `SELECT ${distinct}${colsSql} FROM ${tableSql}`

    const joinsSql = this.buildJoins(query.joins, query.quoteIdentifiers)
    if (joinsSql) sql += ` ${joinsSql}`

    const whereSql = this.buildConditionList(query.where, query.quoteIdentifiers)
    if (whereSql) sql += ` WHERE ${whereSql}`

    const groupBySql = this.buildList(query.groupBy, query.quoteIdentifiers)
    if (groupBySql) sql += ` GROUP BY ${groupBySql}`

    const havingSql = this.buildConditionList(query.having, query.quoteIdentifiers)
    if (havingSql) sql += ` HAVING ${havingSql}`

    const orderBySql = this.buildOrderByList(query.orderBy, query.quoteIdentifiers)
    if (orderBySql) sql += ` ORDER BY ${orderBySql}`

    if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
      sql += ` LIMIT ${Math.trunc(query.limit)}`
    }

    if (typeof query.offset === 'number' && Number.isFinite(query.offset) && query.offset > 0) {
      sql += ` OFFSET ${Math.trunc(query.offset)}`
    }

    if (query.includeSemicolon) sql += ';'

    return sql
  }

  private buildConditionList(conditions: SqlCondition[], quoteIdentifiers: boolean): string | null {
    if (!conditions.length) return null

    return conditions
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

    if (operator === 'IN' || operator === 'NOT IN') {
      const values = (condition.value ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      const formatted = values.map((v) => this.formatSqlLiteral(v))
      return `${fieldSql} ${operator} (${formatted.join(', ')})`
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

    const escaped = raw.replaceAll("'", "''")
    return `'${escaped}'`
  }

  private buildJoins(joins: SqlJoin[], quoteIdentifiers: boolean): string | null {
    if (!joins?.length) return null
    return joins
      .map((join) => {
        const tableSql = this.formatIdentifier(join.table.trim(), quoteIdentifiers)
        return `${join.type} ${tableSql} ON ${join.on.trim()}`
      })
      .join(' ')
  }

  private buildOrderByList(orderBys: SqlOrderBy[], quoteIdentifiers: boolean): string | null {
    if (!orderBys?.length) return null
    const filtered = orderBys.filter((o) => o.field.trim().length > 0)
    if (!filtered.length) return null
    return filtered
      .map((o) => `${this.formatIdentifier(o.field.trim(), quoteIdentifiers)} ${o.direction}`)
      .join(', ')
  }

  private buildList(items: string[], quoteIdentifiers: boolean): string | null {
    const filtered = items
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => this.formatIdentifier(x, quoteIdentifiers))
    return filtered.length ? filtered.join(', ') : null
  }

  private formatIdentifier(identifier: string, quote: boolean): string {
    const trimmed = identifier.trim()
    if (!quote) return trimmed

    // Double-quote escape for identifiers.
    const escaped = trimmed.replaceAll('"', '""')
    return `"${escaped}"`
  }
}
