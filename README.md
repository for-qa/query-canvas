# QueryCanvas

A small **React + TypeScript + Vite** web app for:

- **Dataset Formatter**: paste a column of values and format them into a single line for easy copy/paste into SQL.
- **SQL Builder**: generate a basic `SELECT` query from form inputs.

## Features

### Dataset Formatter

- **Delimiter**: comma, semicolon, tab, pipe, or space
- **Quote values**: none, single quote (`'value'`), or double quote (`"value"`)
- **Escape quotes inside values** (useful when your value contains `'` or `"`)
- **Wrap output**: none, parentheses (`(...)`), or `IN (...)`
- **Trim whitespace**
- **Remove empty lines**
- **Remove duplicates**
- **Case-insensitive dedupe** (only when “Remove duplicates” is enabled)
- **Sort ascending (A-Z)**
- **Copy output** button

### SQL Builder

- Build a basic `SELECT ... FROM ...` query
- Optional **WHERE** conditions (supports common operators like `=`, `!=`, `LIKE`, `IN`, `IS NULL`)
- Optional **GROUP BY**, **ORDER BY**, **LIMIT**
- Optional **Quote identifiers**
- Optional **Include semicolon**
- **Copy SQL** button

### Table to SQL Editor

- Create a table-like grid with:
  - Editable table name
  - Add/remove columns
  - Add/remove rows
  - Editable cell values
- Generate bulk `INSERT INTO ... VALUES (...)` SQL from the grid
- Import `.sql` files (currently supports single `INSERT INTO table (cols...) VALUES (...),(...);` format)
- Edit imported values in tabular mode and regenerate updated SQL
- Download generated SQL as a `.sql` file

## Run locally

```bash
npm install
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173/`).

## Build / preview production build

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```

## Support & Recognition

If you find this project helpful and want to support its continued development, the best way is through **recognition**:

1. **Attribution:** Please keep the original copyright notices intact in the code. If you use this tool or its code in a public project, a shoutout or a link back to this repository is highly appreciated!
2. **Contribute Code:** We welcome pull requests! Check out our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to help build this tool.
3. **Star the Repo:** Giving the project a ⭐️ on GitHub helps others find it and gives the author recognition.

## License

This project is licensed under the [MIT License](LICENSE). 

Under the MIT License, anyone who uses, copies, or modifies this code must include your original copyright notice, ensuring you always receive credit for your work.

---

_For professional inquiries, connect on [LinkedIn](https://www.linkedin.com/in/gairik-singha/)._
