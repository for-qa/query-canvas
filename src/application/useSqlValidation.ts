import { useMemo } from 'react'

// Inlined here so the application layer has no dependency on the presentation layer
interface ConditionLike { field: string; type?: string }
interface JoinLike { table: string; type: string; on: string }
interface OrderLike { field: string }

export interface SqlValidationWarning {
  id: string
  severity: 'error' | 'warning'
  message: string
}

interface ValidationState {
  sqlTable: string
  sqlColumns: string
  sqlWhere: readonly ConditionLike[]
  sqlHaving: readonly ConditionLike[]
  sqlGroupBy: string
  sqlJoins: readonly JoinLike[]
  sqlOrderBys: readonly OrderLike[]
}

export function useSqlValidation(s: ValidationState): SqlValidationWarning[] {
  return useMemo(() => {
    const warnings: SqlValidationWarning[] = []

    // HAVING without GROUP BY
    if (s.sqlHaving.length > 0 && !s.sqlGroupBy.trim()) {
      warnings.push({
        id: 'having-no-groupby',
        severity: 'warning',
        message: 'HAVING has conditions but GROUP BY is empty — this may produce unexpected results.',
      })
    }

    // WHERE conditions with empty field name
    const emptyWhereFields = s.sqlWhere.filter((c) => !c.field.trim())
    if (emptyWhereFields.length > 0) {
      warnings.push({
        id: 'where-empty-field',
        severity: 'error',
        message: `${emptyWhereFields.length} WHERE condition(s) have empty field names and will be ignored.`,
      })
    }

    // HAVING conditions with empty field name
    const emptyHavingFields = s.sqlHaving.filter((c) => !c.field.trim())
    if (emptyHavingFields.length > 0) {
      warnings.push({
        id: 'having-empty-field',
        severity: 'error',
        message: `${emptyHavingFields.length} HAVING condition(s) have empty field names and will be ignored.`,
      })
    }

    // JOINs missing ON (CROSS JOIN is exempt)
    const joinsNeedingOn = s.sqlJoins.filter(
      (j) => j.table.trim() && j.type !== 'CROSS JOIN' && !j.on.trim()
    )
    if (joinsNeedingOn.length > 0) {
      warnings.push({
        id: 'join-no-on',
        severity: 'warning',
        message: `${joinsNeedingOn.length} JOIN(s) are missing ON conditions.`,
      })
    }

    // ORDER BY with empty field names (only warn if there are multiple entries)
    const emptyOrderFields = s.sqlOrderBys.filter((o) => !o.field.trim())
    if (emptyOrderFields.length > 0 && s.sqlOrderBys.length > 1) {
      warnings.push({
        id: 'order-empty-field',
        severity: 'warning',
        message: `${emptyOrderFields.length} ORDER BY entry(s) have empty field names and will be skipped.`,
      })
    }

    // SELECT * alongside named columns
    const cols = s.sqlColumns.split(',').map((c) => c.trim()).filter(Boolean)
    if (cols.includes('*') && cols.length > 1) {
      warnings.push({
        id: 'wildcard-with-cols',
        severity: 'warning',
        message: 'Using * alongside named columns is redundant — remove either * or the specific columns.',
      })
    }

    return warnings
  }, [s.sqlHaving, s.sqlGroupBy, s.sqlWhere, s.sqlJoins, s.sqlOrderBys, s.sqlColumns])
}
