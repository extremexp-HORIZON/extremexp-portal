# Web App

Frontend for the ExtremeXP Portal built with React 19, TypeScript, and Vite.

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** for bundling
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **TanStack Query** for server state
- **Zustand** for client state
- **React Router** for navigation
- **Ky** for HTTP requests

## Development

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run openapi-ts` | Generate API client from OpenAPI spec |

## API Client Generation

The app uses [@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) to generate a typed API client from the backend's OpenAPI schema:

```bash
npm run openapi-ts
```

This requires the backend to be running at `http://localhost:8000`.

## Project Structure

```text
src/
├── api/          # API utilities
├── auth/         # Authentication logic
├── client/       # Generated OpenAPI client
├── components/   # React components
├── hooks/        # Custom hooks
├── stores/       # Zustand stores
└── assets/       # Static assets
```
