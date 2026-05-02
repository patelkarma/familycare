# FamilyCare Frontend

React 19 + Vite SPA. Talks to the Spring Boot backend at `VITE_API_BASE_URL`.

See the [project README](../README.md) for the overall architecture.

## Scripts

```bash
npm install      # install deps
npm run dev      # start Vite dev server (http://localhost:5173)
npm run build    # production build to ./dist
npm run preview  # preview the production build locally
npm run lint     # eslint
npm test         # vitest
```

## Environment

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Stack

TanStack Query · React Hook Form + Zod · Tailwind · React Router v7 · Recharts · Tesseract.js · Framer Motion · Leaflet
