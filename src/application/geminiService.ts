/**
 * Gemini AI service for natural language → SQL query generation.
 * Uses the Gemini 2.0 Flash model via the public REST API.
 */

export interface AiGeneratedQuery {
  table?: string
  columns?: string
  distinct?: boolean
  joins?: Array<{ type: string; table: string; on: string }>
  where?: Array<{ field: string; operator: string; value: string; connector: 'AND' | 'OR' }>
  groupBy?: string
  having?: Array<{ field: string; operator: string; value: string; connector: 'AND' | 'OR' }>
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>
  limit?: string
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are a SQL expert embedded in QueryCanvas, a visual SQL builder.
Given a natural language description, respond ONLY with a valid JSON object (no markdown, no code fences, no explanation) 
matching this structure:

{
  "table": "main_table_name",
  "columns": "col1, col2, col3",
  "distinct": false,
  "joins": [{"type": "INNER JOIN"|"LEFT JOIN"|"RIGHT JOIN"|"FULL OUTER JOIN"|"CROSS JOIN", "table": "t", "on": "a.id = t.a_id"}],
  "where": [{"field": "column", "operator": "="|"!="|">"|">="|"<"|"<="|"LIKE"|"NOT LIKE"|"IN"|"NOT IN"|"IS NULL"|"IS NOT NULL", "value": "'string_val'", "connector": "AND"|"OR"}],
  "groupBy": "col1, col2",
  "having": [{"field": "column", "operator": "=", "value": "10", "connector": "AND"}],
  "orderBy": [{"field": "column", "direction": "ASC"|"DESC"}],
  "limit": "10"
}

Rules:
- Omit fields that are not needed.
- String values in WHERE/HAVING must be wrapped in single quotes, e.g. "'active'".
- Numeric values must NOT be quoted, e.g. "30".
- NULL values should use IS NULL / IS NOT NULL operators.
- For date comparisons, use SQL-standard strings like "'2024-01-01'".
- Keep column and table names lowercase_snake_case unless the user specifies otherwise.
`

export async function generateSqlFromPrompt(
  prompt: string,
  apiKey: string
): Promise<AiGeneratedQuery> {
  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nUser request: "${prompt}"\n\nRespond with ONLY the JSON object.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(errBody?.error?.message ?? `Gemini API error: HTTP ${response.status}`)
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    return JSON.parse(rawText) as AiGeneratedQuery
  } catch {
    throw new Error('AI returned an unparsable response. Please rephrase your request and try again.')
  }
}
