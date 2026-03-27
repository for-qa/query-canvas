import type { SqlColumnType, SqlCreateTableColumn, SqlCreateTableQuery } from '../domain/sql/SqlModels'

/**
 * Parses a CREATE TABLE statement to extract the table name and columns.
 * Very basic implementation using regex.
 */
export function parseCreateTable(sql: string): SqlCreateTableQuery | null {
  const tableReg = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][\w$]*)\s*\(([\s\S]+)\)/i
  const tableMatch = tableReg.exec(sql)
  if (!tableMatch) return null

  const tableName = tableMatch[1]
  const columnsPart = tableMatch[2]

  const columns: SqlCreateTableColumn[] = []
  
  // Split columns by comma, but respect parentheses (e.g. DECIMAL(10,2))
  const columnDefs = splitByComma(columnsPart)

  for (const def of columnDefs) {
    const trimmed = def.trim()
    if (!trimmed) continue
    
    // Skip constraints for now (PRIMARY KEY, etc. at the end)
    if (/^(?:PRIMARY\s+KEY|CONSTRAINT|UNIQUE|FOREIGN\s+KEY|CHECK|INDEX|KEY)/i.test(trimmed)) continue

    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue

    const name = parts[0].replaceAll(/[`"[]/g, '') // Remove quotes
    const typePart = parts[1].toUpperCase()
    
    // Extract type and length/precision
    const typeReg = /^([A-Z]+)(?:\(([^)]+)\))?/
    const typeMatch = typeReg.exec(typePart)
    const baseType = typeMatch ? typeMatch[1] : typePart
    const length = typeMatch ? typeMatch[2] : ''

    const column: SqlCreateTableColumn = {
      name,
      type: mapToSqlColumnType(baseType),
      length: length || undefined,
      nullable: !/\bNOT\s+NULL\b/i.test(trimmed),
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(trimmed),
      unique: /\bUNIQUE\b/i.test(trimmed),
      autoIncrement: /\bAUTO_INCREMENT\b|\bSERIAL\b|\bIDENTITY\b/i.test(trimmed),
      defaultValue: extractDefaultValue(trimmed) || undefined,
    }
    columns.push(column)
  }

  return {
    tableName,
    columns,
    ifNotExists: /\bIF\s+NOT\s+EXISTS\b/i.test(sql),
    includeSemicolon: sql.trim().endsWith(';'),
  } as unknown as SqlCreateTableQuery
}

function splitByComma(input: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const char of input) {
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts
}

function mapToSqlColumnType(type: string): SqlColumnType {
  const t = type.toUpperCase()
  if (t === 'INT' || t === 'INTEGER') return 'INT'
  if (t === 'VARCHAR') return 'VARCHAR'
  if (t === 'TEXT') return 'TEXT'
  if (t === 'BIGINT') return 'BIGINT'
  if (t === 'DECIMAL' || t === 'NUMERIC') return 'DECIMAL'
  if (t === 'BOOLEAN' || t === 'BOOL') return 'BOOLEAN'
  if (t === 'DATE') return 'DATE'
  if (t === 'DATETIME') return 'DATETIME'
  if (t === 'TIMESTAMP') return 'TIMESTAMP'
  if (t === 'JSON') return 'JSON'
  if (t === 'UUID') return 'UUID'
  return 'VARCHAR' // Default fallback
}

function extractDefaultValue(def: string): string | null {
  const defaultReg = /\bDEFAULT\s+([^, ]+)/i
  const match = defaultReg.exec(def)
  if (!match) return null
  return match[1].replaceAll(/'/g, '') // Remove quotes
}
