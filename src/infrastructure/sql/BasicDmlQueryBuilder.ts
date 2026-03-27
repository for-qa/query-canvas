import type {
  SqlUpdateQuery,
  SqlDeleteQuery,
  SqlCondition,
} from '../../domain/sql/SqlModels'

export class BasicDmlQueryBuilder {
  buildUpdate(query: SqlUpdateQuery): string {
    const table = this.fmtId(query.table.trim(), query.quoteIdentifiers)
    if (!table) return ''

    const sets = query.sets
      .filter((s) => s.column.trim().length > 0)
      .map((s) => {
        const col = this.fmtId(s.column.trim(), query.quoteIdentifiers)
        const val = this.fmtLiteral(s.value)
        return `${col} = ${val}`
      })

    if (!sets.length) return ''

    let sql = `UPDATE ${table} SET ${sets.join(', ')}`

    const where = this.buildConditions(query.where, query.quoteIdentifiers)
    if (where) sql += ` WHERE ${where}`

    if (query.orderBy) {
      sql += ` ORDER BY ${this.fmtId(query.orderBy.field.trim(), query.quoteIdentifiers)} ${query.orderBy.direction}`
    }

    if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
      sql += ` LIMIT ${Math.trunc(query.limit)}`
    }

    if (query.includeSemicolon) sql += ';'
    return sql
  }

  buildDelete(query: SqlDeleteQuery): string {
    const table = this.fmtId(query.table.trim(), query.quoteIdentifiers)
    if (!table) return ''

    let sql = `DELETE FROM ${table}`

    const where = this.buildConditions(query.where, query.quoteIdentifiers)
    if (where) sql += ` WHERE ${where}`

    if (query.orderBy) {
      sql += ` ORDER BY ${this.fmtId(query.orderBy.field.trim(), query.quoteIdentifiers)} ${query.orderBy.direction}`
    }

    if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
      sql += ` LIMIT ${Math.trunc(query.limit)}`
    }

    if (query.includeSemicolon) sql += ';'
    return sql
  }

  private buildConditions(conditions: SqlCondition[], quoteIdentifiers: boolean): string | null {
    if (!conditions.length) return null
    return conditions
      .map((c, idx) => {
        const connector = idx === 0 ? '' : ` ${c.connector} `
        return connector + this.buildCondition(c, quoteIdentifiers)
      })
      .join('')
  }

  private buildCondition(c: SqlCondition, quoteIdentifiers: boolean): string {
    const field = this.fmtId(c.field, quoteIdentifiers)
    if (c.operator === 'IS NULL') return `${field} IS NULL`
    if (c.operator === 'IS NOT NULL') return `${field} IS NOT NULL`

    if (c.operator === 'IN' || c.operator === 'NOT IN') {
      const vals = (c.value ?? '')
        .split(',')
        .map((v) => this.fmtLiteral(v.trim()))
        .filter(Boolean)
      return `${field} ${c.operator} (${vals.join(', ')})`
    }

    return `${field} ${c.operator} ${this.fmtLiteral((c.value ?? '').trim())}`
  }

  private fmtLiteral(raw: string): string {
    if (!raw) return "''"
    const upper = raw.toUpperCase()
    if (upper === 'NULL') return 'NULL'
    if (upper === 'TRUE') return 'TRUE'
    if (upper === 'FALSE') return 'FALSE'
    if (/^-?\d+(\.\d+)?$/.test(raw)) return raw
    return "'" + raw.replaceAll("'", "''") + "'"
  }

  private fmtId(id: string, quote: boolean): string {
    const t = id.trim()
    if (!quote) return t
    return '"' + t.replaceAll('"', '""') + '"'
  }
}
