# QueryCanvas

A comprehensive **visual SQL development suite** built with React + TypeScript + Vite. It is designed to act as your daily toolbox for assembling, designing, modifying, and tracking SQL code without needing to constantly look up syntax or manually escape strings.

**QueryCanvas** is strictly frontend-only—no database connection is made. All computations happen in your browser, meaning it is 100% secure for your sensitive data and schemas.

## ✨ Core Features

### 1. SQL Query Builder (SELECT)
- Visual constructor for `SELECT ... FROM ...` queries.
- Support for complex `JOIN`s, nested `WHERE` / `HAVING` filters with `AND`/`OR` grouping.
- Smart handling of `GROUP BY`, `ORDER BY`, `LIMIT`, and `OFFSET`.
- **AI Assistant**: Real natural language Prompt-to-SQL logic execution powered by **Gemini 2.0 Flash**.
- **Query History**: Automatically retains and tracks your recent query snapshots.
- **Shareable Links**: Encode your entire query payload into the URL to share your work with colleagues instantly.

### 2. DDL Builder (Visual Table Designer)
- **Visual Editor**: Create columns, define types, assign primary keys, constraints, and auto-increments.
- **Mermaid ERD Visualizer**: Live-rendering Entity-Relationship Diagram preview of your table schema.
- Automatic identifier quoting based on your selected SQL dialect.

### 3. ALTER TABLE Builder
- Design destructive schema modifications visually without risking syntax errors.
- Support for: Add/Drop/Modify Columns, Rename Columns/Tables, Add/Drop Primary/Foreign Keys, and Index Management.

### 4. Batch INSERT Builder
- Paste directly from Excel/CSV and intelligently map to SQL columns.
- **Auto-delimiter detection** (comma, tab, pipe, semicolon).
- Choose between **"Multiple"** (`INSERT ...; INSERT ...;`) or **"Bulk"** (`INSERT ... VALUES (...), (...);`) syntax optimizations.
- **Data validation warnings** for mismatching column sizes.

### 5. Table → SQL Interactive Grid
- A spreadsheet-like grid system that allows you to manually create, edit, or import rows of data.
- Generates clean bulk inserts. You can also import existing `INSERT` scripts to view and modify the data visually.

### 6. SQL Power Tools
- **Schema Diff Engine**: Input two `CREATE TABLE` definitions to instantly identify missing columns, type anomalies, and structural differences.
- **SQL Beautifier**: Fast, browser-native SQL code formatting to clean up messy queries.

### 7. Dataset Formatter
- Transform raw lists of text (like IDs or emails) into single lines wrapped properly for SQL clauses (e.g. `IN ('id1', 'id2')`).
- Intelligent options: deduplicate, sort, trim whitespace, case-insensitive deduplication, and conditional quote escaping.

### 8. Template Library
- Save queries, mutations, or complete schemas as persistent Templates to jumpstart your future sessions. 

### 9. Spreadsheet → SQL Import
- **File Upload:** Drag and drop `.csv` and `.xlsx` (Excel) files directly into the browser.
- **Multi-Sheet Support:** Seamlessly switch between different sheets/tabs within an Excel workbook without needing to re-upload.
- **Data Preview & Selection:** Preview your data in a grid and visually select/deselect specific columns to include in your queries.
- **Instant Generation:** Generate `SELECT` statements (for querying schemas) or massive `INSERT` workloads directly from spreadsheet rows.

### 10. Multi-Format Outboard Engine
- Almost every tool in QueryCanvas features a **multi-format export dropdown**.
- Instantly export your generated schemas, queries, or data as:
  - Standard **`.sql`** files
  - Raw **`.txt`** files
  - Seamlessly escaped **`.csv`** payloads
  - Auto-sized **`.xlsx`** Excel Workbooks natively rendered right in the browser.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: React.js 19 powered by Vite.
- **Language**: TypeScript (Strict typing with comprehensive discriminated unions for SQL concepts).
- **Architecture**: Domain-Driven Design (DDD). We map operations into cleanly separated Domain, Application/UseCase, and Presentation layers.
- **State Management**: Deep hook abstractions and URL-encoded serialization buffers.
- **Theming**: Premium glassmorphism UI, Dark/Light modes, with custom accessible `<dialog>` components and CSS Grid layouts.

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Vite will start the server and print a local URL (typically `http://localhost:8104/`).

### Building for Production
```bash
npm run build
npm run preview
```

### Static Analysis
```bash
npm run lint
```

---

## 🤝 AI Configuration

QueryCanvas integrates with Google's Gemini API for its Smart SQL AI features.
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Inside your running QueryCanvas app, click the **⚙️ (Settings) window**.
3. Input your API key. (Keys are securely saved to your browser's private `localStorage`).

> *If no key is configured, the app will gracefully fall back to a mock mode that only recognizes a few hardcoded topics (`users`, `orders`, `products`).*

---

## ❤️ Support & Recognition

If you find this project helpful and want to support its continued development:

1. **Attribution:** Please keep the original copyright notices intact in the code. If you use this tool or its code in a public project, a shoutout or a link back to this repository is highly appreciated!
2. **Contribute Code:** We welcome pull requests! Check out our `CONTRIBUTING.md` for guidelines on how to help build this tool.
3. **Star the Repo:** Giving the project a 🌟 on GitHub helps others find it and signals recognition to the author.

## License

This project is licensed under the [MIT License](LICENSE). 

Under the MIT License, anyone who uses, copies, or modifies this code must include your original copyright notice, ensuring you always receive credit for your work.

---

_For professional inquiries, connect on [LinkedIn](https://www.linkedin.com/in/gairik-singha/)._
