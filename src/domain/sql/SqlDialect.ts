export type SqlDialect = 'mysql' | 'postgresql' | 'sqlite' | 'mssql'

export interface DialectConfig {
  label: string
  /** Opening quote character for identifiers */
  idOpen: string
  /** Closing quote character for identifiers */
  idClose: string
  /** SQL keyword for auto-incrementing primary keys */
  autoIncrementKeyword: string
  /** Whether ILIKE operator is natively supported */
  supportsIlike: boolean
  /** LIMIT / pagination syntax flavor */
  limitSyntax: 'limit-offset' | 'top-fetch'
}

export const DIALECT_CONFIGS: Record<SqlDialect, DialectConfig> = {
  mysql: {
    label: 'MySQL',
    idOpen: '`',
    idClose: '`',
    autoIncrementKeyword: 'AUTO_INCREMENT',
    supportsIlike: false,
    limitSyntax: 'limit-offset',
  },
  postgresql: {
    label: 'PostgreSQL',
    idOpen: '"',
    idClose: '"',
    autoIncrementKeyword: 'GENERATED ALWAYS AS IDENTITY',
    supportsIlike: true,
    limitSyntax: 'limit-offset',
  },
  sqlite: {
    label: 'SQLite',
    idOpen: '"',
    idClose: '"',
    autoIncrementKeyword: 'AUTOINCREMENT',
    supportsIlike: false,
    limitSyntax: 'limit-offset',
  },
  mssql: {
    label: 'SQL Server',
    idOpen: '[',
    idClose: ']',
    autoIncrementKeyword: 'IDENTITY(1,1)',
    supportsIlike: false,
    limitSyntax: 'top-fetch',
  },
}

/** Wrap an identifier with dialect-appropriate quoting */
export function quoteIdentifier(name: string, dialect: SqlDialect): string {
  const cfg = DIALECT_CONFIGS[dialect]
  const escaped = name.replaceAll(cfg.idOpen, cfg.idOpen + cfg.idOpen)
  return cfg.idOpen + escaped + cfg.idClose
}
