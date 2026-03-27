import type {
  SqlAlterTableQuery,
  SqlAlterAction,
  SqlCreateTableColumn,
} from '../../domain/sql/SqlModels'

export class BasicAlterTableBuilder {
  build(query: SqlAlterTableQuery): string {
    const tableName = this.qi(query.tableName.trim())
    if (!tableName) return ''

    const validActions = query.actions.filter((a) => this.isActionValid(a))
    if (!validActions.length) return ''

    const clauses = validActions.map((a) => this.buildAction(a)).filter(Boolean)
    if (!clauses.length) return ''

    const semi = query.includeSemicolon ? ';' : ''
    return 'ALTER TABLE ' + tableName + '\n' + clauses.map((c) => '  ' + c).join(',\n') + semi
  }

  private isActionValid(action: SqlAlterAction): boolean {
    switch (action.kind) {
      case 'ADD_COLUMN':
      case 'MODIFY_COLUMN':
        return action.column.name.trim().length > 0
      case 'DROP_COLUMN':
        return action.columnName.trim().length > 0
      case 'RENAME_COLUMN':
        return action.oldName.trim().length > 0 && action.newName.trim().length > 0
      case 'RENAME_TABLE':
        return action.newName.trim().length > 0
      case 'ADD_PRIMARY_KEY':
        return action.columns.length > 0
      case 'DROP_PRIMARY_KEY':
        return true
      case 'ADD_FOREIGN_KEY':
        return action.columns.length > 0 && action.refTable.trim().length > 0 && action.refColumns.length > 0
      case 'DROP_FOREIGN_KEY':
        return action.constraintName.trim().length > 0
      case 'ADD_INDEX':
        return action.columns.length > 0
      case 'DROP_INDEX':
        return action.indexName.trim().length > 0
      default:
        return false
    }
  }

  private buildAction(action: SqlAlterAction): string {
    switch (action.kind) {
      case 'ADD_COLUMN': {
        const colDef = this.buildColumnDef(action.column)
        const after = action.afterColumn?.trim() ? ` AFTER ${this.qi(action.afterColumn.trim())}` : ''
        return `ADD COLUMN ${colDef}${after}`
      }
      case 'DROP_COLUMN':
        return `DROP COLUMN ${this.qi(action.columnName.trim())}`
      case 'MODIFY_COLUMN':
        return `MODIFY COLUMN ${this.buildColumnDef(action.column)}`
      case 'RENAME_COLUMN':
        return `RENAME COLUMN ${this.qi(action.oldName.trim())} TO ${this.qi(action.newName.trim())}`
      case 'RENAME_TABLE':
        return `RENAME TO ${this.qi(action.newName.trim())}`
      case 'ADD_PRIMARY_KEY': {
        const cols = action.columns.map((c) => this.qi(c.trim())).join(', ')
        return `ADD PRIMARY KEY (${cols})`
      }
      case 'DROP_PRIMARY_KEY':
        return 'DROP PRIMARY KEY'
      case 'ADD_FOREIGN_KEY': {
        const constraintPart = action.constraintName?.trim()
          ? `CONSTRAINT ${this.qi(action.constraintName.trim())} `
          : ''
        const cols = action.columns.map((c) => this.qi(c.trim())).join(', ')
        const refCols = action.refColumns.map((c) => this.qi(c.trim())).join(', ')
        let fk = `ADD ${constraintPart}FOREIGN KEY (${cols}) REFERENCES ${this.qi(action.refTable.trim())} (${refCols})`
        if (action.onDelete) fk += ` ON DELETE ${action.onDelete}`
        if (action.onUpdate) fk += ` ON UPDATE ${action.onUpdate}`
        return fk
      }
      case 'DROP_FOREIGN_KEY':
        return `DROP FOREIGN KEY ${this.qi(action.constraintName.trim())}`
      case 'ADD_INDEX': {
        const unique = action.unique ? 'UNIQUE ' : ''
        const namePart = action.indexName?.trim() ? ` ${this.qi(action.indexName.trim())}` : ''
        const cols = action.columns.map((c) => this.qi(c.trim())).join(', ')
        return `ADD ${unique}INDEX${namePart} (${cols})`
      }
      case 'DROP_INDEX':
        return `DROP INDEX ${this.qi(action.indexName.trim())}`
      default:
        return ''
    }
  }

  private buildColumnDef(col: SqlCreateTableColumn): string {
    const name = this.qi(col.name.trim())
    const typeWithLength = this.resolveType(col)
    const parts: string[] = [`${name} ${typeWithLength}`]

    if (col.primaryKey) {
      parts.push('PRIMARY KEY')
    } else if (col.unique) {
      parts.push('UNIQUE')
    }

    if (col.autoIncrement) parts.push('AUTO_INCREMENT')
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
      return `${col.type}(${col.length.trim()})`
    }
    return col.type
  }

  /** Backtick-quoted identifier */
  private qi(name: string): string {
    if (!name) return ''
    return '`' + name.replaceAll('`', '``') + '`'
  }
}
