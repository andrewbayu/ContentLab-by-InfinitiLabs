# ContentLab

ContentLab is a React + TypeScript workspace for content operations, backed by Google Sheets integrations.

## Project structure

- Start with [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) for fast repository navigation.
- `src/` — application code, grouped by components, services, styles, and assets.
- `integrations/` — external integrations and deployment-side scripts.
- `docs/` — project notes and durable documentation.
- `public/` — static files served as-is by Vite.

## Development

```bash
npm install
npm run dev
```

Before running locally, copy the required environment variables from `.env.example` into a local `.env.local` file.

## Validation

```bash
npm run lint
npm run build
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
